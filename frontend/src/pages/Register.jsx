import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

import PasswordInput from '../components/PasswordInput.jsx';
import InternationalPhoneInput from '../components/PhoneInput.jsx';
import { getMissingPasswordRequirementsMessage } from '../utils/passwordPolicy.js';
import {
  AuthLeftPanel,
  MobileBrandHeader,
  SocialAuthButtons,
  AuthDivider,
  SpinnerIcon,
  API_BASE,
} from '../components/AuthComponents.jsx';

// ── OTP Input Component ────────────────────────────────────────────────────────

function OtpInput({ length = 6, value, onChange, disabled }) {
  const inputRefs = useRef([]);

  const focusInput = useCallback((index) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index].focus();
      inputRefs.current[index].select();
    }
  }, []);

  // Auto-focus first input on mount
  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  function handleChange(e, index) {
    const char = e.target.value.slice(-1);
    if (char && !/^\d$/.test(char)) return; // Only digits

    const newValue = value.split('');
    newValue[index] = char;
    const joined = newValue.join('');
    onChange(joined);

    // Auto-advance to next input
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(e, index) {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Move to previous input on backspace when current is empty
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        focusInput(index - 1);
        e.preventDefault();
      } else {
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted.padEnd(length, ' ').slice(0, length).replace(/ /g, ''));
    const nextIndex = Math.min(pasted.length, length - 1);
    focusInput(nextIndex);
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 border-slate-200 bg-white/80 text-ink focus:border-route focus:ring-2 focus:ring-route/20 outline-none transition-all duration-200 disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ── Register Page ──────────────────────────────────────────────────────────────

// States: 'form' -> 'otp' -> 'creating'
export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'creating'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password validation error state (shown only after submit attempt)
  const [passwordError, setPasswordError] = useState(null);
  const [showPasswordError, setShowPasswordError] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── Step 1: Send verification code ─────────────────────────────
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Validate full name
      if (!form.fullName.trim()) {
        throw new Error('Full name is required.');
      }

      // 2. Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
        throw new Error('Please enter a valid email address.');
      }

      // 3. Validate phone if supplied
      if (form.phone && form.phone.trim().length > 32) {
        throw new Error('Phone number is too long.');
      }

      // 4. Validate password against policy (show only what is missing)
      const pwdMsg = getMissingPasswordRequirementsMessage(form.password);
      if (pwdMsg) {
        setPasswordError(pwdMsg);
        setShowPasswordError(true);
        const pwdInput = document.getElementById('register-password');
        if (pwdInput) pwdInput.focus();
        return;
      }
      setPasswordError(null);
      setShowPasswordError(false);

      // 5. Only after all validation passes: dispatch OTP
      await api.sendEmailOtp(form.email.trim().toLowerCase());
      setStep('otp');
      setOtpValue('');
      setOtpError(null);
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ─────────────────────────────────────────
  async function handleVerifyOtp() {
    if (otpValue.replace(/\s/g, '').length !== 6) return;
    setOtpError(null);
    setOtpLoading(true);
    try {
      await api.verifyEmailOtp(form.email.trim().toLowerCase(), otpValue.trim());
      setOtpSuccess(true);

      // Brief success animation delay, then create account
      setTimeout(() => {
        handleCreateAccount();
      }, 800);
    } catch (err) {
      setOtpError(err.message || 'Invalid verification code.');
      setOtpSuccess(false);
    } finally {
      setOtpLoading(false);
    }
  }

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const digits = otpValue.replace(/\s/g, '');
    if (digits.length === 6 && step === 'otp' && !otpLoading && !otpSuccess) {
      handleVerifyOtp();
    }
  }, [otpValue]);

  // ── Step 3: Create account ─────────────────────────────────────
  async function handleCreateAccount() {
    setStep('creating');
    setError(null);
    try {
      await register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone || undefined,
      });
      // Account created — redirect to login
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.message || 'Account creation failed.');
      setStep('otp');
      setOtpSuccess(false);
    }
  }

  // ── Resend OTP ─────────────────────────────────────────────────
  async function handleResendOtp() {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setOtpError(null);
    try {
      await api.sendEmailOtp(form.email.trim().toLowerCase());
      setOtpValue('');
      setOtpSuccess(false);
      setResendCooldown(60);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
    }
  }

  function handleSocialClick(provider) {
    window.location.href = `${API_BASE}/api/v1/auth/${provider}`;
  }

  // Format cooldown as 0:59
  const cooldownDisplay = resendCooldown > 0
    ? `${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="login-page-root">
      {/* ── LEFT PANEL ──────────────────────────────────────────── */}
      <AuthLeftPanel
        headline={<>Start your<br />adventure today.</>}
        subheadline="Create an account to unlock seamless flight, hotel, and bus bookings worldwide."
      />

      {/* ── RIGHT PANEL ─────────────────────────────────────────── */}
      <div className="login-right-panel py-8">
        <div className="login-form-container">
          <MobileBrandHeader />

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STATE: CREATING ACCOUNT                                */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'creating' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink tracking-tight mb-2">
                Creating your account…
              </h1>
              <p className="text-slate-500 text-body-sm">
                Just a moment while we set things up.
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STATE: OTP VERIFICATION                                */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'otp' && (
            <div className="py-2">
              {/* Back / Edit email */}
              <button
                type="button"
                onClick={() => { setStep('form'); setOtpError(null); setOtpSuccess(false); setOtpValue(''); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink transition-colors mb-6"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Back
              </button>

              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-route/10 text-route rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-bold text-ink tracking-tight mb-2">
                  Verify your email
                </h1>
                <p className="text-slate-500 text-body-sm">
                  We've sent a 6-digit code to<br />
                  <strong className="text-ink">{form.email.trim()}</strong>
                </p>
              </div>

              {/* OTP Success Animation */}
              {otpSuccess && (
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* OTP Input */}
              {!otpSuccess && (
                <>
                  <div className="mb-6">
                    <label className="login-label text-center block mb-3">Verification Code</label>
                    <OtpInput
                      value={otpValue}
                      onChange={setOtpValue}
                      disabled={otpLoading}
                    />
                  </div>

                  {/* OTP Error */}
                  {otpError && (
                    <div role="alert" className="login-error-box mb-4">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-500">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <p className="text-red-700 text-sm">{otpError}</p>
                    </div>
                  )}

                  {/* Verify Button */}
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpValue.replace(/\s/g, '').length !== 6}
                    className="login-submit-btn w-full mb-4"
                  >
                    {otpLoading ? (
                      <><SpinnerIcon /> Verifying…</>
                    ) : (
                      'Verify Code'
                    )}
                  </button>

                  {/* Resend */}
                  <div className="text-center">
                    <p className="text-slate-500 text-xs mb-1">Didn't receive the code?</p>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || resendLoading}
                      className="text-sm text-route font-semibold hover:underline disabled:opacity-50 disabled:no-underline transition-colors"
                    >
                      {resendLoading ? (
                        'Sending…'
                      ) : resendCooldown > 0 ? (
                        `Resend Code in ${cooldownDisplay}`
                      ) : (
                        'Resend Code'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STATE: REGISTRATION FORM                               */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'form' && (
            <>
              <div className="mb-6">
                <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
                  Create an account
                </h1>
                <p className="text-slate-500 mt-2 text-body-sm">
                  Join Waypoint to start booking your next journey.
                </p>
              </div>

              <SocialAuthButtons onSocialClick={handleSocialClick} />
              <AuthDivider text="or create an account with email" />

              <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="register-fullName" className="login-label">Full Name</label>
                  <input
                    id="register-fullName"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="input-glass"
                  />
                </div>

                <div>
                  <label htmlFor="register-email" className="login-label">Email Address</label>
                  <input
                    id="register-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-glass"
                  />
                </div>

                <div>
                  <InternationalPhoneInput
                    id="register-phone"
                    label="Phone (Optional)"
                    value={form.phone}
                    onChange={(phone) => setForm({ ...form, phone })}
                  />
                </div>

                <div>
                  <PasswordInput
                    id="register-password"
                    name="password"
                    value={form.password}
                    onChange={(e) => {
                      const newPassword = e.target.value;
                      setForm({ ...form, password: newPassword });
                      if (showPasswordError) {
                        const msg = getMissingPasswordRequirementsMessage(newPassword);
                        setPasswordError(msg);
                        if (!msg) setShowPasswordError(false);
                      }
                    }}
                    autoComplete="new-password"
                  />

                  {/* Dynamic missing-requirement message only shown after invalid submit attempt */}
                  {showPasswordError && passwordError && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{passwordError}</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div role="alert" className="login-error-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-500">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn mt-2"
                >
                  {loading ? (
                    <><SpinnerIcon /> Sending Code…</>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>

              <p className="text-center text-slate-500 mt-6 text-body-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-route font-semibold hover:text-route-dark transition-colors">
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
