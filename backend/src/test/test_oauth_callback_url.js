import assert from 'assert';
import { getBackendBaseUrl, getCallbackUrl } from '../lib/passport.js';

console.log('--- TESTING OAUTH CALLBACK URL GENERATION ---\n');

const testCases = [
  {
    name: '1. Standard production BACKEND_URL without trailing slash',
    env: { BACKEND_URL: 'https://waypoint-backend-ahsd.onrender.com' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedGoogle: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/google/callback',
  },
  {
    name: '2. Production BACKEND_URL with trailing slash',
    env: { BACKEND_URL: 'https://waypoint-backend-ahsd.onrender.com/' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedGoogle: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/google/callback',
  },
  {
    name: '3. Accidental duplicate protocol in BACKEND_URL (e.g. https://https://)',
    env: { BACKEND_URL: 'https://https://waypoint-backend-ahsd.onrender.com' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedGoogle: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/google/callback',
  },
  {
    name: '4. Production BACKEND_URL without protocol (e.g. hostname only)',
    env: { BACKEND_URL: 'waypoint-backend-ahsd.onrender.com' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedGoogle: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/google/callback',
  },
  {
    name: '5. Render automatic RENDER_EXTERNAL_URL with protocol',
    env: { BACKEND_URL: '', RENDER_EXTERNAL_URL: 'https://waypoint-backend-ahsd.onrender.com' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedGoogle: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/google/callback',
  },
  {
    name: '6. Render RENDER_EXTERNAL_URL without protocol',
    env: { BACKEND_URL: '', RENDER_EXTERNAL_URL: 'waypoint-backend-ahsd.onrender.com' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedGoogle: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/google/callback',
  },
  {
    name: '7. Render RENDER_EXTERNAL_HOSTNAME fallback',
    env: { BACKEND_URL: '', RENDER_EXTERNAL_URL: '', RENDER_EXTERNAL_HOSTNAME: 'waypoint-backend-ahsd.onrender.com' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedGoogle: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/google/callback',
  },
  {
    name: '8. Local development (default PORT=4000)',
    env: { BACKEND_URL: '', RENDER_EXTERNAL_URL: '', RENDER_EXTERNAL_HOSTNAME: '', PORT: '4000' },
    expectedBase: 'http://localhost:4000',
    expectedGoogle: 'http://localhost:4000/api/v1/auth/google/callback',
  },
  {
    name: '9. Local development with custom PORT=5000',
    env: { BACKEND_URL: '', RENDER_EXTERNAL_URL: '', RENDER_EXTERNAL_HOSTNAME: '', PORT: '5000' },
    expectedBase: 'http://localhost:5000',
    expectedGoogle: 'http://localhost:5000/api/v1/auth/google/callback',
  },
  {
    name: '10. Facebook provider callback generation',
    env: { BACKEND_URL: 'https://waypoint-backend-ahsd.onrender.com' },
    expectedBase: 'https://waypoint-backend-ahsd.onrender.com',
    expectedFacebook: 'https://waypoint-backend-ahsd.onrender.com/api/v1/auth/facebook/callback',
  },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  // Save old env
  const savedEnv = {
    BACKEND_URL: process.env.BACKEND_URL,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
    RENDER_EXTERNAL_HOSTNAME: process.env.RENDER_EXTERNAL_HOSTNAME,
    PORT: process.env.PORT,
  };

  // Set test env
  delete process.env.BACKEND_URL;
  delete process.env.RENDER_EXTERNAL_URL;
  delete process.env.RENDER_EXTERNAL_HOSTNAME;
  delete process.env.PORT;

  for (const [k, v] of Object.entries(tc.env)) {
    if (v !== undefined && v !== '') {
      process.env[k] = v;
    }
  }

  try {
    const base = getBackendBaseUrl();
    assert.strictEqual(base, tc.expectedBase, `Base URL mismatch in "${tc.name}": got "${base}", expected "${tc.expectedBase}"`);

    if (tc.expectedGoogle) {
      const googleUrl = getCallbackUrl('google');
      assert.strictEqual(googleUrl, tc.expectedGoogle, `Google Callback mismatch in "${tc.name}": got "${googleUrl}", expected "${tc.expectedGoogle}"`);
      // Assert exactly one protocol exists
      const protocolCount = (googleUrl.match(/https?:\/\//g) || []).length;
      assert.strictEqual(protocolCount, 1, `Protocol count must be exactly 1 in "${googleUrl}"`);
    }

    if (tc.expectedFacebook) {
      const fbUrl = getCallbackUrl('facebook');
      assert.strictEqual(fbUrl, tc.expectedFacebook, `Facebook Callback mismatch in "${tc.name}": got "${fbUrl}", expected "${tc.expectedFacebook}"`);
      const protocolCount = (fbUrl.match(/https?:\/\//g) || []).length;
      assert.strictEqual(protocolCount, 1, `Protocol count must be exactly 1 in "${fbUrl}"`);
    }

    console.log(`✅ PASS: ${tc.name}`);
    console.log(`   Generated: ${tc.expectedGoogle || tc.expectedFacebook}\n`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${tc.name}`);
    console.error(`   ${err.message}\n`);
    failed++;
  } finally {
    // Restore env
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v !== undefined) process.env[k] = v;
      else delete process.env[k];
    }
  }
}

console.log(`Summary: ${passed} passed, ${failed} failed out of ${testCases.length} tests.`);
if (failed > 0) process.exit(1);
