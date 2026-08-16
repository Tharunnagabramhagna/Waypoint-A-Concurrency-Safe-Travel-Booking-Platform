import { google } from 'googleapis';
import { randomUUID } from 'crypto';
import logger from '../lib/logger.js';
import { AppError } from '../middleware/errorHandler.js';

// ──────────────────────────────────────────────────────────────────────────────
// Gmail API OAuth 2.0 Sender Service
// ──────────────────────────────────────────────────────────────────────────────
// Uses a single dedicated Waypoint sender Gmail account with offline access.
// Authorized scope: ONLY https://www.googleapis.com/auth/gmail.send
// ──────────────────────────────────────────────────────────────────────────────

const GMAIL_SEND_SCOPE = ['https://www.googleapis.com/auth/gmail.send'];

/**
 * Returns an unauthenticated or partially configured OAuth2 client.
 */
export function getGmailOAuth2Client() {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI || 'http://localhost:4000/api/v1/auth/gmail/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth consent URL for Gmail send authorization.
 */
export function getGmailAuthUrl() {
  const oauth2Client = getGmailOAuth2Client();
  if (!oauth2Client) {
    throw new AppError(
      500,
      'Gmail OAuth credentials (GOOGLE_GMAIL_CLIENT_ID / GOOGLE_GMAIL_CLIENT_SECRET) are not configured in .env',
      'GMAIL_CONFIG_MISSING'
    );
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Forces refresh token issuance
    scope: GMAIL_SEND_SCOPE,
  });
}

/**
 * Exchanges the authorization code received in the callback for tokens.
 */
export async function exchangeGmailAuthCode(code) {
  const oauth2Client = getGmailOAuth2Client();
  if (!oauth2Client) {
    throw new AppError(
      500,
      'Gmail OAuth client is not configured',
      'GMAIL_CONFIG_MISSING'
    );
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Checks whether Gmail API sender credentials and refresh token are fully configured.
 */
export function isGmailConfigured() {
  return Boolean(
    process.env.GOOGLE_GMAIL_CLIENT_ID &&
    process.env.GOOGLE_GMAIL_CLIENT_SECRET &&
    process.env.GOOGLE_GMAIL_REFRESH_TOKEN &&
    process.env.GOOGLE_GMAIL_SENDER
  );
}

/**
 * Returns an authenticated Gmail API client configured with the sender's refresh token.
 */
export function getAuthenticatedGmailClient() {
  const oauth2Client = getGmailOAuth2Client();
  const refreshToken = process.env.GOOGLE_GMAIL_REFRESH_TOKEN;

  if (!oauth2Client || !refreshToken) {
    return null;
  }

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Encodes an email message into RFC 5322 MIME format (text/plain or multipart/alternative)
 * and converts to Base64URL string for the Gmail API.
 */
function createRawMimeMessage({ from, to, subject, text, html }) {
  const messageId = `<${randomUUID()}@gmail.com>`;
  const dateHeader = new Date().toUTCString();
  const encodedSubject = `=?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;

  let messageParts;

  if (html) {
    const boundary = `----=_Part_${randomUUID().replace(/-/g, '')}`;
    const plainTextBody = text || html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `Date: ${dateHeader}`,
      `Message-ID: ${messageId}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(plainTextBody, 'utf-8').toString('base64'),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(html, 'utf-8').toString('base64'),
      '',
      `--${boundary}--`,
    ];
  } else {
    // Pure text/plain RFC 5322 message (clean, lightweight, highest deliverability for personal senders)
    messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `Date: ${dateHeader}`,
      `Message-ID: ${messageId}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(text || '', 'utf-8').toString('base64'),
    ];
  }

  const rawMessage = messageParts.join('\r\n');
  return Buffer.from(rawMessage, 'utf-8').toString('base64url');
}

/**
 * Sends an email using the authorized Gmail API sender account.
 */
export async function sendEmailViaGmail({ to, subject, text, html }) {
  const senderEmail = process.env.GOOGLE_GMAIL_SENDER;
  const fromHeader = senderEmail.includes('<') ? senderEmail : `"Waypoint Travel" <${senderEmail}>`;

  const gmail = getAuthenticatedGmailClient();
  if (!gmail) {
    throw new AppError(
      500,
      'Gmail API sender is not configured or missing GOOGLE_GMAIL_REFRESH_TOKEN in .env',
      'GMAIL_NOT_CONFIGURED'
    );
  }

  const raw = createRawMimeMessage({
    from: fromHeader,
    to,
    subject,
    text,
    html,
  });

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    logger.info(
      {
        recipient: to,
        messageId: res.data?.id,
        threadId: res.data?.threadId,
        provider: 'gmail_api',
      },
      `[Gmail API] Email delivered successfully`
    );

    return {
      delivered: true,
      method: 'gmail_api',
      id: res.data?.id,
    };
  } catch (err) {
    // Technical log without exposing tokens/OTPs
    logger.error(
      {
        err: {
          message: err.message,
          code: err.code,
          status: err.status || err.response?.status,
          errors: err.errors || err.response?.data?.error,
        },
        recipient: to,
      },
      `[Gmail API] Outbound email send failed`
    );

    throw new AppError(
      400,
      "We couldn't send the verification code right now. Please try again.",
      'EMAIL_DELIVERY_FAILED'
    );
  }
}
