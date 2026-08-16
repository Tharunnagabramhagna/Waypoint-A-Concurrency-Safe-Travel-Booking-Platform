import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setError('No password reset token provided.');
      return;
    }

    async function verify() {
      try {
        const res = await api.verifyResetToken(token);
        setTokenValid(true);
        if (res.email) setUserEmail(res.email);
      } catch (err) {
        setTokenValid(false);
        setError(err.message || 'This password reset link is invalid or has expired.');
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('submitting');

    try {
      await api.resetPassword(token, form.newPassword);
      setStatus('success');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Token may be expired.');
      setStatus('idle');
    }
  }

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-white text-3xl font-bold">🔑</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-800">Set New Password</h1>
          {userEmail && <p className="text-slate-500 mt-2 text-sm">For account {userEmail}</p>}
        </div>

        {!tokenValid ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm leading-relaxed">
              {error || 'This password reset token is invalid or has expired.'}
            </div>
            <Link to="/forgot-password" className="btn-primary inline-block w-full text-center">
              Request a New Reset Link
            </Link>
          </div>
        ) : status === 'success' ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm leading-relaxed">
              Password reset successful! Redirecting you to sign in...
            </div>
            <Link to="/login" className="btn-primary inline-block w-full text-center">
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              id="new-password"
              name="newPassword"
              label="New Password"
              placeholder="Min. 8 characters"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              autoComplete="new-password"
            />

            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              label="Confirm New Password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              autoComplete="new-password"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="btn-primary w-full"
            >
              {status === 'submitting' ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
