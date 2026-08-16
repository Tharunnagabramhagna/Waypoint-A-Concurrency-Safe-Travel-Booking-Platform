/**
 * Common disposable/temporary email domains.
 * Used for optional rejection during OTP generation.
 * Extend as needed. Set EMAIL_REJECT_DISPOSABLE=true in .env to enable.
 */
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'tempmail.com',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'maildrop.cc',
  'dispostable.com',
  'mailnesia.com',
  'getairmail.com',
  'fakeinbox.com',
  'tempail.com',
  'tempr.email',
  'discard.email',
  '10minutemail.com',
  'minutemail.com',
  'binkmail.com',
  'getnada.com',
  'mohmal.com',
  'mailsac.com',
  'burner.kiwi',
  'emailondeck.com',
  'tempmailaddress.com',
  'crazymailing.com',
  'inboxkitten.com',
]);

/**
 * Check if an email domain is a known disposable provider.
 */
export function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}
