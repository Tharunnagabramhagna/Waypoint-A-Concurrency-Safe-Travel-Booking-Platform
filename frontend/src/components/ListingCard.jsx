import { Link } from 'react-router-dom';

function formatMoney(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}

function formatTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ListingCard({ listing }) {
  const soldOut = listing.available_count === '0' || listing.available_count === 0;
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="glass rounded-3xl flex items-center justify-between p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex-1">
        <p className="text-label text-blue-600 uppercase font-semibold">{listing.type}</p>
        <h3 className="font-display text-xl font-bold mt-1 text-slate-800">{listing.title}</h3>
        <p className="text-sm text-slate-500 mt-1">{listing.provider_name}</p>
        {listing.departure_time && (
          <p className="text-sm text-slate-500 mt-1">
            {formatTime(listing.departure_time)} → {formatTime(listing.arrival_time)}
          </p>
        )}
        {listing.city && <p className="text-sm text-slate-500 mt-1">{listing.city}</p>}
      </div>
      <div className="text-left pl-6 border-l-2 border-dashed border-slate-300">
        <p className="font-display text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {formatMoney(listing.base_price_cents, listing.currency)}
        </p>
        <p className={`text-meta mt-1 font-semibold ${soldOut ? 'text-red-500' : 'text-blue-600'}`}>
          {soldOut ? 'SOLD OUT' : `${listing.available_count} left`}
        </p>
      </div>
    </Link>
  );
}
