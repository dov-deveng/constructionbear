import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

// GET /contacts
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { project_id, search, limit = 100, offset = 0 } = req.query;

  let sql = 'SELECT * FROM contacts WHERE user_id = ?';
  const params = [req.userId];

  if (project_id) { sql += ' AND project_id = ?'; params.push(project_id); }
  if (search) {
    sql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const contacts = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM contacts WHERE user_id = ?').get(req.userId).n;

  res.json({ contacts, total });
});

// GET /contacts/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

// POST /contacts
router.post('/', requireAuth, (req, res) => {
  const { name, company, role, email, phone, address, project_id, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Contact name required' });

  const db = getDb();

  // Validate project belongs to user if provided
  if (project_id) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(project_id, req.userId);
    if (!project) return res.status(400).json({ error: 'Invalid project' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO contacts (id, user_id, name, company, role, email, phone, address, project_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, name, company || null, role || null, email || null,
    phone || null, address || null, project_id || null, notes || null);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.status(201).json(contact);
});

// PUT /contacts/:id
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const fields = ['name', 'company', 'role', 'email', 'phone', 'address', 'project_id', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (Object.keys(updates).length === 0) return res.json({ success: true });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE contacts SET ${setClause}, updated_at = unixepoch() WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /contacts/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
