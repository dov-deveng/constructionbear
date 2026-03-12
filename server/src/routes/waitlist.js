import { Router } from 'express';
import { getDb } from '../db/schema.js';

const router = Router();

// POST /waitlist — add email to waitlist
router.post('/', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM waitlist WHERE email = ?').get(clean);
  if (existing) {
    return res.status(409).json({ error: "You're already on the list!" });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
  db.prepare('INSERT INTO waitlist (email, ip_address) VALUES (?, ?)').run(clean, ip);

  res.status(201).json({ success: true });
});

// GET /waitlist/stats — protected by BEAR_API_KEY
router.get('/stats', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  if (!process.env.BEAR_API_KEY || key !== process.env.BEAR_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = getDb();
  const total        = db.prepare('SELECT COUNT(*) as n FROM waitlist').get().n;
  const today        = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE date(created_at,'unixepoch') = date('now')").get().n;
  const thisWeek     = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE created_at >= unixepoch('now','-7 days')").get().n;
  res.json({ total_signups: total, signups_today: today, signups_this_week: thisWeek });
});

// GET /waitlist/admin — HTML admin page
router.get('/admin', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  if (!process.env.BEAR_API_KEY || key !== process.env.BEAR_API_KEY) {
    return res.status(401).send(`
      <!DOCTYPE html><html><head><title>401</title>
      <style>body{background:#0A0A0F;color:rgba(255,255,255,0.4);font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style>
      </head><body><p>401 — unauthorized</p></body></html>
    `);
  }

  const db       = getDb();
  const total    = db.prepare('SELECT COUNT(*) as n FROM waitlist').get().n;
  const today    = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE date(created_at,'unixepoch') = date('now')").get().n;
  const thisWeek = db.prepare("SELECT COUNT(*) as n FROM waitlist WHERE created_at >= unixepoch('now','-7 days')").get().n;
  const rows     = db.prepare('SELECT email, created_at FROM waitlist ORDER BY created_at DESC').all();

  const fmt = ts => {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const rowsHtml = rows.map(r => `
    <tr>
      <td>${r.email}</td>
      <td style="color:rgba(255,255,255,0.4);white-space:nowrap">${fmt(r.created_at)}</td>
    </tr>
  `).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waitlist Admin — ConstructionBear.AI</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0A0A0F; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; padding: 48px 32px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 40px; }
    .stats { display: flex; gap: 24px; margin-bottom: 48px; flex-wrap: wrap; }
    .stat { background: #111116; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 24px 32px; text-align: center; }
    .stat .num { font-size: 52px; font-weight: 700; letter-spacing: -2px; color: #0A84FF; line-height: 1; }
    .stat .lbl { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; max-width: 640px; }
    th { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
    td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .empty { color: rgba(255,255,255,0.3); font-size: 14px; padding: 24px 0; }
  </style>
</head>
<body>
  <h1>🐻 Waitlist</h1>
  <p class="subtitle">ConstructionBear.AI — early access signups</p>
  <div class="stats">
    <div class="stat"><div class="num">${total}</div><div class="lbl">Total signups</div></div>
    <div class="stat"><div class="num">${today}</div><div class="lbl">Today</div></div>
    <div class="stat"><div class="num">${thisWeek}</div><div class="lbl">This week</div></div>
  </div>
  <table>
    <thead><tr><th>Email</th><th>Signed up</th></tr></thead>
    <tbody>${rowsHtml || '<tr><td class="empty" colspan="2">No signups yet.</td></tr>'}</tbody>
  </table>
</body>
</html>`);
});

// GET /waitlist/csv — download all emails as CSV
router.get('/csv', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];
  if (!process.env.BEAR_API_KEY || key !== process.env.BEAR_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = getDb();
  const rows = db.prepare('SELECT email, created_at FROM waitlist ORDER BY created_at DESC').all();
  const fmt = ts => new Date(ts * 1000).toISOString();
  const csv = ['email,signed_up', ...rows.map(r => `${r.email},${fmt(r.created_at)}`)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
  res.send(csv);
});

export default router;
