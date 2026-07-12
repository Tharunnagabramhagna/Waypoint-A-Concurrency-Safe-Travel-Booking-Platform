import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatMoney(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}

export default function Checkout() {
  const { bookingId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState('4242');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(null);

  const idempotencyKey = location.state?.idempotencyKey;

  async function pay(e) {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setStatus('paying');
    setMessage(null);
    try {
      const result = await api.capturePayment(bookingId, idempotencyKey, card);
      setStatus('success');
      setMessage(`Booking confirmed! Payment reference: ${result.payment.provider_ref}`);
      setTimeout(() => navigate('/bookings'), 2000);
    } catch (err) {
      if (err.code === 'BOOKING_EXPIRED') {
        setStatus('error');
        setMessage('Your hold expired before payment was completed. Please re-select your seats/room.');
      } else if (err.status === 402) {
        setStatus('declined');
        setMessage('Payment declined by the test card ending 0002. Try a different card number.');
      } else {
        setStatus('error');
        setMessage(err.message || 'Payment failed');
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="glass rounded-3xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-white text-3xl font-bold">💳</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-800">Checkout</h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">Booking #{bookingId.slice(0, 8).toUpperCase()}</p>
        </div>

        <form onSubmit={pay} className="space-y-6">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Test Card Number (Last 4 Digits)
            </label>
            <input
              value={card}
              onChange={(e) => setCard(e.target.value.slice(-4))}
              maxLength={4}
              className="input-glass"
              placeholder="e.g., 4242"
            />
            <p className="text-xs text-slate-400 mt-2">
              Use 0002 to test declined payment, any other 4 digits for success
            </p>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-medium ${
              status === 'success' ? 'bg-green-50 text-green-700' :
              status === 'declined' ? 'bg-yellow-50 text-yellow-700' :
              'bg-red-50 text-red-600'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'paying' || status === 'success'}
            className="btn-primary w-full"
          >
            {status === 'paying' ? 'Processing...' : status === 'success' ? 'Success!' : 'Pay & Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
