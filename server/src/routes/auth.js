import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '../db/schema.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId, email) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function ensureProfile(db, userId) {
  const profileId = uuidv4();
  db.prepare(`
    INSERT OR IGNORE INTO profiles (id, user_id) VALUES (?, ?)
  `).run(profileId, userId);

  db.prepare(`
    INSERT OR IGNORE INTO subscriptions (id, user_id, status) VALUES (?, ?, 'free')
  `).run(uuidv4(), userId);
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);
  const verification_token = uuidv4();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, verification_token)
    VALUES (?, ?, ?, ?)
  `).run(id, email.toLowerCase(), password_hash, verification_token);

  ensureProfile(db, id);

  // Send verification email (non-blocking)
  sendVerificationEmail(email, verification_token).catch(console.error);

  const token = signToken(id, email.toLowerCase());
  res.json({ token, userId: id, emailVerified: false });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken(user.id, user.email);
  res.json({ token, userId: user.id, emailVerified: !!user.email_verified });
});

// POST /auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(googleId, email.toLowerCase());

    if (!user) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO users (id, email, google_id, email_verified)
        VALUES (?, ?, ?, 1)
      `).run(id, email.toLowerCase(), googleId);

      ensureProfile(db, id);

      // Pre-fill name if available
      if (name) {
        db.prepare('UPDATE profiles SET owner_name = ? WHERE user_id = ?').run(name, id);
      }

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else if (!user.google_id) {
      // Link Google to existing email account
      db.prepare('UPDATE users SET google_id = ?, email_verified = 1 WHERE id = ?').run(googleId, user.id);
    }

    const token = signToken(user.id, user.email);
    res.json({ token, userId: user.id, emailVerified: true });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// POST /auth/verify-email
router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

  db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
  res.json({ success: true });
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());

  // Always return success to prevent email enumeration
  if (user) {
    const resetToken = uuidv4();
    const expires = Date.now() + 3600000; // 1 hour
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
      .run(resetToken, expires, user.id);
    sendPasswordResetEmail(email, resetToken).catch(console.error);
  }

  res.json({ success: true });
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || user.reset_token_expires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const password_hash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(password_hash, user.id);

  res.json({ success: true });
});

// GET /auth/me
router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, email, email_verified FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
