import React from 'react';

/* API base URL for OAuth redirects */
const DEFAULT_API_BASE_URL = 'https://waypoint-backend-ahsd.onrender.com';
export const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : DEFAULT_API_BASE_URL);

/* ── Inline SVG Icons ──────────────────────────────────────────── */
export function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.93-1.956 1.886v2.283h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" fill="#1877F2"/>
    </svg>
  );
}

export function SpinnerIcon() {
  return (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  );
}

/* ── Floating Glass Feature Cards ──────────────────────────────── */
export function FeatureCard({ icon, title, subtitle, className = '' }) {
  return (
    <div className={`backdrop-blur-xl bg-white/15 border border-white/20 rounded-2xl px-5 py-4 shadow-lg ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{title}</p>
          <p className="text-white/60 text-xs mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable Left Panel for Auth Pages ────────────────────────── */
export function AuthLeftPanel({
  headline = <>Your journey<br />starts here.</>,
  subheadline = "Book flights, hotels, and buses — all in one platform designed for modern travelers."
}) {
  return (
    <div className="login-left-panel" aria-hidden="true">
      {/* Gradient background layers */}
      <div className="login-bg-layer login-bg-gradient" />
      <div className="login-bg-layer login-bg-pattern" />
      <div className="login-bg-layer login-bg-glow" />

      {/* Content overlay */}
      <div className="login-left-content">
        {/* Brand mark — matches Navbar exactly */}
        <div className="flex items-center gap-3.5 mb-auto">
          <img
            src="/images/waypoint-logo.png"
            alt="Waypoint Logo"
            className="h-10 w-auto object-contain drop-shadow-md"
          />
          <div className="flex flex-col">
            <span className="text-white font-display text-xl font-bold tracking-tight">Waypoint</span>
            <span className="text-[10px] text-white/60 tracking-wider font-semibold uppercase">Route System</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="mt-auto mb-10">
          <h2 className="text-white font-display text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-4">
            {headline}
          </h2>
          <p className="text-white/55 text-base leading-relaxed max-w-sm">
            {subheadline}
          </p>
        </div>

        {/* Floating feature cards */}
        <div className="flex flex-col gap-3">
          <FeatureCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>}
            title="500+ Destinations"
            subtitle="Worldwide coverage"
            className="login-feature-card-1"
          />
          <FeatureCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            title="Premium Stays"
            subtitle="Best-in-class hotels"
            className="login-feature-card-2"
          />
          <FeatureCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            title="Secure Payments"
            subtitle="End-to-end encryption"
            className="login-feature-card-3"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Social Login Buttons ──────────────────────────────────────── */
export function SocialAuthButtons({ onSocialClick }) {
  const handleSocial = (provider) => {
    if (onSocialClick) {
      onSocialClick(provider);
    } else {
      window.location.href = `${API_BASE}/api/v1/auth/${provider}`;
    }
  };

  return (
    <div className="flex flex-col gap-3 mb-6">
      <button
        type="button"
        onClick={() => handleSocial('google')}
        className="login-social-btn"
        aria-label="Continue with Google"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>
      <button
        type="button"
        onClick={() => handleSocial('facebook')}
        className="login-social-btn"
        aria-label="Continue with Facebook"
      >
        <FacebookIcon />
        <span>Continue with Facebook</span>
      </button>
    </div>
  );
}

/* ── Divider ───────────────────────────────────────────────────── */
export function AuthDivider({ text = "or continue with email" }) {
  return (
    <div className="login-divider" role="separator">
      <div className="login-divider-line" />
      <span className="login-divider-text">{text}</span>
      <div className="login-divider-line" />
    </div>
  );
}

/* ── Mobile Brand Header ───────────────────────────────────────── */
export function MobileBrandHeader() {
  return (
    <div className="login-mobile-brand">
      <img
        src="/images/waypoint-logo.png"
        alt="Waypoint Logo"
        className="h-10 w-auto object-contain"
      />
      <div className="flex flex-col">
        <span className="text-ink font-display text-xl font-bold tracking-tight">Waypoint</span>
        <span className="text-[10px] text-route tracking-wider font-semibold uppercase">Route System</span>
      </div>
    </div>
  );
}
