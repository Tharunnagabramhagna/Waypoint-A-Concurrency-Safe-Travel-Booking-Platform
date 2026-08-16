import logger from '../lib/logger.js';

/**
 * Send password reset email.
 * Supports SMTP/API configuration via environment variables:
 *  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, FRONTEND_URL
 * If SMTP is not configured, logs reset link cleanly for development/testing.
 */
export async function sendPasswordResetEmail({ toEmail, resetToken, userFullName }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const fromEmail = process.env.EMAIL_FROM || 'Waypoint Travel <noreply@waypoint.com>';
  const subject = 'Reset Your Waypoint Password';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; color: #12172a; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: bold; color: #2f6f5e; text-decoration: none; }
          .title { font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #12172a; }
          .content { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #2f6f5e; color: #ffffff !important; padding: 12px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-t: 1px solid #e2e8f0; padding-top: 16px; }
          .url-box { background: #f8fafc; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; color: #334155; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">✈ Waypoint</span>
          </div>
          <div class="title">Password Reset Request</div>
          <div class="content">
            Hello ${userFullName || 'Traveler'},<br><br>
            We received a request to reset the password for your Waypoint account (${toEmail}).<br>
            Click the button below to set a new password. This link is valid for 1 hour.
          </div>
          <div class="btn-container">
            <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
          </div>
          <div class="content">
            If you did not request a password reset, you can safely ignore this email — your account remains secure.<br>
            <div class="url-box">${resetLink}</div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Waypoint Travel Platform. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      // Dynamic import nodemailer if installed
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      logger.info({ toEmail }, '[Email Service] Password reset email sent via SMTP');
      return { delivered: true, method: 'smtp' };
    } catch (err) {
      logger.error(err, '[Email Service] SMTP transport failed — falling back to log mode');
    }
  }

  // Development / Unconfigured SMTP Fallback: Log reset link cleanly
  logger.info({ toEmail, resetLink }, '[Email Service] Password Reset Link generated (Development Console Log)');
  return { delivered: true, method: 'log', resetLink };
}
