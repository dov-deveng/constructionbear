import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

export const VALID_ROLES = [
  'Owner', 'Developer', 'Architect', 'Engineer', 'General Contractor',
  'Subcontractor', 'Supplier', 'Inspector', 'Property Manager', 'Other',
];

// GET /contacts
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { project_id, search, limit = 100, offset = 0 } = req.query;

  let sql, params;

  if (project_id) {
    sql = `SELECT c.*, pc.role as project_role FROM contacts c
           INNER JOIN project_contacts pc ON pc.contact_id = c.id AND pc.project_id = ?
           WHERE c.company_id = ? AND c.deleted_at IS NULL`;
    params = [project_id, req.companyId];
    if (search) {
      sql += ' AND (c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY c.name ASC LIMIT ? OFFSET ?';
  } else {
    sql = 'SELECT * FROM contacts WHERE company_id = ? AND deleted_at IS NULL';
    params = [req.companyId];
    if (search) {
      sql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  }

  params.push(parseInt(limit), parseInt(offset));

  const contacts = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM contacts WHERE company_id = ? AND deleted_at IS NULL').get(req.companyId).n;

  res.json({ contacts, total });
});

// GET /contacts/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(req.params.id, req.companyId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const projects = db.prepare(`
    SELECT pc.project_id, pc.role, p.name as project_name
    FROM project_contacts pc
    JOIN projects p ON p.id = pc.project_id
    WHERE pc.contact_id = ? AND p.deleted_at IS NULL
  `).all(req.params.id);

  res.json({ ...contact, projects });
});

// POST /contacts
router.post('/', requireAuth, (req, res) => {
  const { name, company, role, email, phone, address, project_id, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Contact name required' });
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const db = getDb();

  if (project_id) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(project_id, req.companyId);
    if (!project) return res.status(400).json({ error: 'Invalid project' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO contacts (id, user_id, company_id, name, company, role, email, phone, address, project_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, req.companyId, name.trim(), company || null, role || null, email || null,
    phone || null, address || null, project_id || null, notes || null);

  if (project_id && role) {
    db.prepare('INSERT OR REPLACE INTO project_contacts (id, project_id, contact_id, company_id, role) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), project_id, id, req.companyId, role);
  }

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
});

// PUT /contacts/:id
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(req.params.id, req.companyId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  if (req.body.role && !VALID_ROLES.includes(req.body.role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const fields = ['name', 'company', 'role', 'email', 'phone', 'address', 'project_id', 'notes'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json({ success: true });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE contacts SET ${setClause}, updated_at = unixepoch() WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (updated.project_id && updated.role) {
    db.prepare('INSERT OR REPLACE INTO project_contacts (id, project_id, contact_id, company_id, role) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), updated.project_id, req.params.id, req.companyId, updated.role);
  }

  res.json(updated);
});

// POST /contacts/:id/projects — assign contact to a project with a specific role
router.post('/:id/projects', requireAuth, (req, res) => {
  const { project_id, role } = req.body;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const db = getDb();
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(req.params.id, req.companyId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(project_id, req.companyId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const existing = db.prepare('SELECT id FROM project_contacts WHERE project_id = ? AND contact_id = ?').get(project_id, req.params.id);
  if (existing) {
    db.prepare('UPDATE project_contacts SET role = ? WHERE project_id = ? AND contact_id = ?').run(role, project_id, req.params.id);
  } else {
    db.prepare('INSERT INTO project_contacts (id, project_id, contact_id, company_id, role) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), project_id, req.params.id, req.companyId, role);
  }

  res.json({ success: true });
});

// DELETE /contacts/:id/projects/:projectId — remove contact from a project
router.delete('/:id/projects/:projectId', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM project_contacts WHERE contact_id = ? AND project_id = ?').run(req.params.id, req.params.projectId);
  res.json({ success: true });
});

// DELETE /contacts/:id — soft delete
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND company_id = ? AND deleted_at IS NULL').get(req.params.id, req.companyId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('UPDATE contacts SET deleted_at = unixepoch() WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
