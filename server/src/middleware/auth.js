import jwt from 'jsonwebtoken';
import { getDb, ensureUserCompany } from '../db/schema.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.email = payload.email;

    // Stamp last_active + load is_admin + resolve company_id
    try {
      const db = getDb();
      const user = db.prepare('SELECT is_admin, company_id, email FROM users WHERE id = ?').get(req.userId);
      req.isAdmin = !!(user?.is_admin);
      req.companyId = user?.company_id;

      // Test accounts bypass the paywall — comma-separated list in TEST_EMAILS env var
      const testEmails = (process.env.TEST_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      req.isTestAccount = testEmails.includes((user?.email || req.email || '').toLowerCase());

      // Auto-provision company for legacy users without one
      if (!req.companyId) {
        req.companyId = ensureUserCompany(db, req.userId, user?.email || req.email);
      }

      db.prepare('UPDATE users SET last_active = ? WHERE id = ?').run(Math.floor(Date.now() / 1000), req.userId);
    } catch { /* non-critical */ }

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  // Expects requireAuth to have run first
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.userId = payload.userId;
      req.email = payload.email;
    } catch {
      // ignore
    }
  }
  next();
}
