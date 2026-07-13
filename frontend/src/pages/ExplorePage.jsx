import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client.js';
import {
  COLORS,
  TILE_URL_COMBINED,
  TILE_ATTRIBUTION,
  TILE_FILTER,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
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

/* ── Tile filter injector ────────────────────────────────────── */

function TileFilterEffect() {
  const map = useMap();
  useEffect(() => {
    const pane = map.getPane('tilePane');
    if (pane) pane.style.filter = TILE_FILTER;
  }, [map]);
  return null;
}

/* ── Fit bounds to all markers ───────────────────────────────── */

function FitAllBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 7 });
    } else if (coords.length === 1) {
      map.setView(coords[0], 8);
    }
  }, [coords, map]);
  return null;
}

/* ── Icon factories ──────────────────────────────────────────── */

function createCityIcon(type) {
  const color = type === 'hotel' ? COLORS.signal : COLORS.route;
  const emoji = type === 'hotel' ? '🏨' : type === 'flight' ? '✈' : '🚌';
  const size = 32;

  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      border-radius:50%;
      background:${color};
      color:white;
      font-size:16px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.25);
      cursor:pointer;
    ">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ── Legend ───────────────────────────────────────────────────── */

function MapLegend({ filters, onToggle }) {
  const items = [
    { key: 'flight', emoji: '✈', label: 'Flights', color: '#4ECDC4' },
    { key: 'bus', emoji: '🚌', label: 'Buses', color: COLORS.route },
    { key: 'hotel', emoji: '🏨', label: 'Hotels', color: COLORS.signal },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-10 glass rounded-2xl p-3 flex flex-col gap-1.5">
      <span className="text-micro text-ink/50 uppercase font-bold tracking-wider mb-0.5">Filter</span>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onToggle(item.key)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filters[item.key]
              ? 'bg-ink/5 text-ink'
              : 'bg-ink/2 text-ink/30 line-through'
          }`}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: filters[item.key] ? item.color : '#ccc' }}
          />
          {item.emoji} {item.label}
        </button>
      ))}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function ExplorePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ flight: true, bus: true, hotel: true });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.mapOverview();
        setListings(data.listings || []);
      } catch (err) {
        setError(err.message || 'Failed to load listings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(
    () => listings.filter((l) => filters[l.type]),
    [listings, filters]
  );

  /* Collect all coordinates for bounds fitting */
  const allCoords = useMemo(() => {
    const coords = [];
    for (const l of filtered) {
      if (l.type === 'hotel' && l.lat && l.lng) {
        coords.push([l.lat, l.lng]);
      } else {
        if (l.origin_lat && l.origin_lng) coords.push([l.origin_lat, l.origin_lng]);
        if (l.dest_lat && l.dest_lng) coords.push([l.dest_lat, l.dest_lng]);
      }
    }
    return coords;
  }, [filtered]);

  function toggleFilter(key) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-12 h-12 rounded-full border-4 border-route/20 border-t-route animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-lg mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      {/* Title overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass rounded-full px-5 py-2 flex items-center gap-3">
        <span className="font-display font-bold text-ink text-sm">Explore Routes & Stays</span>
        <span className="text-micro text-ink/40 font-semibold">
          {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Map */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full rounded-2xl overflow-hidden z-0"
        style={{ background: COLORS.ink }}
        zoomControl={false}
      >
        <TileFilterEffect />
        <TileLayer url={TILE_URL_COMBINED} attribution={TILE_ATTRIBUTION} />
        {allCoords.length > 0 && <FitAllBounds coords={allCoords} />}

        {filtered.map((listing) => {
          if (listing.type === 'hotel') {
            if (!listing.lat || !listing.lng) return null;
            return (
              <Marker
                key={listing.id}
                position={[listing.lat, listing.lng]}
                icon={createCityIcon('hotel')}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{
                      fontWeight: 700, fontSize: 14, marginBottom: 4,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      {listing.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      📍 {listing.city}
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 700,
                      color: COLORS.route, marginBottom: 8,
                    }}>
                      {formatMoney(listing.base_price_cents, listing.currency)}
                      <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}> / night</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                      {listing.available_count} room{listing.available_count !== 1 ? 's' : ''} available
                    </div>
                    <a
                      href={`/listings/${listing.id}`}
                      style={{
                        display: 'inline-block', padding: '6px 14px',
                        background: COLORS.route, color: 'white',
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      View Details →
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          }

          // Flight or bus — show route line with origin/destination markers
          const hasRoute =
            listing.origin_lat && listing.origin_lng &&
            listing.dest_lat && listing.dest_lng;
          if (!hasRoute) return null;

          const routeColor = listing.type === 'flight' ? '#4ECDC4' : COLORS.route;
          const routeCoords = [
            [listing.origin_lat, listing.origin_lng],
            [listing.dest_lat, listing.dest_lng],
          ];

          return (
            <span key={listing.id}>
              {/* Route glow */}
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: routeColor,
                  weight: 8,
                  opacity: 0.15,
                  lineCap: 'round',
                }}
              />
              {/* Route line */}
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: routeColor,
                  weight: 3,
                  opacity: 0.8,
                  lineCap: 'round',
                  dashArray: listing.type === 'flight' ? '10 6' : undefined,
                }}
              />

              {/* Origin marker */}
              <Marker
                position={[listing.origin_lat, listing.origin_lng]}
                icon={createCityIcon(listing.type)}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{
                      fontWeight: 700, fontSize: 14, marginBottom: 4,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      {listing.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      {listing.origin} → {listing.destination}
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 700,
                      color: COLORS.route, marginBottom: 8,
                    }}>
                      {formatMoney(listing.base_price_cents, listing.currency)}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                      {listing.available_count} seat{listing.available_count !== 1 ? 's' : ''} available
                    </div>
                    <a
                      href={`/listings/${listing.id}`}
                      style={{
                        display: 'inline-block', padding: '6px 14px',
                        background: COLORS.route, color: 'white',
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      View Details →
                    </a>
                  </div>
                </Popup>
              </Marker>

              {/* Destination marker */}
              <Marker
                position={[listing.dest_lat, listing.dest_lng]}
                icon={L.divIcon({
                  html: `<div style="
                    width:14px;height:14px;border-radius:50%;
                    background:${routeColor};
                    border:3px solid rgba(255,255,255,0.6);
                    box-shadow:0 1px 4px rgba(0,0,0,0.3);
                  "></div>`,
                  className: '',
                  iconSize: [14, 14],
                  iconAnchor: [7, 7],
                })}
              >
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <strong>{listing.destination}</strong>
                    <br />
                    Destination for {listing.title}
                  </div>
                </Popup>
              </Marker>
            </span>
          );
        })}
      </MapContainer>

      {/* Legend / filter */}
      <MapLegend filters={filters} onToggle={toggleFilter} />

      {/* Listing count badge */}
      <div className="absolute top-4 right-4 z-10 glass rounded-full px-3 py-1.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-route animate-pulse" />
        <span className="text-micro text-ink/60 font-semibold">
          {listings.length} total · {filtered.length} shown
        </span>
      </div>
    </div>
  );
}
