import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success'
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus('loading');

    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message || 'If an account with that email exists, a password reset link has been sent.');
      setStatus('success');
    } catch (err) {
      // Even if error occurs, show clear feedback
      setError(err.message || 'Failed to process request. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-white text-3xl font-bold">🔒</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-800">Forgot Password</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Enter your registered email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {status === 'success' ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm leading-relaxed">
              {message}
            </div>
            <p className="text-xs text-slate-400">
              Please check your inbox (and spam folder). The link will expire in 1 hour.
            </p>
            <Link to="/login" className="btn-primary inline-block w-full text-center">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                autoComplete="email"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-primary w-full"
            >
              {status === 'loading' ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <div className="text-center mt-6">
              <Link to="/login" className="text-blue-600 font-semibold hover:underline text-sm">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
