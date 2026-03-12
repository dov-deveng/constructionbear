import { Router } from 'express';
import nodemailer from 'nodemailer';
import { getDb } from '../db/schema.js';

const router = Router();

// One-time migrations on module load
{
  const db = getDb();
  try { db.exec('ALTER TABLE waitlist ADD COLUMN name TEXT'); } catch (_) { /* already exists */ }
  db.exec(`CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER DEFAULT (unixepoch()),
    ip TEXT,
    user_agent TEXT
  )`);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.BACKUP_EMAIL, pass: process.env.BACKUP_EMAIL_PASSWORD },
});

// POST /api/waitlist
router.post('/', (req, res) => {
  const { name, email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanName  = (name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM waitlist WHERE email = ?').get(cleanEmail);
  if (existing) return res.json({ success: true, existing: true });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
  db.prepare('INSERT INTO waitlist (name, email, ip_address) VALUES (?, ?, ?)').run(cleanName, cleanEmail, ip);

  // Fire-and-forget email backup
  try {
    transporter.sendMail({
      from: process.env.BACKUP_EMAIL,
      to: process.env.BACKUP_EMAIL,
      subject: 'New ConstructionBear Lead',
      text: `Name: ${cleanName}\nEmail: ${cleanEmail}\nTime: ${new Date().toISOString()}`,
    }).catch(err => console.error('[email-backup] sendMail failed:', err.message));
  } catch (err) {
    console.error('[email-backup] failed:', err.message);
  }

  res.status(201).json({ success: true });
});

// POST /api/waitlist/track-visit
router.post('/track-visit', (req, res) => {
  const db = getDb();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
  const ua = req.headers['user-agent'] || null;
  db.prepare('INSERT INTO visits (ip, user_agent) VALUES (?, ?)').run(ip, ua);
  res.json({ ok: true });
});

const ADMIN_KEY = '08e401868c07558bd7522c2423fdf2bc';

// GET /api/waitlist/admin
router.get('/admin', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).send(`<!DOCTYPE html><html><head><title>401</title>
      <style>body{background:#0A0A0F;color:rgba(255,255,255,0.4);font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style>
      </head><body><p>401 — unauthorized</p></body></html>`);
  }

  const db = getDb();
  const total    = db.prepare('SELECT COUNT(*) as n FROM waitlist').get().n;
  const today    = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE date(created_at,'unixepoch') = date('now')").get().n;
  const thisWeek = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE created_at >= unixepoch('now','-7 days')").get().n;
  const rows     = db.prepare('SELECT name, email, created_at, ip_address FROM waitlist ORDER BY created_at DESC').all();

  let visitsToday = 0;
  try { visitsToday = db.prepare("SELECT COUNT(*) as n FROM visits WHERE date(timestamp,'unixepoch') = date('now')").get().n; } catch (_) {}

  const convRate = visitsToday > 0 ? ((today / visitsToday) * 100).toFixed(1) : '—';

  const fmt = ts => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const rowsHtml = rows.map(r => `
    <tr>
      <td>${r.name || '<span style="color:rgba(255,255,255,0.25)">—</span>'}</td>
      <td>${r.email}</td>
      <td style="color:rgba(255,255,255,0.4);white-space:nowrap">${fmt(r.created_at)}</td>
      <td style="color:rgba(255,255,255,0.3);font-size:12px;font-family:monospace">${r.ip_address || '—'}</td>
    </tr>`).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waitlist Admin — ConstructionBear.AI</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0A0A0F; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; padding: 48px 32px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 16px; }
    .visit-bar { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 32px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 16px; display: inline-flex; gap: 24px; }
    .visit-bar span { color: #fff; font-weight: 500; }
    .stats { display: flex; gap: 24px; margin-bottom: 48px; flex-wrap: wrap; }
    .stat { background: #111116; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 24px 32px; text-align: center; }
    .stat .num { font-size: 52px; font-weight: 700; letter-spacing: -2px; color: #0A84FF; line-height: 1; }
    .stat .lbl { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
    td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .empty { color: rgba(255,255,255,0.3); font-size: 14px; padding: 24px 0; }
  </style>
</head>
<body>
  <h1>🐻 Waitlist Admin</h1>
  <p class="subtitle">ConstructionBear.AI — early access signups</p>
  <div class="visit-bar">Site visits today: <span>${visitsToday}</span>&nbsp;·&nbsp;Conversion rate: <span>${convRate}${convRate !== '—' ? '%' : ''}</span></div>
  <div class="stats">
    <div class="stat"><div class="num">${total}</div><div class="lbl">Total signups</div></div>
    <div class="stat"><div class="num">${today}</div><div class="lbl">Today</div></div>
    <div class="stat"><div class="num">${thisWeek}</div><div class="lbl">This week</div></div>
  </div>
  <table>
    <thead><tr><th>Name</th><th>Email</th><th>Date</th><th>IP</th></tr></thead>
    <tbody>${rowsHtml || '<tr><td class="empty" colspan="4">No signups yet.</td></tr>'}</tbody>
  </table>
</body>
</html>`);
});

// GET /api/waitlist/stats (BEAR_API_KEY)
router.get('/stats', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  if (!process.env.BEAR_API_KEY || key !== process.env.BEAR_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  const db = getDb();
  const total    = db.prepare('SELECT COUNT(*) as n FROM waitlist').get().n;
  const today    = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE date(created_at,'unixepoch') = date('now')").get().n;
  const thisWeek = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE created_at >= unixepoch('now','-7 days')").get().n;
  res.json({ total_signups: total, signups_today: today, signups_this_week: thisWeek });
});

// GET /api/waitlist/csv (BEAR_API_KEY)
router.get('/csv', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  if (!process.env.BEAR_API_KEY || key !== process.env.BEAR_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  const db = getDb();
  const rows = db.prepare('SELECT name, email, created_at FROM waitlist ORDER BY created_at DESC').all();
  const fmt = ts => new Date(ts * 1000).toISOString();
  const csv = ['name,email,signed_up', ...rows.map(r => `"${(r.name||'').replace(/"/g,'""')}",${r.email},${fmt(r.created_at)}`)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
  res.send(csv);
});

export default router;
