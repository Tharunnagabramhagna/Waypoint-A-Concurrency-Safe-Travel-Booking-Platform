import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const accessToken = req.cookies['access-token'];
  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token' });
  }
  try {
    const payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
