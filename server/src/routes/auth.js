import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { getDb, ensureUserCompany } from '../db/schema.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId, email) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

  const isAdmin = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() ? 1 : 0;

  db.prepare(`
    INSERT INTO users (id, email, password_hash, verification_token, is_admin)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase(), password_hash, verification_token, isAdmin);

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

  // Auto-promote admin email on every login
  if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL.toLowerCase()) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
  }

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
    const user = db.prepare('SELECT id, email, email_verified, is_admin FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, is_admin: !!user.is_admin });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /auth/company/create — create a new company for the current user
router.post('/company/create', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Company name required' });

  const db = getDb();
  const companyId = uuidv4();

  // Generate unique 6-char join code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (db.prepare('SELECT id FROM companies WHERE code = ?').get(code));

  db.prepare('INSERT INTO companies (id, name, code, owner_id) VALUES (?, ?, ?, ?)').run(companyId, name.trim(), code, req.userId);
  db.prepare('UPDATE users SET company_id = ? WHERE id = ?').run(companyId, req.userId);

  res.json({ company_id: companyId, code, name: name.trim() });
});

// POST /auth/company/join — join an existing company by code
router.post('/company/join', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Company code required' });

  const db = getDb();
  const company = db.prepare('SELECT * FROM companies WHERE code = ? COLLATE NOCASE').get(code.trim().toUpperCase());
  if (!company) return res.status(404).json({ error: 'Invalid company code. Check with your account admin.' });

  // Free plan: block second user from joining
  if (company.plan === 'free' || !company.plan) {
    const memberCount = db.prepare('SELECT COUNT(*) as n FROM users WHERE company_id = ?').get(company.id).n;
    if (memberCount >= 1) {
      return res.status(402).json({ error: 'upgrade_required', message: 'This company is on the Free plan which allows 1 user. The account owner must upgrade to Pro to add team members.' });
    }
  }

  db.prepare('UPDATE users SET company_id = ? WHERE id = ?').run(company.id, req.userId);

  // Increment seat count
  const newSeats = db.prepare('SELECT COUNT(*) as n FROM users WHERE company_id = ?').get(company.id).n;
  db.prepare('UPDATE companies SET seats = ? WHERE id = ?').run(newSeats, company.id);

  // Update Stripe subscription quantity if active
  if (company.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const sub = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
      if (sub.items.data[0]) {
        await stripe.subscriptions.update(company.stripe_subscription_id, {
          items: [{ id: sub.items.data[0].id, quantity: newSeats }],
        });
      }
    } catch (err) {
      console.error('[stripe] seat update failed:', err.message);
    }
  }

  // Pre-populate new member's profile with company owner's shared data (name, address, license)
  const ownerProfile = db.prepare(
    'SELECT company_name, address, city, state, zip, phone, email, license_number, logo_path FROM profiles WHERE user_id = ?'
  ).get(company.owner_id);
  if (ownerProfile) {
    const fields = ['company_name', 'address', 'city', 'state', 'zip', 'phone', 'email', 'license_number', 'logo_path'];
    const toSet = fields.filter(f => ownerProfile[f]);
    if (toSet.length > 0) {
      const setClause = toSet.map(f => `${f} = ?`).join(', ');
      const values = [...toSet.map(f => ownerProfile[f]), Math.floor(Date.now() / 1000), req.userId];
      db.prepare(`UPDATE profiles SET ${setClause}, updated_at = ? WHERE user_id = ?`).run(...values);
    }
  }

  res.json({ company_id: company.id, name: company.name, code: company.code });
});

// GET /auth/company — get current user's company info
router.get('/company', requireAuth, (req, res) => {
  if (!req.companyId) return res.status(404).json({ error: 'No company assigned' });

  const db = getDb();
  const company = db.prepare('SELECT id, name, code, owner_id, plan, seats, created_at FROM companies WHERE id = ?').get(req.companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const memberCount = db.prepare('SELECT COUNT(*) as n FROM users WHERE company_id = ?').get(req.companyId).n;
  const plan = company.plan || 'free';
  const seats = memberCount;
  const pricePerSeat = plan === 'business' ? 49.99 : plan === 'pro' ? 19.99 : 0;
  const totalMonthly = pricePerSeat * seats;

  res.json({ ...company, member_count: memberCount, seats, plan, price_per_seat: pricePerSeat, total_monthly: totalMonthly });
});

// GET /auth/company/members — list all members (any member can view)
router.get('/company/members', requireAuth, (req, res) => {
  if (!req.companyId) return res.status(404).json({ error: 'No company assigned' });
  const db = getDb();
  const members = db.prepare(`
    SELECT u.id, u.email, u.created_at, u.last_active,
           p.owner_name,
           c.owner_id = u.id as is_owner
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE u.company_id = ?
    ORDER BY u.created_at ASC
  `).all(req.companyId);
  res.json({ members });
});

// DELETE /auth/company/members/:userId — remove a member (owner only)
router.delete('/company/members/:userId', requireAuth, async (req, res) => {
  if (!req.companyId) return res.status(404).json({ error: 'No company assigned' });

  const db = getDb();
  const company = db.prepare('SELECT owner_id, stripe_subscription_id, plan FROM companies WHERE id = ?').get(req.companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  if (company.owner_id !== req.userId) return res.status(403).json({ error: 'Only the company owner can remove members' });

  const targetId = req.params.userId;
  if (targetId === req.userId) return res.status(400).json({ error: 'Cannot remove yourself' });

  const target = db.prepare('SELECT id FROM users WHERE id = ? AND company_id = ?').get(targetId, req.companyId);
  if (!target) return res.status(404).json({ error: 'User not found in this company' });

  db.prepare('UPDATE users SET company_id = NULL WHERE id = ?').run(targetId);

  const newSeats = db.prepare('SELECT COUNT(*) as n FROM users WHERE company_id = ?').get(req.companyId).n;
  db.prepare('UPDATE companies SET seats = ? WHERE id = ?').run(newSeats, req.companyId);

  // Update Stripe subscription quantity
  if (company.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const sub = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
      if (sub.items.data[0]) {
        await stripe.subscriptions.update(company.stripe_subscription_id, {
          items: [{ id: sub.items.data[0].id, quantity: Math.max(1, newSeats) }],
        });
      }
    } catch (err) {
      console.error('[stripe] seat decrement failed:', err.message);
    }
  }

  res.json({ success: true, seats: newSeats });
});

export default router;
