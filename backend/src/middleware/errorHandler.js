export class AppError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'APP_ERROR';
  }
}

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  // CSRF validation error handling
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF' });
  }
  // Postgres unique_violation -> surfaces as a 409, not a 500.
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Conflict: resource already exists or was just taken', code: 'CONFLICT' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}
