const DEFAULT_API_BASE_URL = 'https://waypoint-backend-ahsd.onrender.com';
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : DEFAULT_API_BASE_URL);
const API_URL = API_BASE.includes('/api/v1') ? API_BASE : `${API_BASE.replace(/\/$/, '')}/api/v1`;

if (typeof window !== 'undefined') {
  console.log('[Waypoint] API endpoint:', API_URL);
}

let csrfToken = null;

async function getCsrfToken(forceFresh = false) {
  if (!csrfToken || forceFresh) {
    const res = await fetch(`${API_URL}/csrf-token`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Failed to fetch CSRF token: ${res.status}`);
    }
    const data = await res.json();
    if (!data?.csrfToken) {
      throw new Error('CSRF token missing from response');
    }
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

async function refreshAccessToken() {
  let token;
  try {
    token = await getCsrfToken();
  } catch (err) {
    console.error('Failed to prepare token refresh', err);
    return false;
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
  });

  if (res.ok) {
    csrfToken = null;
    return true;
  }
  return false;
}

async function request(path, { method = 'GET', body, headers = {} } = {}, isRetry = false) {
  const isNonGet = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  if (isNonGet) {
    const token = await getCsrfToken();
    headers['X-CSRF-Token'] = token;
  }

  const makeRequest = async () => {
    return fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let res = await makeRequest();

  const isJson = res.headers.get('content-type')?.includes('application/json');
  let data = isJson ? await res.json() : null;

  // CSRF Retry Safety: Retry ONLY once when the backend responds specifically with INVALID_CSRF.
  // Do NOT retry any other 401, 403, or 500 responses. Guarded against infinite loops via !isRetry.
  if (!isRetry && isNonGet && res.status === 403 && data?.code === 'INVALID_CSRF') {
    csrfToken = null;
    const newToken = await getCsrfToken(true);
    headers['X-CSRF-Token'] = newToken;

    const retryRes = await makeRequest();
    const retryIsJson = retryRes.headers.get('content-type')?.includes('application/json');
    data = retryIsJson ? await retryRes.json() : null;
    res = retryRes;
  }

  // Handle 401 unauthorized once (token refresh)
  if (!isRetry && res.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      if (isNonGet) {
        const token = await getCsrfToken(true);
        headers['X-CSRF-Token'] = token;
      }
      const retryRes = await makeRequest();
      const retryIsJson = retryRes.headers.get('content-type')?.includes('application/json');
      data = retryIsJson ? await retryRes.json() : null;
      res = retryRes;
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.code = data?.code;
    err.payload = data;
    throw err;
  }

  // Clear CSRF token cache when session changes
  if (path === '/auth/login' || path === '/auth/register' || path === '/auth/logout' || path === '/auth/logout-all') {
    csrfToken = null;
  }

  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  verifyResetToken: (token) => request(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`),
  resetPassword: (token, newPassword) => request('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
  refresh: () => request('/auth/refresh', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  logoutAll: () => request('/auth/logout-all', { method: 'POST' }),
  me: () => request('/auth/me'),

  search: (params) => request(`/listings/search?${new URLSearchParams(params).toString()}`),
  getListing: (id) => request(`/listings/${id}`),

  hold: (inventoryUnitIds) => request('/bookings/hold', { method: 'POST', body: { inventoryUnitIds } }),
  createBooking: (inventoryUnitIds, idempotencyKey) =>
    request('/bookings', { method: 'POST', body: { inventoryUnitIds, idempotencyKey }, headers: { 'Idempotency-Key': idempotencyKey } }),
  myBookings: () => request('/bookings'),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'POST' }),

  capturePayment: (bookingId, idempotencyKey, cardNumberLast4) =>
    request('/payments/capture', {
      method: 'POST',
      body: { bookingId, idempotencyKey, cardNumberLast4 },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  getTracking: (bookingId) => request(`/bookings/${bookingId}/tracking`),

  mapOverview: () => request('/listings/map-overview'),
};

export function newIdempotencyKey() {
  return crypto.randomUUID();
}
