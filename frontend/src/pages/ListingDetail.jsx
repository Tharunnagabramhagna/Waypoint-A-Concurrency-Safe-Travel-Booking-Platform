import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, newIdempotencyKey } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import SeatSelector from '../components/SeatSelector.jsx';

function formatMoney(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getListing(id).then(setListing).catch((err) => setError(err.message));
  }, [id]);

  async function proceed() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.hold(selected);
      const idempotencyKey = newIdempotencyKey();
      const booking = await api.createBooking(selected, idempotencyKey);
      navigate(`/checkout/${booking.id}`, { state: { idempotencyKey } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !listing) return <p className="text-red-500 text-center text-xl py-20">{error}</p>;
  if (!listing) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
      </div>
    );
  }

  const totalPrice = selected.reduce(
    (sum, unitId) => sum + (listing.units.find(u => u.id === unitId)?.price_cents || listing.base_price_cents),
    0
  ) || selected.length * listing.base_price_cents;

  return (
    <div className="pb-20">
      <div className="glass rounded-3xl p-8 max-w-4xl mx-auto mb-8">
        <p className="text-label text-blue-600 uppercase font-semibold">{listing.type}</p>
        <h1 className="font-display text-4xl font-bold text-slate-800">{listing.title}</h1>
        <p className="text-slate-500 text-lg">{listing.provider_name}</p>

        <div className="mt-6 flex items-baseline gap-2">
          <p className="font-display text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {formatMoney(listing.base_price_cents, listing.currency)}
          </p>
          <p className="text-slate-500 text-sm">per unit</p>
        </div>
      </div>

      <div className="glass rounded-3xl p-8 max-w-4xl mx-auto">
        <h3 className="font-display text-2xl font-bold text-slate-800 mb-6">Select Your {listing.type === 'hotel' ? 'Rooms' : 'Seats'}</h3>
        <SeatSelector units={listing.units} selected={selected} onToggle={(unitId) => {
          setSelected(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);
        }} />

        {error && <p className="text-red-500 mt-6">{error}</p>}

        <div className="mt-8 flex items-center justify-between pt-6 border-t border-dashed border-slate-300">
          <div>
            <p className="text-slate-500 text-sm">Selected {selected.length} {selected.length === 1 ? 'unit' : 'units'}</p>
            <p className="font-display text-2xl font-bold text-slate-800">{formatMoney(totalPrice, listing.currency)}</p>
          </div>
          <button
            onClick={proceed}
            disabled={selected.length === 0 || submitting}
            className="btn-primary"
          >
            {submitting ? 'Holding...' : 'Continue to Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
