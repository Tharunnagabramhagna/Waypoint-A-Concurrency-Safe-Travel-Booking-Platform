import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

function formatMoney(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}

function statusColor(status) {
  switch (status) {
    case 'confirmed': return 'text-green-600 bg-green-50 border-green-200';
    case 'pending_payment': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'cancelled': return 'text-slate-500 bg-slate-50 border-slate-200';
    case 'expired': return 'text-slate-500 bg-slate-50 border-slate-200';
    default: return 'text-slate-500 bg-slate-50 border-slate-200';
  }
}

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.myBookings().then(setBookings).catch((err) => setError(err.message));
  }, [user]);

  async function cancel(id) {
    try {
      setCancelling(id);
      await api.cancelBooking(id);
      setBookings(prev => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)));
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-xl">Please sign in to see your bookings.</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-slate-800">My Bookings</h1>
        <p className="text-slate-500 mt-2">Manage your trips</p>
      </div>

      {error && <p className="text-red-500 text-center mb-6 text-lg">{error}</p>}
      {!bookings && !error && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 text-lg">Loading...</p>
        </div>
      )}
      {bookings?.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✈️</div>
          <p className="text-slate-500 text-lg">No bookings yet — go find a trip!</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
        {bookings?.map((b) => (
          <div key={b.id} className="glass rounded-3xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-mono text-xs text-blue-600 tracking-widest uppercase font-semibold mb-2">
                  Booking #{b.id.slice(0, 8).toUpperCase()}
                </p>
                <h3 className="font-display text-xl font-bold text-slate-800">
                  {b.items?.map(i => i.listingTitle).join(' + ')}
                </h3>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColor(b.status)}`}>
                    {b.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right ml-6">
                <p className="font-display text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatMoney(b.total_amount_cents, b.currency)}
                </p>
                {b.status === 'confirmed' && (
                  <div className="flex flex-col gap-2 mt-3">
                    <Link
                      to={`/tracking/${b.id}`}
                      className="text-sm text-route hover:text-route-dark font-semibold transition-colors"
                    >
                      📍 Track Trip
                    </Link>
                    <button
                      onClick={() => cancel(b.id)}
                      disabled={cancelling === b.id}
                      className="text-sm text-red-500 hover:text-red-600 font-semibold disabled:opacity-50"
                    >
                      {cancelling === b.id ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
