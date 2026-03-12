import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { runBackup } from './services/backup.js';
import { getDb } from './db/schema.js';
import bcrypt from 'bcryptjs';

import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import documentsRouter from './routes/documents.js';
import projectsRouter from './routes/projects.js';
import contactsRouter from './routes/contacts.js';
import chatRouter from './routes/chat.js';
import stripeRouter from './routes/stripe.js';
import pdfRouter from './routes/pdf.js';
import adminRouter from './routes/admin.js';
import templatesRouter from './routes/templates.js';
import markupsRouter from './routes/markups.js';
import attachmentsRouter from './routes/attachments.js';
import leadsRouter from './routes/leads.js';
import waitlistRouter from './routes/waitlist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3457;

// Stripe webhook needs raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Standard middleware
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://app.doveandbearinc.com',
  'https://constructionbear.vercel.app',
  'https://constructionbear.dev',
  'https://www.constructionbear.dev',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true });
app.use(limiter);
app.use('/api/chat', chatLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static files
app.use('/logos', express.static(path.join(process.cwd(), 'data/logos')));
app.use('/uploads', express.static(path.join(process.cwd(), 'data/uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/pdf', pdfRouter);
// Waitlist admin must come BEFORE adminRouter (which has requireAuth middleware)
app.use('/api/waitlist', waitlistRouter);
app.get('/api/admin/waitlist', (req, res) => res.redirect(`/api/waitlist/admin?key=${req.query.key || ''}`));

// Temporary diagnostic route — remove after DB state confirmed
app.get('/api/admin/db-check', (req, res) => {
  const key = req.query.key;
  if (key !== process.env.BEAR_API_KEY) return res.status(401).json({ error: 'unauthorized' });
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, email, email_verified, created_at FROM users LIMIT 20').all();
    const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get();
    const tableList = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    res.json({ tables: tableList, users, documentCount: docCount });
  } catch (e) {
    res.json({ error: e.message });
  }
});
// Temporary admin route — set password for existing user
app.post('/api/admin/set-password', async (req, res) => {
  const { key, email, password } = req.body;
  if (key !== process.env.BEAR_API_KEY) return res.status(401).json({ error: 'unauthorized' });
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.status(404).json({ error: 'user not found' });
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?').run(hash, user.id);
    res.json({ success: true, email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.use('/api/admin', adminRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/documents/:docId/markups', markupsRouter);
app.use('/api/documents/:docId/attachments', attachmentsRouter);
app.use('/api/leads', leadsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ConstructionBear API' }));

app.listen(PORT, () => {
  console.log(`ConstructionBear API running on port ${PORT}`);
});

// Daily backup at 2:00 AM
cron.schedule('0 2 * * *', () => {
  runBackup();
});
