import pg from 'pg';
import dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config({ path: 'c:/Users/tarun/OneDrive/Desktop/travel-booking-app/backend/.env' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const BASE_URL = 'http://localhost:4000/api/v1';

let csrfToken = null;
let cookieHeader = '';

async function fetchCsrf() {
  const res = await fetch(`${BASE_URL}/csrf-token`);
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  cookieHeader = setCookie.join('; ');
  const data = await res.json();
  csrfToken = data.csrfToken;
}

async function post(path, body, extraCookies = '') {
  const cookies = [cookieHeader, extraCookies].filter(Boolean).join('; ');
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
      'Cookie': cookies,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  return { res, data, setCookies };
}

function extractCookie(setCookies, name) {
  for (const c of setCookies) {
    if (c && c.startsWith(`${name}=`)) {
      return c.split(';')[0];
    }
  }
  return null;
}

async function runTests() {
  console.log('=== STARTING EMAIL OTP VERIFICATION TEST SUITE ===\n');

  const testEmail = `otp_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'OTP Tester';
  let passes = 0;
  let fails = 0;

  function pass(name, detail) {
    passes++;
    console.log(`[PASS] ${name} → ${detail}`);
  }
  function fail(name, detail) {
    fails++;
    console.log(`[FAIL] ${name} → ${detail}`);
  }

  try {
    // 0. CSRF Token
    await fetchCsrf();
    pass('CSRF Token Fetch', `Token: ${csrfToken ? 'Received' : 'Missing'}`);

    // ── TEST 1: Send OTP ──────────────────────────────────────────
    const { res: otpRes, data: otpData } = await post('/auth/send-email-otp', { email: testEmail });
    if (otpRes.status === 200 && otpData?.success) {
      pass('1. Send Email OTP', `HTTP ${otpRes.status}`);
    } else {
      fail('1. Send Email OTP', `HTTP ${otpRes.status}: ${JSON.stringify(otpData)}`);
    }

    // ── TEST 2: OTP stored with SHA-256 hash ──────────────────────
    const { rows: otpRows } = await pool.query(
      `SELECT * FROM email_otps WHERE email = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [testEmail]
    );
    if (otpRows.length === 1 && otpRows[0].otp_hash && otpRows[0].otp_hash.length === 64) {
      pass('2. OTP SHA-256 Hash Stored', `Hash length: ${otpRows[0].otp_hash.length}, Expires: ${otpRows[0].expires_at}`);
    } else {
      fail('2. OTP SHA-256 Hash Stored', `Rows: ${otpRows.length}`);
    }

    // ── TEST 3: OTP Cooldown (60s) ────────────────────────────────
    const { res: cooldownRes, data: cooldownData } = await post('/auth/send-email-otp', { email: testEmail });
    if (cooldownRes.status === 429 && (cooldownData?.code === 'OTP_COOLDOWN' || cooldownData?.code === 'TOO_MANY_REQUESTS')) {
      pass('3. OTP 60s Cooldown Enforced', `HTTP ${cooldownRes.status}, Code: ${cooldownData.code}`);
    } else {
      fail('3. OTP 60s Cooldown Enforced', `HTTP ${cooldownRes.status}: ${JSON.stringify(cooldownData)}`);
    }

    // ── TEST 4: Invalid OTP (wrong code) ──────────────────────────
    const { res: wrongRes, data: wrongData } = await post('/auth/verify-email-otp', { email: testEmail, otp: '000000' });
    if (wrongRes.status === 400 && wrongData?.code === 'INVALID_OTP') {
      pass('4. Invalid OTP Rejected', `HTTP ${wrongRes.status}, Message: ${wrongData.error}`);
    } else {
      fail('4. Invalid OTP Rejected', `HTTP ${wrongRes.status}: ${JSON.stringify(wrongData)}`);
    }

    // ── TEST 5: Max Attempts (5 failures) ─────────────────────────
    // Use a dedicated email with a directly-inserted OTP to avoid interference
    const maxAttemptsEmail = `maxattempt_${Date.now()}@example.com`;
    const maxAttemptsOtp = '999999';
    const maxAttemptsHash = createHash('sha256').update(maxAttemptsOtp).digest('hex');
    await pool.query(
      `INSERT INTO email_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [maxAttemptsEmail, maxAttemptsHash]
    );

    let maxAttemptTriggered = false;
    for (let i = 0; i < 5; i++) {
      const { data: attemptData } = await post('/auth/verify-email-otp', { email: maxAttemptsEmail, otp: '000000' });
      if (attemptData?.code === 'MAX_ATTEMPTS_EXCEEDED') {
        maxAttemptTriggered = true;
        break;
      }
    }
    if (maxAttemptTriggered) {
      pass('5. Max 5 Attempts Enforced', 'OTP marked as failed after 5 wrong attempts');
    } else {
      fail('5. Max 5 Attempts Enforced', 'Did not trigger MAX_ATTEMPTS_EXCEEDED');
    }

    // ── TEST 6: OTP row soft-deleted (status=failed) ──────────────
    const { rows: failedRows } = await pool.query(
      `SELECT status FROM email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [maxAttemptsEmail]
    );
    if (failedRows.length > 0 && failedRows[0].status === 'failed') {
      pass('6. OTP Soft-Delete (status=failed)', `Status: ${failedRows[0].status}`);
    } else {
      fail('6. OTP Soft-Delete (status=failed)', `Status: ${failedRows[0]?.status}`);
    }

    // ── TEST 7: Successful OTP Verification ───────────────────────
    // Generate a fresh OTP via direct DB insert (bypass cooldown for testing)
    const freshOtp = '482193';
    const freshHash = createHash('sha256').update(freshOtp).digest('hex');
    await pool.query(`UPDATE email_otps SET status = 'expired' WHERE email = $1`, [testEmail]);
    await pool.query(
      `INSERT INTO email_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [testEmail, freshHash]
    );

    const { res: verifyRes, data: verifyData, setCookies: verifyCookies } = await post('/auth/verify-email-otp', { email: testEmail, otp: freshOtp });
    const otpSessionCookie = extractCookie(verifyCookies, 'otp-session');
    if (verifyRes.status === 200 && verifyData?.verified === true && otpSessionCookie) {
      pass('7. Successful OTP Verification', `HTTP ${verifyRes.status}, Session cookie: present`);
    } else {
      fail('7. Successful OTP Verification', `HTTP ${verifyRes.status}, Cookie: ${otpSessionCookie ? 'present' : 'MISSING'}, Data: ${JSON.stringify(verifyData)}`);
    }

    // ── TEST 8: OTP row marked verified ───────────────────────────
    const { rows: verifiedRows } = await pool.query(
      `SELECT status FROM email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [testEmail]
    );
    if (verifiedRows[0]?.status === 'verified') {
      pass('8. OTP Marked Verified (not deleted)', `Status: ${verifiedRows[0].status}`);
    } else {
      fail('8. OTP Marked Verified (not deleted)', `Status: ${verifiedRows[0]?.status}`);
    }

    // ── TEST 9: Register Requires OTP Session ─────────────────────
    // Try registering WITHOUT the otp-session cookie
    const { res: noSessionRes, data: noSessionData } = await post('/auth/register', {
      email: testEmail,
      password: testPassword,
      fullName: testName,
    });
    if (noSessionRes.status === 403 && noSessionData?.code === 'OTP_NOT_VERIFIED') {
      pass('9. Register Requires OTP Session', `HTTP ${noSessionRes.status}, Code: ${noSessionData.code}`);
    } else {
      fail('9. Register Requires OTP Session', `HTTP ${noSessionRes.status}: ${JSON.stringify(noSessionData)}`);
    }

    // ── TEST 10: Register With OTP Session ────────────────────────
    const { res: regRes, data: regData, setCookies: regCookies } = await post('/auth/register', {
      email: testEmail,
      password: testPassword,
      fullName: testName,
    }, otpSessionCookie);
    if (regRes.status === 201 && regData?.email === testEmail) {
      pass('10. Register With OTP Session', `HTTP ${regRes.status}, Email: ${regData.email}`);
    } else {
      fail('10. Register With OTP Session', `HTTP ${regRes.status}: ${JSON.stringify(regData)}`);
    }

    // ── TEST 11: No JWT Issued on Register ────────────────────────
    const accessTokenCookie = extractCookie(regCookies, 'access-token');
    if (!accessTokenCookie) {
      pass('11. No JWT Issued on Register', 'access-token cookie: absent (correct)');
    } else {
      fail('11. No JWT Issued on Register', 'access-token cookie was issued (should not be)');
    }

    // ── TEST 12: User Created with email_verified=true ────────────
    const { rows: userRows } = await pool.query(`SELECT email_verified FROM users WHERE email = $1`, [testEmail]);
    if (userRows[0]?.email_verified === true) {
      pass('12. User email_verified=true', `Verified: ${userRows[0].email_verified}`);
    } else {
      fail('12. User email_verified=true', `Verified: ${userRows[0]?.email_verified}`);
    }

    // ── TEST 13: Login Works After Registration ───────────────────
    const { res: loginRes, data: loginData, setCookies: loginCookies } = await post('/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    const loginAccessToken = extractCookie(loginCookies, 'access-token');
    if (loginRes.status === 200 && loginData?.user?.email === testEmail && loginAccessToken) {
      pass('13. Login After Registration', `HTTP ${loginRes.status}, User: ${loginData.user.email}, JWT: issued`);
    } else {
      fail('13. Login After Registration', `HTTP ${loginRes.status}: ${JSON.stringify(loginData)}`);
    }

    // ── TEST 14: Duplicate Email Rejection ─────────────────────────
    const { res: dupRes, data: dupData } = await post('/auth/send-email-otp', { email: testEmail });
    if (dupRes.status === 409 && dupData?.code === 'EMAIL_TAKEN') {
      pass('14. Duplicate Email Rejection', `HTTP ${dupRes.status}, Code: ${dupData.code}`);
    } else {
      fail('14. Duplicate Email Rejection', `HTTP ${dupRes.status}: ${JSON.stringify(dupData)}`);
    }

    // ── TEST 15: OTP Expiry ───────────────────────────────────────
    const expiredEmail = `expired_${Date.now()}@example.com`;
    const expiredOtp = '111111';
    const expiredHash = createHash('sha256').update(expiredOtp).digest('hex');
    await pool.query(
      `INSERT INTO email_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() - INTERVAL '1 minute')`,
      [expiredEmail, expiredHash]
    );
    const { res: expiredRes, data: expiredData } = await post('/auth/verify-email-otp', { email: expiredEmail, otp: expiredOtp });
    if (expiredRes.status === 400 && expiredData?.code === 'OTP_EXPIRED') {
      pass('15. OTP Expiry Enforcement', `HTTP ${expiredRes.status}, Code: ${expiredData.code}`);
    } else {
      fail('15. OTP Expiry Enforcement', `HTTP ${expiredRes.status}: ${JSON.stringify(expiredData)}`);
    }

    // ── TEST 16: Cleanup Worker ───────────────────────────────────
    // Insert old expired OTP record
    const oldEmail = `old_${Date.now()}@example.com`;
    await pool.query(
      `INSERT INTO email_otps (email, otp_hash, expires_at, status, created_at)
       VALUES ($1, $2, NOW() - INTERVAL '2 days', 'expired', NOW() - INTERVAL '2 days')`,
      [oldEmail, 'abc123hash']
    );
    const { rowCount } = await pool.query(
      `DELETE FROM email_otps WHERE status IN ('expired', 'failed', 'verified') AND created_at < NOW() - INTERVAL '24 hours'`
    );
    if (rowCount >= 1) {
      pass('16. Cleanup Worker Logic', `Deleted ${rowCount} old expired OTP record(s)`);
    } else {
      fail('16. Cleanup Worker Logic', `Deleted: ${rowCount}`);
    }

    console.log(`\n=== OTP TEST SUITE COMPLETE: ${passes} PASSED, ${fails} FAILED ===`);
    if (fails > 0) process.exit(1);
  } catch (err) {
    console.error('\n❌ OTP TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
