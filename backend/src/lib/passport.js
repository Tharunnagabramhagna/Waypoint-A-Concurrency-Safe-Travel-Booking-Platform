import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { findOrCreateOAuthUser, getFrontendUrl } from '../controllers/oauthController.js';
import logger from './logger.js';

/**
 * Initialize Passport strategies for Google and Facebook OAuth.
 * 
 * Uses stateless JWT mode — no Passport sessions.
 * Each strategy calls findOrCreateOAuthUser to get or create the user,
 * then attaches the user object to req.user for the callback handler.
 */
export function initPassport(app) {
  app.use(passport.initialize());

  // ── Google OAuth 2.0 ──────────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleCallbackURL = getCallbackUrl('google');

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: googleCallbackURL,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const emailObj = profile.emails?.[0];
            const email = emailObj?.value;
            if (!email) {
              return done(new Error('No email returned from Google'), null);
            }

            // Explicitly check if Google verified the email
            const emailVerified = Boolean(
              emailObj?.verified === true ||
              profile._json?.email_verified === true ||
              profile._json?.email_verified === 'true'
            );

            const user = await findOrCreateOAuthUser({
              provider: 'google',
              providerId: profile.id,
              email,
              fullName: profile.displayName || email.split('@')[0],
              avatarUrl: profile.photos?.[0]?.value || null,
              emailVerified,
            });

            done(null, user);
          } catch (err) {
            logger.error(err, 'Google OAuth strategy error');
            done(err, null);
          }
        }
      )
    );
    logger.info({ callbackURL: googleCallbackURL }, 'Google OAuth strategy initialized');
  } else {
    logger.warn('Google OAuth not configured — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing');
  }

  // ── Facebook OAuth ────────────────────────────────────────────
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    const facebookCallbackURL = getCallbackUrl('facebook');

    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: facebookCallbackURL,
          profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
          scope: ['email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const emailObj = profile.emails?.[0];
            const email = emailObj?.value || profile._json?.email;
            if (!email) {
              return done(new Error('No email returned from Facebook. Please ensure email permission is granted.'), null);
            }

            // Check if Facebook verified the email (if available)
            const emailVerified = Boolean(
              emailObj?.verified === true ||
              profile._json?.email_verified === true ||
              profile._json?.email_verified === 'true'
            );

            const fullName = profile.displayName ||
              [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ') ||
              email.split('@')[0];

            const user = await findOrCreateOAuthUser({
              provider: 'facebook',
              providerId: profile.id,
              email,
              fullName,
              avatarUrl: profile.photos?.[0]?.value || null,
              emailVerified,
            });

            done(null, user);
          } catch (err) {
            logger.error(err, 'Facebook OAuth strategy error');
            done(err, null);
          }
        }
      )
    );
    logger.info({ callbackURL: facebookCallbackURL }, 'Facebook OAuth strategy initialized');
  } else {
    logger.warn('Facebook OAuth not configured — FACEBOOK_APP_ID / FACEBOOK_APP_SECRET missing');
  }
}

/**
 * Build the callback URL for a provider.
 * Uses BACKEND_URL env var in production, otherwise constructs from PORT.
 */
function getCallbackUrl(provider) {
  const backendUrl = process.env.BACKEND_URL ||
    (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : null) ||
    `http://localhost:${process.env.PORT || 4000}`;
  return `${backendUrl}/api/v1/auth/${provider}/callback`;
}
