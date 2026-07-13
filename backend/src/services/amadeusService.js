import logger from '../lib/logger.js';
import { wrap } from '../lib/cache.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const AMADEUS_BASE_URL = 'https://test.api.amadeus.com';
const CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

/** Whether Amadeus integration is configured at all. */
export const isConfigured = () => !!(CLIENT_ID && CLIENT_SECRET);

// ---------------------------------------------------------------------------
// Circuit Breaker (Gap #5)
// Tracks consecutive failures and 429s. After FAILURE_THRESHOLD failures in
// a WINDOW_MS window, the circuit opens for COOLDOWN_MS and all calls
// short-circuit to an empty result without hitting the API.
// ---------------------------------------------------------------------------
const FAILURE_THRESHOLD = 3;
const WINDOW_MS = 60_000;        // 1-minute window for counting failures
const COOLDOWN_MS = 10 * 60_000; // 10-minute cooldown once circuit opens

const circuitState = {
  failures: [],      // timestamps of recent failures
  openUntil: 0,      // epoch ms — circuit stays open (rejecting) until this time
};

function recordFailure() {
  const now = Date.now();
  circuitState.failures.push(now);
  // Trim old entries outside the window
  circuitState.failures = circuitState.failures.filter((t) => now - t < WINDOW_MS);
  if (circuitState.failures.length >= FAILURE_THRESHOLD) {
    circuitState.openUntil = now + COOLDOWN_MS;
    circuitState.failures = [];
    logger.warn(`[Amadeus] Circuit breaker OPEN — cooling down for ${COOLDOWN_MS / 60_000} min`);
  }
}

function isCircuitOpen() {
  if (Date.now() < circuitState.openUntil) return true;
  // Reset once cooldown elapses
  if (circuitState.openUntil > 0 && Date.now() >= circuitState.openUntil) {
    circuitState.openUntil = 0;
    logger.info('[Amadeus] Circuit breaker CLOSED — resuming calls');
  }
  return false;
}

