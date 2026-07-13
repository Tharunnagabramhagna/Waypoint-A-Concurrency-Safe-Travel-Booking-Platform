import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  COLORS,
  TILE_URL_COMBINED,
  TILE_ATTRIBUTION,
  TILE_FILTER,
  ROUTE_LINE,
} from '../lib/mapStyle.js';

/* ── Helpers ─────────────────────────────────────────────────── */

function formatMoney(cents, currency) {
  if (!cents && cents !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
  }).format(cents / 100);
}

function formatTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusLabel(s) {
  switch (s) {
    case 'in_transit': return 'In Transit';
    case 'arrived': return 'Arrived';
    case 'scheduled': return 'Scheduled';
    case 'unavailable': return 'Unavailable';
    default: return s;
  }
}

function statusClasses(s) {
  switch (s) {
    case 'in_transit': return 'bg-route/10 text-route border-route/20';
    case 'arrived': return 'bg-green-50 text-green-600 border-green-200';
    case 'scheduled': return 'bg-signal/10 text-signal border-signal/20';
    default: return 'bg-ink/5 text-ink/60 border-ink/10';
  }
}

/* ── SVG icon factories ──────────────────────────────────────── */

function createVehicleIcon(type, headingDeg = 0) {
  const size = 40;
  const svg =
    type === 'flight'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${COLORS.route}" transform="rotate(${headingDeg - 90})">
           <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
         </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${COLORS.route}" transform="rotate(${headingDeg})">
           <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
         </svg>`;

  return L.divIcon({
    html: `<div style="
      width:${size + 16}px;height:${size + 16}px;
      display:flex;align-items:center;justify-content:center;
      border-radius:50%;
      background:rgba(255,255,255,0.92);
      box-shadow:0 2px 12px rgba(18,23,42,0.18), 0 0 0 3px ${COLORS.route}40;
    ">${svg}</div>`,
    className: '',
    iconSize: [size + 16, size + 16],
    iconAnchor: [(size + 16) / 2, (size + 16) / 2],
  });
}

/* ── Map auto-fit helper ─────────────────────────────────────── */

