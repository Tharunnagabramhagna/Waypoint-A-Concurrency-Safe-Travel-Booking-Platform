const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

let csrfToken = null;

async function getCsrfToken() {
  if (!csrfToken) {
    const res = await fetch(`${API_URL}/csrf-token`, { credentials: 'include' });
    const data = await res.json();
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

async function refreshAccessToken() {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.error('Failed to refresh token', err);
  }
  return false;
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  // Get CSRF token for non-GET requests
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = await getCsrfToken();
    headers['X-CSRF-Token'] = token;
  }

  const makeRequest = async () => {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  };

  let res = await makeRequest();

  // If 401, try to refresh token once
  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry original request with new CSRF token
      csrfToken = null;
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        const token = await getCsrfToken();
        headers['X-CSRF-Token'] = token;
      }
      res = await makeRequest();
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

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
