import { validatePassword } from '../controllers/authController.js';
import assert from 'assert';

const API_BASE = 'http://localhost:4000/api/v1';

async function runPasswordPolicyTests() {
  console.log('=== STARTING PASSWORD POLICY TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`[PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${description} -> ${err.message}`);
      failed++;
    }
  }

  // ── 1. Unit Tests on validatePassword() ─────────────────────────────────────

  console.log('--- 1. Valid Password Tests ---');

  test('Valid: "Waypoint@123"', () => {
    const res = validatePassword('Waypoint@123');
    assert.strictEqual(res.valid, true);
  });

  test('Valid: "Travel#2026"', () => {
    const res = validatePassword('Travel#2026');
    assert.strictEqual(res.valid, true);
  });

  test('Valid: "Secure!Pass9"', () => {
    const res = validatePassword('Secure!Pass9');
    assert.strictEqual(res.valid, true);
  });

  test('Valid: Exactly 8 characters ("W@yp0nt1")', () => {
    const res = validatePassword('W@yp0nt1');
    assert.strictEqual(res.valid, true);
  });

  test('Valid: Exactly 128 characters', () => {
    const longPass = 'W@1' + 'a'.repeat(125);
    assert.strictEqual(longPass.length, 128);
    const res = validatePassword(longPass);
    assert.strictEqual(res.valid, true);
  });

  test('Valid: Password with spaces ("Waypoint Travel @2026")', () => {
    const res = validatePassword('Waypoint Travel @2026');
    assert.strictEqual(res.valid, true);
  });

  console.log('\n--- 2. Invalid Password Tests ---');

  test('Invalid: "password" (common, no upper, no number, no special)', () => {
    const res = validatePassword('password');
    assert.strictEqual(res.valid, false);
  });

  test('Invalid: "password123" (common, no upper, no special)', () => {
    const res = validatePassword('password123');
    assert.strictEqual(res.valid, false);
  });

  test('Invalid: "waypoint123" (common, no upper, no special)', () => {
    const res = validatePassword('waypoint123');
    assert.strictEqual(res.valid, false);
  });

  test('Invalid: "Password" (no number, no special)', () => {
    const res = validatePassword('Password');
    assert.strictEqual(res.valid, false);
    assert.match(res.message, /number/i);
  });

  test('Invalid: "Password123" (no special character)', () => {
    const res = validatePassword('Password123');
    assert.strictEqual(res.valid, false);
    assert.match(res.message, /special character/i);
  });

  test('Invalid: "password@123" (no uppercase letter)', () => {
    const res = validatePassword('password@123');
    assert.strictEqual(res.valid, false);
    assert.match(res.message, /uppercase/i);
  });

  test('Invalid: "PASSWORD@123" (no lowercase letter)', () => {
    const res = validatePassword('PASSWORD@123');
    assert.strictEqual(res.valid, false);
    assert.match(res.message, /lowercase/i);
  });

  test('Invalid: "Password@" (no number)', () => {
    const res = validatePassword('Password@');
    assert.strictEqual(res.valid, false);
    assert.match(res.message, /number/i);
  });

  test('Invalid: "Pass@1" (too short: 6 characters < 8)', () => {
    const res = validatePassword('Pass@1');
    assert.strictEqual(res.valid, false);
    assert.match(res.message, /8 characters/i);
  });

  test('Invalid: "12345678" (no upper, no lower, no special, common)', () => {
    const res = validatePassword('12345678');
    assert.strictEqual(res.valid, false);
  });

  test('Invalid: 129-character password (exceeds 128)', () => {
    const tooLong = 'W@1' + 'a'.repeat(126);
    assert.strictEqual(tooLong.length, 129);
    const res = validatePassword(tooLong);
    assert.strictEqual(res.valid, false);
    assert.match(res.message, /128 characters/i);
  });

  // ── 3. Frontend getMissingPasswordRequirementsMessage UX Tests ─────────────

  console.log('\n--- 3. Missing Requirement UX Message Tests ---');

  const { getMissingPasswordRequirementsMessage } = await import('../../../frontend/src/utils/passwordPolicy.js');

  test('UX: "password" -> "Password needs an uppercase letter, a number, and a special character."', () => {
    const msg = getMissingPasswordRequirementsMessage('password');
    assert.strictEqual(msg, 'Password needs an uppercase letter, a number, and a special character.');
  });

  test('UX: "password123" -> "Password needs an uppercase letter and a special character."', () => {
    const msg = getMissingPasswordRequirementsMessage('password123');
    assert.strictEqual(msg, 'Password needs an uppercase letter and a special character.');
  });

  test('UX: "Password123" -> "Password needs a special character."', () => {
    const msg = getMissingPasswordRequirementsMessage('Password123');
    assert.strictEqual(msg, 'Password needs a special character.');
  });

  test('UX: "PASSWORD@123" -> "Password needs a lowercase letter."', () => {
    const msg = getMissingPasswordRequirementsMessage('PASSWORD@123');
    assert.strictEqual(msg, 'Password needs a lowercase letter.');
  });

  test('UX: "Password@" -> "Password needs a number."', () => {
    const msg = getMissingPasswordRequirementsMessage('Password@');
    assert.strictEqual(msg, 'Password needs a number.');
  });

  test('UX: "Pass@1" -> "Password must be at least 8 characters."', () => {
    const msg = getMissingPasswordRequirementsMessage('Pass@1');
    assert.strictEqual(msg, 'Password must be at least 8 characters.');
  });

  test('UX: "Password123@" -> null (all requirements met, no error)', () => {
    const msg = getMissingPasswordRequirementsMessage('Password123@');
    assert.strictEqual(msg, null);
  });

  // ── 4. Integration / Server-side Endpoint Tests ────────────────────────────

  console.log('\n--- 4. Server-side Endpoint Validation Tests ---');

  // Fetch CSRF token
  const csrfRes = await fetch(`${API_BASE}/csrf-token`);
  const csrfCookie = csrfRes.headers.get('set-cookie')?.split(';')[0];
  const { csrfToken } = await csrfRes.json();

  // Test 1: Reject invalid password at /register without OTP session
  const registerInvalidRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      Cookie: csrfCookie,
    },
    body: JSON.stringify({
      email: 'test_policy@example.com',
      password: 'password123',
      fullName: 'Test Policy',
    }),
  });

  const registerInvalidBody = await registerInvalidRes.json();
  if (registerInvalidRes.status === 400 && (registerInvalidBody.code === 'VALIDATION' || registerInvalidBody.code === 'VALIDATION_ERROR')) {
    console.log(`[PASS] Server rejects weak password with HTTP 400 (${registerInvalidBody.error})`);
    passed++;
  } else {
    console.error(`[FAIL] Expected HTTP 400 VALIDATION, got ${registerInvalidRes.status}`, registerInvalidBody);
    failed++;
  }

  // Test 2: Verify Login Endpoint schema allows existing login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      Cookie: csrfCookie,
    },
    body: JSON.stringify({
      email: 'nonexistent@example.com',
      password: 'any_existing_password',
    }),
  });

  // 401 INVALID_CREDENTIALS means password length schema passed validation (did not fail with 400)
  if (loginRes.status === 401) {
    console.log('[PASS] Login endpoint accepts standard password format without locking out existing users (HTTP 401 INVALID_CREDENTIALS)');
    passed++;
  } else {
    console.error(`[FAIL] Login endpoint unexpected status: ${loginRes.status}`);
    failed++;
  }

  // Test 3: Verify OAuth routes remain untouched and functional
  const googleAuthRes = await fetch(`${API_BASE}/auth/google`, { redirect: 'manual' });
  if (googleAuthRes.status === 302) {
    console.log('[PASS] Google OAuth route is functional and unaffected by password policy (HTTP 302 redirect)');
    passed++;
  } else {
    console.error(`[FAIL] Google OAuth route unexpected status: ${googleAuthRes.status}`);
    failed++;
  }

  const fbAuthRes = await fetch(`${API_BASE}/auth/facebook`, { redirect: 'manual' });
  if (fbAuthRes.status === 302) {
    console.log('[PASS] Facebook OAuth route is functional and unaffected by password policy (HTTP 302 redirect)');
    passed++;
  } else {
    console.error(`[FAIL] Facebook OAuth route unexpected status: ${fbAuthRes.status}`);
    failed++;
  }

  console.log(`\n=== PASSWORD POLICY TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPasswordPolicyTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