function FitBounds({ waypoints }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints && waypoints.length >= 2) {
      const bounds = L.latLngBounds(waypoints.map((w) => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [waypoints, map]);
  return null;
}

/* ── Tile layer filter injector ──────────────────────────────── */

function TileFilterEffect() {
  const map = useMap();
  useEffect(() => {
    const pane = map.getPane('tilePane');
    if (pane) {
      pane.style.filter = TILE_FILTER;
    }
  }, [map]);
  return null;
}

/* ── Main Component ──────────────────────────────────────────── */

export default function TrackingPage() {
  const { bookingId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef(null);
  const [mobileCardOpen, setMobileCardOpen] = useState(true);

  /* Fetch tracking data */
  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchTracking() {
      try {
        const data = await api.getTracking(bookingId);
        setTracking(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load tracking data');
      }
    }

    fetchTracking();
    intervalRef.current = setInterval(() => {
      fetchTracking();
      setPollCount((c) => c + 1);
    }, 5000);

    return () => clearInterval(intervalRef.current);
  }, [bookingId, user, authLoading]);

  /* Auth gate */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-12 h-12 rounded-full border-4 border-route/20 border-t-route animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-ink/60 text-lg mb-4">Please sign in to view tracking.</p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Sign In
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <button onClick={() => navigate('/bookings')} className="btn-secondary">
          Back to Bookings
        </button>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-12 h-12 rounded-full border-4 border-route/20 border-t-route animate-spin" />
      </div>
    );
  }

  /* Derive map data */
  const waypoints = tracking.waypoints || [];
  const hasPosition = tracking.lat != null && tracking.lng != null;
  const routeCoords = waypoints.map((w) => [w.lat, w.lng]);

  /* Split route into traveled + remaining */
  let traveledCoords = [];
  let remainingCoords = [];

  if (hasPosition && waypoints.length >= 2) {
    const vehiclePos = [tracking.lat, tracking.lng];
    // Find which segment the vehicle is on
    let insertIdx = 0;
    const totalDist = waypoints[waypoints.length - 1].distance_from_start_km;
    const traveled = totalDist - (tracking.distance_remaining_km || 0);

    for (let i = 0; i < waypoints.length - 1; i++) {
      if (
        traveled >= waypoints[i].distance_from_start_km &&
        traveled <= waypoints[i + 1].distance_from_start_km
      ) {
        insertIdx = i + 1;
        break;
      }
    }

    traveledCoords = [...routeCoords.slice(0, insertIdx), vehiclePos];
    remainingCoords = [vehiclePos, ...routeCoords.slice(insertIdx)];
  }

  const vehicleIcon = hasPosition
    ? createVehicleIcon(tracking.listing_type, tracking.heading_degrees || 0)
    : null;

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      {/* ── Map ────────────────────────────────────────────── */}
      <MapContainer
        center={hasPosition ? [tracking.lat, tracking.lng] : [19.076, 72.877]}
        zoom={hasPosition ? 10 : 6}
        className="w-full h-full rounded-2xl overflow-hidden z-0"
        style={{ background: COLORS.ink }}
        zoomControl={false}
      >
        <TileFilterEffect />
        <TileLayer url={TILE_URL_COMBINED} attribution={TILE_ATTRIBUTION} />

        {waypoints.length >= 2 && <FitBounds waypoints={waypoints} />}

        {/* Full route preview (when scheduled, no vehicle position yet) */}
        {!hasPosition && routeCoords.length >= 2 && (
          <>
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: COLORS.route,
                weight: ROUTE_LINE.glowWidth,
                opacity: 0.15,
                lineCap: 'round',
              }}
            />
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: COLORS.route,
                weight: ROUTE_LINE.width,
                opacity: 0.7,
                lineCap: 'round',
                dashArray: '12 8',
              }}
            />
          </>
        )}

        {/* Remaining route (bright teal) */}
        {remainingCoords.length >= 2 && (
          <>
            {/* Glow layer */}
            <Polyline
              positions={remainingCoords}
              pathOptions={{
                color: COLORS.route,
                weight: ROUTE_LINE.glowWidth,
                opacity: 0.25,
                lineCap: 'round',
              }}
            />
            <Polyline
              positions={remainingCoords}
              pathOptions={{
                color: COLORS.route,
                weight: ROUTE_LINE.width,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />
          </>
        )}

        {/* Traveled route (muted) */}
        {traveledCoords.length >= 2 && (
          <Polyline
            positions={traveledCoords}
            pathOptions={{
              color: ROUTE_LINE.traveled,
              weight: ROUTE_LINE.width - 1,
              opacity: 0.5,
              dashArray: '8 6',
              lineCap: 'round',
            }}
          />
        )}

        {/* Origin marker */}
        {waypoints.length > 0 && (
          <Marker
            position={[waypoints[0].lat, waypoints[0].lng]}
            icon={L.divIcon({
              html: `<div style="width:14px;height:14px;border-radius:50%;background:${COLORS.paper};border:3px solid ${COLORS.route};box-shadow:0 1px 6px rgba(0,0,0,0.3);"></div>`,
              className: '',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          >
            <Popup>{waypoints[0].stop_name || tracking.origin || 'Origin'}</Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {waypoints.length > 1 && (
          <Marker
            position={[waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng]}
            icon={L.divIcon({
              html: `<div style="width:14px;height:14px;border-radius:50%;background:${COLORS.signal};border:3px solid ${COLORS.paper};box-shadow:0 1px 6px rgba(0,0,0,0.3);"></div>`,
              className: '',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          >
            <Popup>{waypoints[waypoints.length - 1].stop_name || tracking.destination || 'Destination'}</Popup>
          </Marker>
        )}

        {/* Vehicle marker */}
        {hasPosition && vehicleIcon && (
          <Marker position={[tracking.lat, tracking.lng]} icon={vehicleIcon}>
            <Popup>
              <strong>{tracking.listing_title}</strong>
              <br />
              Speed: {tracking.speed_kmh} km/h — Heading: {tracking.heading_degrees}°
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* ── Floating Info Card — Desktop: right panel, Mobile: bottom sheet ── */}
      <div
        className={`
          absolute z-10
          /* Desktop: right-side panel */
          md:top-6 md:right-6 md:w-[380px] md:max-h-[calc(100%-48px)] md:rounded-2xl
          /* Mobile: bottom sheet */
          bottom-0 left-0 right-0 md:bottom-auto md:left-auto
          rounded-t-2xl md:rounded-2xl
          overflow-hidden
          transition-transform duration-300 ease-out
          ${!mobileCardOpen ? 'translate-y-[calc(100%-56px)] md:translate-y-0' : ''}
        `}
      >
        {/* Mobile drag handle */}
        <button
          onClick={() => setMobileCardOpen(!mobileCardOpen)}
          className="md:hidden w-full flex justify-center py-2 bg-white/90 backdrop-blur-md"
          aria-label="Toggle info card"
        >
          <div className="w-10 h-1 rounded-full bg-ink/20" />
        </button>

        <div className="ticket-stub !rounded-t-none md:!rounded-2xl !p-0 overflow-y-auto max-h-[70vh] md:max-h-[calc(100vh-180px)]">
          {/* Header */}
          <div className="bg-gradient-to-r from-ink to-ink/90 px-6 py-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-micro font-bold uppercase tracking-widest text-white/60">
                {tracking.listing_type === 'flight' ? '✈ Flight' : '🚌 Bus'} Tracking
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusClasses(tracking.status)}`}
              >
                {statusLabel(tracking.status)}
              </span>
            </div>
            <h2 className="font-display text-lg font-bold leading-tight">
              {tracking.listing_title || 'Trip'}
            </h2>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* PNR */}
            <div>
              <span className="text-micro text-ink/50 uppercase font-semibold tracking-wider">PNR / Booking ID</span>
              <p className="font-mono text-sm text-ink font-semibold tracking-wider mt-0.5">
                {(tracking.booking_id || bookingId).slice(0, 8).toUpperCase()}
              </p>
            </div>

            {/* Route */}
            {(tracking.origin || tracking.destination) && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <span className="text-micro text-ink/50 uppercase font-semibold">From</span>
                  <p className="font-display font-bold text-ink text-sm">{tracking.origin || '—'}</p>
                </div>
                <div className="text-ink/20 text-lg select-none">→</div>
                <div className="flex-1 text-right">
                  <span className="text-micro text-ink/50 uppercase font-semibold">To</span>
                  <p className="font-display font-bold text-ink text-sm">{tracking.destination || '—'}</p>
                </div>
              </div>
            )}

            {/* Departure / Arrival times */}
            <div className="flex gap-4">
              <div className="flex-1">
                <span className="text-micro text-ink/50 uppercase font-semibold">Departure</span>
                <p className="text-xs text-ink font-semibold mt-0.5">
                  {formatTime(tracking.departure_time)}
                </p>
              </div>
              <div className="flex-1 text-right">
                <span className="text-micro text-ink/50 uppercase font-semibold">ETA</span>
                <p className="text-xs text-ink font-semibold mt-0.5">
                  {tracking.eta ? formatTime(tracking.eta) : '—'}
                </p>
              </div>
            </div>

            <div className="ticket-perforation my-4" />

            {/* Price */}
            {tracking.total_amount_cents != null && (
              <div className="flex items-center justify-between">
                <span className="text-micro text-ink/50 uppercase font-semibold">Total Paid</span>
                <span className="font-display font-bold text-lg bg-gradient-to-r from-route to-emerald-500 bg-clip-text text-transparent">
                  {formatMoney(tracking.total_amount_cents, tracking.currency)}
                </span>
              </div>
            )}

            {/* Scheduled countdown */}
            {tracking.status === 'scheduled' && tracking.departure_time && (
              <div className="glass rounded-xl px-4 py-3 text-center">
                <span className="text-micro text-signal uppercase font-bold tracking-wider">Departing Soon</span>
                <p className="font-display font-bold text-ink text-sm mt-1">
                  {(() => {
                    const diff = new Date(tracking.departure_time) - new Date();
                    if (diff <= 0) return 'Departed';
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    return `${h}h ${m}m until departure`;
                  })()}
                </p>
              </div>
            )}

            {/* Live stats */}
            {tracking.status === 'in_transit' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <span className="text-micro text-ink/40 uppercase font-semibold">Speed</span>
                  <p className="font-display font-bold text-ink text-sm">{tracking.speed_kmh || 0} <span className="text-micro text-ink/50">km/h</span></p>
                </div>
                <div className="text-center">
                  <span className="text-micro text-ink/40 uppercase font-semibold">Remaining</span>
                  <p className="font-display font-bold text-ink text-sm">{tracking.distance_remaining_km || 0} <span className="text-micro text-ink/50">km</span></p>
                </div>
                <div className="text-center">
                  <span className="text-micro text-ink/40 uppercase font-semibold">Delay</span>
                  <p className={`font-display font-bold text-sm ${tracking.delay_minutes > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {tracking.delay_minutes > 0 ? `+${tracking.delay_minutes}` : '0'} <span className="text-micro text-ink/50">min</span>
                  </p>
                </div>
              </div>
            )}

            {tracking.next_stop && tracking.status === 'in_transit' && (
              <div className="glass rounded-xl px-4 py-3">
                <span className="text-micro text-ink/40 uppercase font-semibold">Next Stop</span>
                <p className="font-display font-bold text-route text-sm mt-0.5">{tracking.next_stop}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate('/bookings')}
                className="btn-secondary flex-1 !py-2.5 !text-xs"
              >
                ← Bookings
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.cancelBooking(bookingId);
                    navigate('/bookings');
                  } catch (err) {
                    alert(err.message || 'Failed to cancel');
                  }
                }}
                className="flex-1 text-xs font-semibold py-2.5 px-4 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 transition-all"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Polling indicator */}
      <div className="absolute top-4 left-4 z-10 glass rounded-full px-3 py-1.5 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${tracking.status === 'in_transit' ? 'bg-green-400 animate-pulse' : 'bg-ink/20'}`} />
        <span className="text-micro text-ink/60 font-semibold">
          {tracking.status === 'in_transit' ? 'Live' : statusLabel(tracking.status)}
        </span>
      </div>
    </div>
  );
}
