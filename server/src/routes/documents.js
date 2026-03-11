import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(process.cwd(), 'data/uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOADS_DIR, req.userId);
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${uuidv4()}${ext}`);
  },
});
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are accepted'));
  },
});

const router = Router();

const VALID_TYPES = [
  'rfi', 'change_order', 'submittal', 'lien_waiver', 'pay_app',
  'meeting_minutes', 'notice_to_owner', 'subcontract',
  'daily_report', 'punch_list', 'invoice',
  'transmittal', 'schedule_of_values', 'notice_to_proceed',
  'substantial_completion', 'warranty_letter', 'substitution_request',
  'closeout_checklist', 'certified_payroll',
  // Task 4 additions
  'ccd', 'rfp', 'change_order_log', 'submittal_log', 'rfi_log',
  'coi', 'visitor_waiver', 'notice_to_neighbors', 'parking_pass',
  'upload', 'other',
];

const TYPE_ALIASES = {
  'rfi': 'rfi', 'request for information': 'rfi',
  'change_order': 'change_order', 'change order': 'change_order', 'co': 'change_order',
  'submittal': 'submittal',
  'lien_waiver': 'lien_waiver', 'lien waiver': 'lien_waiver',
  'pay_app': 'pay_app', 'pay app': 'pay_app', 'pay application': 'pay_app', 'aia': 'pay_app',
  'meeting_minutes': 'meeting_minutes', 'meeting minutes': 'meeting_minutes', 'minutes': 'meeting_minutes',
  'notice_to_owner': 'notice_to_owner', 'notice to owner': 'notice_to_owner', 'nto': 'notice_to_owner',
  'subcontract': 'subcontract', 'subcontract agreement': 'subcontract',
  'daily_report': 'daily_report', 'daily report': 'daily_report', 'field report': 'daily_report', 'daily field report': 'daily_report',
  'punch_list': 'punch_list', 'punch list': 'punch_list', 'punchlist': 'punch_list',
  'invoice': 'invoice', 'bill': 'invoice',
  'transmittal': 'transmittal',
  'schedule_of_values': 'schedule_of_values', 'schedule of values': 'schedule_of_values', 'sov': 'schedule_of_values',
  'notice_to_proceed': 'notice_to_proceed', 'notice to proceed': 'notice_to_proceed', 'ntp': 'notice_to_proceed',
  'substantial_completion': 'substantial_completion', 'substantial completion': 'substantial_completion',
  'warranty_letter': 'warranty_letter', 'warranty letter': 'warranty_letter', 'warranty': 'warranty_letter',
  'substitution_request': 'substitution_request', 'substitution request': 'substitution_request',
  'closeout_checklist': 'closeout_checklist', 'closeout checklist': 'closeout_checklist', 'close-out checklist': 'closeout_checklist',
  'certified_payroll': 'certified_payroll', 'certified payroll': 'certified_payroll', 'davis-bacon': 'certified_payroll',
  // Task 4 additions
  'ccd': 'ccd', 'construction change directive': 'ccd', 'change directive': 'ccd',
  'rfp': 'rfp', 'request for proposal': 'rfp',
  'change_order_log': 'change_order_log', 'change order log': 'change_order_log', 'co log': 'change_order_log',
  'submittal_log': 'submittal_log', 'submittal log': 'submittal_log',
  'rfi_log': 'rfi_log', 'rfi log': 'rfi_log',
  'coi': 'coi', 'certificate of insurance': 'coi',
  'visitor_waiver': 'visitor_waiver', "visitor's waiver": 'visitor_waiver', 'visitor waiver': 'visitor_waiver',
  'notice_to_neighbors': 'notice_to_neighbors', 'notice to neighbors': 'notice_to_neighbors', 'neighbor notice': 'notice_to_neighbors',
  'parking_pass': 'parking_pass', 'parking pass': 'parking_pass',
  'other': 'other',
};

function normalizeType(t) {
  if (!t) return 'other';
  const lower = t.toLowerCase().trim();
  return TYPE_ALIASES[lower] || (VALID_TYPES.includes(lower) ? lower : 'other');
}

// GET /documents — list with filters
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { type, status, project, search, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM documents WHERE company_id = ?';
  const params = [req.companyId];

  if (type && type !== 'all') { sql += ' AND type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (project) { sql += ' AND project_name LIKE ?'; params.push(`%${project}%`); }
  if (search) { sql += ' AND (title LIKE ? OR project_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const docs = db.prepare(sql).all(...params);
  const count = db.prepare('SELECT COUNT(*) as n FROM documents WHERE company_id = ?').get(req.companyId).n;

  // Parse content_json for each doc
  const parsed = docs.map(d => ({ ...d, content: JSON.parse(d.content_json), content_json: undefined }));
  res.json({ documents: parsed, total: count });
});

// GET /documents/stats/summary — must be before /:id
router.get('/stats/summary', requireAuth, (req, res) => {
  const db = getDb();
  const byType = db.prepare(`
    SELECT type, COUNT(*) as count FROM documents WHERE company_id = ? GROUP BY type
  `).all(req.companyId);
  const total = db.prepare('SELECT COUNT(*) as n FROM documents WHERE company_id = ?').get(req.companyId).n;
  const recent = db.prepare('SELECT * FROM documents WHERE company_id = ? ORDER BY created_at DESC LIMIT 5').all(req.companyId);

  res.json({
    total,
    by_type: byType,
    recent: recent.map(d => ({ ...d, content: JSON.parse(d.content_json), content_json: undefined })),
  });
});

// POST /documents/upload — PDF file upload
router.post('/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const db = getDb();
    const { title, project_name, project_id: bodyProjectId } = req.body;

    // Subscription check — skip for admin
    if (!req.isAdmin) {
      const sub = db.prepare('SELECT status FROM subscriptions WHERE user_id = ?').get(req.userId);
      const docCount = db.prepare('SELECT COUNT(*) as n FROM documents WHERE user_id = ?').get(req.userId).n;
      if (docCount >= 1 && (!sub || sub.status !== 'active')) {
        fs.unlink(req.file.path, () => {});
        return res.status(402).json({
          error: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Your first document is free. Subscribe for $19.99/month for unlimited documents.',
        });
      }
    }

    // Auto-link project
    let project_id = bodyProjectId || null;
    if (!project_id && project_name) {
      const proj = db.prepare('SELECT id FROM projects WHERE company_id = ? AND name = ? COLLATE NOCASE LIMIT 1')
        .get(req.companyId, project_name);
      if (proj) project_id = proj.id;
    }

    const id = uuidv4();
    const filePath = `/uploads/${req.userId}/${req.file.filename}`;
    const docTitle = title || req.file.originalname.replace(/\.pdf$/i, '');

    const content = {
      file_path: filePath,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
    };

    db.prepare(`
      INSERT INTO documents (id, user_id, company_id, project_id, type, title, project_name, status, content_json)
      VALUES (?, ?, ?, ?, 'upload', ?, ?, 'final', ?)
    `).run(id, req.userId, req.companyId, project_id, docTitle, project_name || null, JSON.stringify(content));

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    res.status(201).json({ ...doc, content: JSON.parse(doc.content_json), content_json: undefined });
  });
});

// GET /documents/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ ...doc, content: JSON.parse(doc.content_json), content_json: undefined });
});

// POST /documents — create
router.post('/', requireAuth, (req, res) => {
  const { title, project_name, content, status = 'draft' } = req.body;
  const type = normalizeType(req.body.type);
  if (!title || !content) return res.status(400).json({ error: 'type, title, content required' });

  const db = getDb();

  // Check free tier limit — skip for admin
  if (!req.isAdmin) {
    const sub = db.prepare('SELECT status FROM subscriptions WHERE user_id = ?').get(req.userId);
    const docCount = db.prepare('SELECT COUNT(*) as n FROM documents WHERE user_id = ?').get(req.userId).n;
    if (docCount >= 1 && (!sub || sub.status !== 'active')) {
      return res.status(402).json({
        error: 'Subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Your first document is free. Subscribe for $19.99/month for unlimited documents.',
      });
    }
  }

  // Auto-link project_id if a matching project exists by name
  let project_id = req.body.project_id || null;
  if (!project_id && project_name) {
    const proj = db.prepare('SELECT id FROM projects WHERE company_id = ? AND name = ? COLLATE NOCASE LIMIT 1')
      .get(req.companyId, project_name);
    if (proj) project_id = proj.id;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO documents (id, user_id, company_id, project_id, type, title, project_name, status, content_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, req.companyId, project_id, type, title, project_name || null, status, JSON.stringify(content));

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  res.status(201).json({ ...doc, content: JSON.parse(doc.content_json), content_json: undefined });
});

// PUT /documents/:id
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { title, project_name, content, status, project_id } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (project_name !== undefined) updates.project_name = project_name;
  if (content !== undefined) updates.content_json = JSON.stringify(content);
  if (status !== undefined) updates.status = status;
  if (project_id !== undefined) updates.project_id = project_id || null;

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
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
