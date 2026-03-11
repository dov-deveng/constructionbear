import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

// GET /projects
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, search, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM projects WHERE company_id = ? AND deleted_at IS NULL';
  const params = [req.companyId];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const projects = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM projects WHERE company_id = ? AND deleted_at IS NULL').get(req.companyId).n;

  res.json({ projects, total });
});

// GET /projects/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(req.params.id, req.companyId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Get contacts with their project-specific roles from junction table
  const contacts = db.prepare(`
    SELECT c.*, pc.role as project_role
    FROM contacts c
    INNER JOIN project_contacts pc ON pc.contact_id = c.id AND pc.project_id = ?
    WHERE c.company_id = ? AND c.deleted_at IS NULL
    ORDER BY c.name ASC
  `).all(req.params.id, req.companyId);

  const docs = db.prepare('SELECT id, type, title, status, created_at FROM documents WHERE project_id = ? AND company_id = ?').all(req.params.id, req.companyId);

  res.json({ ...project, contacts, documents: docs });
});

// POST /projects
router.post('/', requireAuth, (req, res) => {
  const { name, address, start_date, client_name, client_contact, client_email, client_phone,
          city, state, zip, gc_name, gc_contact, gc_email, gc_phone,
          architect_name, architect_contact, architect_email,
          contract_value, end_date, status = 'active', notes } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });
  if (!address?.trim()) return res.status(400).json({ error: 'Project address required' });
  if (!start_date) return res.status(400).json({ error: 'Project start date required' });

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO projects (id, user_id, company_id, name, client_name, client_contact, client_email, client_phone,
      address, city, state, zip, gc_name, gc_contact, gc_email, gc_phone,
      architect_name, architect_contact, architect_email,
      contract_value, start_date, end_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, req.companyId, name.trim(), client_name || null, client_contact || null,
    client_email || null, client_phone || null, address.trim(), city || null,
    state || null, zip || null, gc_name || null, gc_contact || null,
    gc_email || null, gc_phone || null, architect_name || null,
    architect_contact || null, architect_email || null,
    contract_value || null, start_date, end_date || null, status, notes || null);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

// PUT /projects/:id
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(req.params.id, req.companyId);
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

// DELETE /projects/:id — soft delete
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(req.params.id, req.companyId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.prepare('UPDATE projects SET deleted_at = unixepoch() WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
