import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

const VALID_TYPES = ['rfi', 'change_order', 'submittal', 'lien_waiver', 'pay_app', 'meeting_minutes', 'notice_to_owner', 'subcontract', 'other'];

// GET /documents — list with filters
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { type, status, project, search, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM documents WHERE user_id = ?';
  const params = [req.userId];

  if (type && type !== 'all') { sql += ' AND type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (project) { sql += ' AND project_name LIKE ?'; params.push(`%${project}%`); }
  if (search) { sql += ' AND (title LIKE ? OR project_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const docs = db.prepare(sql).all(...params);
  const count = db.prepare('SELECT COUNT(*) as n FROM documents WHERE user_id = ?').get(req.userId).n;

  // Parse content_json for each doc
  const parsed = docs.map(d => ({ ...d, content: JSON.parse(d.content_json), content_json: undefined }));
  res.json({ documents: parsed, total: count });
});

// GET /documents/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ ...doc, content: JSON.parse(doc.content_json), content_json: undefined });
});

// POST /documents — create
router.post('/', requireAuth, (req, res) => {
  const { type, title, project_name, content, status = 'draft' } = req.body;
  if (!type || !title || !content) return res.status(400).json({ error: 'type, title, content required' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid document type' });

  const db = getDb();

  // Check free tier limit (1 doc free, subscription required after)
  const sub = db.prepare('SELECT status FROM subscriptions WHERE user_id = ?').get(req.userId);
  const docCount = db.prepare('SELECT COUNT(*) as n FROM documents WHERE user_id = ?').get(req.userId).n;

  if (docCount >= 1 && (!sub || sub.status !== 'active')) {
    return res.status(402).json({
      error: 'Subscription required',
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Your first document is free. Subscribe for $19.99/month for unlimited documents.',
    });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO documents (id, user_id, type, title, project_name, status, content_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, type, title, project_name || null, status, JSON.stringify(content));

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  res.status(201).json({ ...doc, content: JSON.parse(doc.content_json), content_json: undefined });
});

// PUT /documents/:id
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { title, project_name, content, status } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (project_name !== undefined) updates.project_name = project_name;
  if (content !== undefined) updates.content_json = JSON.stringify(content);
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) return res.json({ success: true });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE documents SET ${setClause}, updated_at = ? WHERE id = ?`)
    .run(...Object.values(updates), Date.now() / 1000 | 0, req.params.id);

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json({ ...updated, content: JSON.parse(updated.content_json), content_json: undefined });
});

// DELETE /documents/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /documents/stats/summary
router.get('/stats/summary', requireAuth, (req, res) => {
  const db = getDb();
  const byType = db.prepare(`
    SELECT type, COUNT(*) as count FROM documents WHERE user_id = ? GROUP BY type
  `).all(req.userId);
  const total = db.prepare('SELECT COUNT(*) as n FROM documents WHERE user_id = ?').get(req.userId).n;
  const recent = db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(req.userId);

  res.json({
    total,
    by_type: byType,
    recent: recent.map(d => ({ ...d, content: JSON.parse(d.content_json), content_json: undefined })),
  });
});

export default router;
