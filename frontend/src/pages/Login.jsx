import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import {
  AuthLeftPanel,
  MobileBrandHeader,
  SocialAuthButtons,
  AuthDivider,
  SpinnerIcon,
  API_BASE,
} from '../components/AuthComponents.jsx';

/* Friendly error messages */
const OAUTH_ERROR_MESSAGES = {
  auth_failed: 'Authentication failed. Please try again.',
  google_auth_failed: 'Google login failed. Please try again.',
  facebook_auth_failed: 'Facebook login failed or email access was not granted.',
  email_not_verified: 'Cannot link social account because your email is not verified by the social provider.',
  google_not_configured: 'Google login is not available yet. Please use email/password.',
  facebook_not_configured: 'Facebook login is not available yet. Please use email/password.',
};

/* ── Main Login Component ──────────────────────────────────────── */
export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check URL params for registration success or errors
  useEffect(() => {
    const registered = searchParams.get('registered');
    const oauthError = searchParams.get('error');

    if (registered === 'true') {
      setSuccessBanner('Account created successfully! Please sign in.');
      searchParams.delete('registered');
      setSearchParams(searchParams, { replace: true });
    } else if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] || 'Login failed. Please try again.');
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSuccessBanner(null);
    setLoading(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSocialClick(provider) {
    window.location.href = `${API_BASE}/api/v1/auth/${provider}`;
  }

  return (
    <div className="login-page-root">
      {/* ── LEFT PANEL — Brand / Hero ────────────────────────────── */}
      <AuthLeftPanel
        headline={<>Your journey<br />starts here.</>}
        subheadline="Book flights, hotels, and buses — all in one platform designed for modern travelers."
      />

      {/* ── RIGHT PANEL — Login Form ────────────────────────────── */}
      <div className="login-right-panel">
        <div className="login-form-container">
          {/* Mobile-only brand */}
          <MobileBrandHeader />

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-500 mt-2 text-body-sm">
              Sign in to your account to continue your journey.
            </p>
          </div>

          {/* Success Banner (registration complete / email verified) */}
          {successBanner && (
            <div role="status" className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p className="text-emerald-800 text-sm font-medium">{successBanner}</p>
            </div>
          )}

          {/* Social Login Buttons */}
          <SocialAuthButtons onSocialClick={handleSocialClick} />

          {/* Divider */}
          <AuthDivider text="or continue with email" />

          {/* Login Form */}
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="login-label">Email address</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-glass"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <PasswordInput
              id="login-password"
              name="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              labelRight={
                <Link
                  to="/forgot-password"
                  className="text-route font-semibold hover:text-route-dark transition-colors"
                  tabIndex={0}
                >
                  Forgot password?
                </Link>
              }
            />

            {/* Error message */}
            {error && (
              <div id="login-error" role="alert" className="login-error-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-500">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-slate-500 mt-8 text-body-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-route font-semibold hover:text-route-dark transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