// ---------------------------------------------------------------------------
// OAuth2 Token Management
// ---------------------------------------------------------------------------
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  // Return cached token if still valid (with 30-second safety margin)
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const res = await fetchWithTimeout(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Amadeus OAuth2 token request failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/** fetch() with a 5-second timeout via AbortController. */
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Authenticated GET against the Amadeus API. */
async function amadeusGet(path, params = {}) {
  const token = await getAccessToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${AMADEUS_BASE_URL}${path}${qs ? `?${qs}` : ''}`;

  const res = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    recordFailure();
    throw new Error('Amadeus rate limit exceeded (429)');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    recordFailure();
    throw new Error(`Amadeus API error: ${res.status} ${body}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// IATA code validation (Gap #2)
// A valid IATA airport/city code is exactly 3 uppercase letters.
// ---------------------------------------------------------------------------
const IATA_RE = /^[A-Z]{3}$/;

function isValidIataCode(code) {
  return typeof code === 'string' && IATA_RE.test(code.toUpperCase());
}

// ---------------------------------------------------------------------------
// Flight search
// ---------------------------------------------------------------------------

/**
 * Search Amadeus Flight Offers.
 *
 * @param {Object} params
 * @param {string} params.origin      - IATA origin code (e.g. "BLR")
 * @param {string} params.destination - IATA destination code (e.g. "DEL")
 * @param {string} params.date        - YYYY-MM-DD departure date (REQUIRED by Amadeus)
 * @param {string} [params.currency]  - ISO 4217 currency code to request prices in
 * @param {number} [params.minPrice]  - Minimum price in cents (our schema) for post-filtering
 * @param {number} [params.maxPrice]  - Maximum price in cents (our schema) for post-filtering
 * @returns {Promise<Array>} Normalized listing objects with source: 'amadeus'
 */
export async function searchFlights({ origin, destination, date, currency, minPrice, maxPrice }) {
  if (!isConfigured()) return [];
  if (isCircuitOpen()) return [];

  // Gap #2: skip if origin/destination aren't valid IATA codes
  if (!isValidIataCode(origin) || !isValidIataCode(destination)) {
    logger.debug('[Amadeus] Skipping flight search — origin/destination are not valid IATA codes', { origin, destination });
    return [];
  }

  // Gap #3: Amadeus requires departureDate — skip if not provided
  if (!date) {
    logger.debug('[Amadeus] Skipping flight search — no date provided');
    return [];
  }

  const cacheKey = `amadeus:flights:${origin}:${destination}:${date}:${currency || 'default'}`;

  try {
    return await wrap(cacheKey, async () => {
      const params = {
        originLocationCode: origin.toUpperCase(),
        destinationLocationCode: destination.toUpperCase(),
        departureDate: date,
        adults: '1',
        max: '10',  // limit results to conserve quota
      };
      // Gap #4: pass currency explicitly so prices come back in our expected currency
      if (currency) {
        params.currencyCode = currency.toUpperCase();
      }

      const data = await amadeusGet('/v2/shopping/flight-offers', params);

      if (!data.data || !Array.isArray(data.data)) return [];

      return normalizeFlightOffers(data.data, minPrice, maxPrice);
    }, 300); // 5-minute cache TTL
  } catch (err) {
    logger.warn({ err: err.message }, '[Amadeus] Flight search failed — falling back to DB-only');
    recordFailure();
    return [];
  }
}

/** Normalize Amadeus flight offers into our listing schema shape. */
function normalizeFlightOffers(offers, minPrice, maxPrice) {
  const results = [];

  for (const offer of offers) {
    try {
      const firstSegment = offer.itineraries?.[0]?.segments?.[0];
      const lastItinerary = offer.itineraries?.[0];
      const lastSegment = lastItinerary?.segments?.[lastItinerary.segments.length - 1];

      if (!firstSegment) continue;

      const carrier = firstSegment.carrierCode || 'Unknown';
      const flightNumber = firstSegment.number || '';
      const originCode = firstSegment.departure?.iataCode || '';
      const destCode = lastSegment?.arrival?.iataCode || '';
      const departureTime = firstSegment.departure?.at;
      const arrivalTime = lastSegment?.arrival?.at;
      const stops = (lastItinerary?.segments?.length || 1) - 1;
      const duration = lastItinerary?.duration || '';

      const priceAmount = parseFloat(offer.price?.total || '0');
      const priceCurrency = offer.price?.currency || 'USD';
      const priceCents = Math.round(priceAmount * 100);

      const availableSeats = offer.numberOfBookableSeats || 0;

      // Post-filter by price range (our filters are in cents)
      if (minPrice && priceCents < parseInt(minPrice, 10)) continue;
      if (maxPrice && priceCents > parseInt(maxPrice, 10)) continue;

      results.push({
        id: `amadeus-flight-${offer.id}`,
        type: 'flight',
        title: `${carrier} ${flightNumber} · ${originCode} to ${destCode}`,
        origin: originCode,
        destination: destCode,
        city: null,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        timezone_origin: null,
        timezone_destination: null,
        base_price_cents: priceCents,
        currency: priceCurrency,
        metadata: {
          stops,
          duration,
          aircraft: firstSegment.aircraft?.code || null,
          carrier,
          flightNumber,
        },
        provider_name: `${carrier} (via Amadeus)`,
        available_count: availableSeats,
        source: 'amadeus',
      });
    } catch (err) {
      // Skip malformed offers silently
      logger.debug({ err: err.message }, '[Amadeus] Skipped malformed flight offer');
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Hotel search
// ---------------------------------------------------------------------------

/**
 * Search Amadeus Hotel Offers by city.
 *
 * @param {Object} params
 * @param {string} params.city     - City name or IATA city code
 * @param {string} params.date     - YYYY-MM-DD check-in date
 * @param {string} [params.currency] - ISO 4217 currency code
 * @param {number} [params.minPrice] - Minimum price in cents for post-filtering
 * @param {number} [params.maxPrice] - Maximum price in cents for post-filtering
 * @returns {Promise<Array>} Normalized listing objects with source: 'amadeus'
 */
export async function searchHotels({ city, date, currency, minPrice, maxPrice }) {
  if (!isConfigured()) return [];
  if (isCircuitOpen()) return [];

  if (!city) return [];

  // Gap #3: For hotels, checkInDate is required by Amadeus.
  // If no date, skip the Amadeus hotel call.
  if (!date) {
    logger.debug('[Amadeus] Skipping hotel search — no date provided');
    return [];
  }

  const cacheKey = `amadeus:hotels:${city}:${date}:${currency || 'default'}`;

  try {
    return await wrap(cacheKey, async () => {
      // Step 1: Find hotels by city code (IATA city code).
      // If city is a 3-letter code, use it directly. Otherwise, try as keyword.
      let hotelIds = [];

      const cityCode = isValidIataCode(city) ? city.toUpperCase() : null;

      if (cityCode) {
        const hotelListData = await amadeusGet('/v1/reference-data/locations/hotels/by-city', {
          cityCode,
          radius: '30',
          radiusUnit: 'KM',
        });
        hotelIds = (hotelListData.data || []).slice(0, 5).map((h) => h.hotelId);
      }

      if (hotelIds.length === 0) {
        // Try keyword search as fallback
        try {
          const keywordData = await amadeusGet('/v1/reference-data/locations/hotels/by-city', {
            cityCode: city.toUpperCase().substring(0, 3),
            radius: '30',
            radiusUnit: 'KM',
          });
          hotelIds = (keywordData.data || []).slice(0, 5).map((h) => h.hotelId);
        } catch {
          // Hotel list endpoint may not support all city names
          return [];
        }
      }

      if (hotelIds.length === 0) return [];

      // Step 2: Get offers for those hotels
      const offerParams = {
        hotelIds: hotelIds.join(','),
        checkInDate: date,
        adults: '1',
        roomQuantity: '1',
      };
      if (currency) {
        offerParams.currency = currency.toUpperCase();
      }

      const offersData = await amadeusGet('/v3/shopping/hotel-offers', offerParams);

      if (!offersData.data || !Array.isArray(offersData.data)) return [];

      return normalizeHotelOffers(offersData.data, city, minPrice, maxPrice);
    }, 300); // 5-minute cache TTL
  } catch (err) {
    logger.warn({ err: err.message }, '[Amadeus] Hotel search failed — falling back to DB-only');
    recordFailure();
    return [];
  }
}

/** Normalize Amadeus hotel offers into our listing schema shape. */
function normalizeHotelOffers(hotelOffers, searchCity, minPrice, maxPrice) {
  const results = [];

  for (const hotel of hotelOffers) {
    try {
      const hotelName = hotel.hotel?.name || 'Unknown Hotel';
      const cityCode = hotel.hotel?.cityCode || searchCity;

      for (const offer of (hotel.offers || [])) {
        const priceAmount = parseFloat(offer.price?.total || '0');
        const priceCurrency = offer.price?.currency || 'USD';
        const priceCents = Math.round(priceAmount * 100);

        // Post-filter by price range
        if (minPrice && priceCents < parseInt(minPrice, 10)) continue;
        if (maxPrice && priceCents > parseInt(maxPrice, 10)) continue;

        const roomType = offer.room?.typeEstimated?.category || 'Standard';
        const bedType = offer.room?.typeEstimated?.bedType || '';

        results.push({
          id: `amadeus-hotel-${hotel.hotel?.hotelId || 'unknown'}-${offer.id}`,
          type: 'hotel',
          title: `${hotelName} · ${cityCode}`,
          origin: null,
          destination: null,
          city: cityCode,
          departure_time: null,
          arrival_time: null,
          timezone_origin: null,
          timezone_destination: null,
          base_price_cents: priceCents,
          currency: priceCurrency,
          metadata: {
            roomType,
            bedType,
            checkIn: offer.checkInDate,
            checkOut: offer.checkOutDate,
          },
          provider_name: `${hotelName} (via Amadeus)`,
          available_count: 1, // Amadeus returns available offers, so at least 1
          source: 'amadeus',
        });
      }
    } catch (err) {
      logger.debug({ err: err.message }, '[Amadeus] Skipped malformed hotel offer');
    }
  }

  return results;
}
