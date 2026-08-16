import logger from '../lib/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { isGmailConfigured, sendEmailViaGmail, getGmailOAuth2Client } from './gmailService.js';

// ──────────────────────────────────────────────────────────────────────────────
// Email Service (Gmail API Provider)
// ──────────────────────────────────────────────────────────────────────────────

const REQUIRED_GMAIL_VARS = [
  'GOOGLE_GMAIL_CLIENT_ID',
  'GOOGLE_GMAIL_CLIENT_SECRET',
  'GOOGLE_GMAIL_REDIRECT_URI',
  'GOOGLE_GMAIL_SENDER',
  'GOOGLE_GMAIL_REFRESH_TOKEN',
];

/**
 * Validate environment variables and initialize Gmail API client on server startup.
 * - In production: Fails loudly if Gmail sender credentials/refresh token are missing.
 * - In development: Logs warning notice and enables console fallback.
 */
export async function initEmailVerification() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars = REQUIRED_GMAIL_VARS.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    const errorMsg = `[Email Service] Gmail API configuration incomplete. Missing variables: ${missingVars.join(', ')}`;
    if (isProduction) {
      logger.fatal(errorMsg);
      throw new Error(errorMsg);
    } else {
      logger.warn(`[Email Service] Gmail OTP delivery is not configured. Development console fallback active.`);
      return false;
    }
  }

  const oauth2Client = getGmailOAuth2Client();
  if (!oauth2Client) {
    const errorMsg = '[Email Service] Failed to initialize Google OAuth2 client for Gmail API.';
    if (isProduction) {
      logger.fatal(errorMsg);
      throw new Error(errorMsg);
    }
    logger.warn(errorMsg);
    return false;
  }

  logger.info(`✓ Gmail API email sender initialized (${process.env.GOOGLE_GMAIL_SENDER})`);
  return true;
}

// Backward compatibility aliases for server startup
export const initResendVerification = initEmailVerification;
export const initSmtpVerification = initEmailVerification;

/**
 * Low-level send helper — routes through Gmail API or development fallback.
 */
async function dispatchEmail({ to, subject, text, html, devBanner }) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isGmailConfigured()) {
    // sendEmailViaGmail handles logging and throws clean AppError on failure
    return await sendEmailViaGmail({ to, subject, text, html });
  }

  // Refuse console fallback in production
  if (isProduction) {
    const prodError = `[Email Service] Outbound email failed: Gmail API is not configured in production environment.`;
    logger.fatal({ recipient: to }, prodError);
    throw new AppError(500, "We couldn't send the verification code right now. Please try again.", 'EMAIL_SERVICE_UNCONFIGURED');
  }

  // Development / Unconfigured Gmail API Fallback
  if (devBanner) {
    console.log(devBanner);
  }
  logger.info({ recipient: to }, `[Email Service] Development fallback banner printed for ${subject}`);
  return { delivered: true, method: 'log' };
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API — Business logic calls these
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP verification email (clean, genuine text/plain transactional format).
 */
export async function sendOtpEmail({ toEmail, otp }) {
  const subject = 'Your Waypoint verification code';

  const textContent = [
    'Your Waypoint verification code is:',
    '',
    otp,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not request this code, you can ignore this email.',
    '',
    'Waypoint',
  ].join('\r\n');

  const devBanner = `
================================================

DEVELOPMENT EMAIL OTP

Email:
${toEmail}

OTP:
${otp}

Expires:
10 minutes

================================================
`;

  return dispatchEmail({ to: toEmail, subject, text: textContent, html: null, devBanner });
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail({ toEmail, resetToken, userFullName }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const subject = 'Reset Your Waypoint Password';

  const textContent = [
    `Hello ${userFullName || 'Traveler'},`,
    '',
    `We received a request to reset your Waypoint password for ${toEmail}.`,
    `Click the link below to set a new password (valid for 1 hour):`,
    resetLink,
    '',
    'If you did not request a password reset, you can safely ignore this email.',
  ].join('\r\n');

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
    <div style="font-size:20px;font-weight:700;color:#2f6f5e;margin-bottom:16px;">Waypoint</div>
    <div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:8px;">Password Reset Request</div>
    <div style="font-size:14px;line-height:1.5;color:#475569;margin-bottom:20px;">
      Hello ${userFullName || 'Traveler'},<br><br>
      We received a request to reset the password for your Waypoint account (${toEmail}). Click the button below to set a new password. This link is valid for 1 hour.
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetLink}" style="background-color:#2f6f5e;color:#ffffff;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;display:inline-block;font-size:14px;" target="_blank">Reset Password</a>
    </div>
    <div style="font-size:13px;line-height:1.5;color:#64748b;margin-bottom:20px;">
      If you did not request a password reset, you can safely ignore this email &mdash; your account remains secure.
    </div>
    <div style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:20px;">
      &copy; ${new Date().getFullYear()} Waypoint Travel Platform. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  const devBanner = `
================================================
  [DEVELOPMENT EMAIL SERVICE]
  Gmail API not configured. Password reset email was NOT sent externally.

  Recipient: ${toEmail}
  Reset Link: ${resetLink}
================================================
`;

  return dispatchEmail({ to: toEmail, subject, text: textContent, html: htmlContent, devBanner });
}
