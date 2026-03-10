import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

// GET /projects
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, search, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM projects WHERE user_id = ?';
  const params = [req.userId];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const projects = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM projects WHERE user_id = ?').get(req.userId).n;

  res.json({ projects, total });
});

// GET /projects/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const contacts = db.prepare('SELECT * FROM contacts WHERE project_id = ? AND user_id = ?').all(req.params.id, req.userId);
  const docs = db.prepare('SELECT id, type, title, status, created_at FROM documents WHERE project_id = ? AND user_id = ?').all(req.params.id, req.userId);

  res.json({ ...project, contacts, documents: docs });
});

// POST /projects
router.post('/', requireAuth, (req, res) => {
  const { name, client_name, client_contact, client_email, client_phone,
          address, city, state, zip, gc_name, gc_contact, gc_email, gc_phone,
          architect_name, architect_contact, architect_email,
          contract_value, start_date, end_date, status = 'active', notes } = req.body;

  if (!name) return res.status(400).json({ error: 'Project name required' });

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO projects (id, user_id, name, client_name, client_contact, client_email, client_phone,
      address, city, state, zip, gc_name, gc_contact, gc_email, gc_phone,
      architect_name, architect_contact, architect_email,
      contract_value, start_date, end_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, name, client_name || null, client_contact || null,
    client_email || null, client_phone || null, address || null, city || null,
    state || null, zip || null, gc_name || null, gc_contact || null,
    gc_email || null, gc_phone || null, architect_name || null,
    architect_contact || null, architect_email || null,
    contract_value || null, start_date || null, end_date || null, status, notes || null);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

// PUT /projects/:id
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const fields = ['name', 'client_name', 'client_contact', 'client_email', 'client_phone',
    'address', 'city', 'state', 'zip', 'gc_name', 'gc_contact', 'gc_email', 'gc_phone',
    'architect_name', 'architect_contact', 'architect_email',
    'contract_value', 'start_date', 'end_date', 'status', 'notes'];

  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (Object.keys(updates).length === 0) return res.json({ success: true });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE projects SET ${setClause}, updated_at = unixepoch() WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /projects/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
