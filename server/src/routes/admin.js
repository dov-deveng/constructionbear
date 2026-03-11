import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

// All admin routes require auth + admin flag
router.use(requireAuth, requireAdmin);

// GET /admin/stats — overall platform snapshot
router.get('/stats', (req, res) => {
  const db = getDb();

  const totalUsers = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const activeSubscriptions = db.prepare("SELECT COUNT(*) as n FROM subscriptions WHERE status = 'active'").get().n;
  const totalDocuments = db.prepare('SELECT COUNT(*) as n FROM documents').get().n;
  const totalProjects = db.prepare('SELECT COUNT(*) as n FROM projects').get().n;
  const totalContacts = db.prepare('SELECT COUNT(*) as n FROM contacts').get().n;
  const totalMessages = db.prepare('SELECT COUNT(*) as n FROM chat_messages').get().n;

  // New users last 7 days
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const newUsersWeek = db.prepare('SELECT COUNT(*) as n FROM users WHERE created_at >= ?').get(sevenDaysAgo).n;

  // Docs by type
  const docsByType = db.prepare('SELECT type, COUNT(*) as count FROM documents GROUP BY type ORDER BY count DESC').all();

  res.json({
    totalUsers,
    activeSubscriptions,
    freeUsers: totalUsers - activeSubscriptions,
    newUsersWeek,
    totalDocuments,
    totalProjects,
    totalContacts,
    totalMessages,
    docsByType,
  });
});

// GET /admin/users — paginated user list with usage stats
router.get('/users', (req, res) => {
  const db = getDb();
  const { limit = 50, offset = 0, search } = req.query;

  let whereClause = '';
  const params = [];
  if (search) {
    whereClause = 'WHERE u.email LIKE ? OR p.company_name LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  const users = db.prepare(`
    SELECT
      u.id,
      u.email,
      u.email_verified,
      u.is_admin,
      u.created_at,
      u.last_active,
      p.company_name,
      p.owner_name,
      p.onboarding_complete,
      s.status as subscription_status,
      s.current_period_end,
      (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as doc_count,
      (SELECT COUNT(*) FROM projects WHERE user_id = u.id) as project_count,
      (SELECT COUNT(*) FROM contacts WHERE user_id = u.id) as contact_count,
      (SELECT COUNT(*) FROM chat_messages WHERE user_id = u.id) as message_count
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  const total = db.prepare(`SELECT COUNT(*) as n FROM users u LEFT JOIN profiles p ON p.user_id = u.id ${whereClause}`).get(...params).n;

  res.json({ users, total });
});

// GET /admin/users/:id — single user detail
router.get('/users/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const user = db.prepare(`
    SELECT u.*, p.company_name, p.owner_name, p.phone, p.address, p.city, p.state, p.license_number, p.onboarding_complete,
           s.status as subscription_status, s.stripe_customer_id, s.current_period_end
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.id = ?
  `).get(id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const docs = db.prepare('SELECT id, type, title, project_name, status, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(id);
  const projects = db.prepare('SELECT id, name, status, client_name, created_at FROM projects WHERE user_id = ? ORDER BY created_at DESC').all(id);
  const recentMessages = db.prepare('SELECT role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(id);

  res.json({
    ...user,
    password_hash: undefined,
    reset_token: undefined,
    is_admin: !!user.is_admin,
    docs,
    projects,
    recentMessages,
  });
});

// POST /admin/users/:id/grant-admin — promote a user
router.post('/users/:id/grant-admin', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /admin/users/:id/revoke-admin
router.post('/users/:id/revoke-admin', (req, res) => {
  const db = getDb();
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot revoke your own admin' });
  db.prepare('UPDATE users SET is_admin = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /admin/users/:id/grant-subscription — manually grant active sub (for testing/comps)
router.post('/users/:id/grant-subscription', (req, res) => {
  const db = getDb();
  const { months = 12 } = req.body;
  const periodEnd = Math.floor(Date.now() / 1000) + months * 30 * 24 * 60 * 60;

  const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(req.params.id);
  if (existing) {
    db.prepare("UPDATE subscriptions SET status = 'active', current_period_end = ? WHERE user_id = ?")
      .run(periodEnd, req.params.id);
  } else {
    db.prepare("INSERT INTO subscriptions (id, user_id, status, current_period_end) VALUES (?, ?, 'active', ?)")
      .run(uuidv4(), req.params.id, periodEnd);
  }
  res.json({ success: true, period_end: periodEnd });
});

export default router;
