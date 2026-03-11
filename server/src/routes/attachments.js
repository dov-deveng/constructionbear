import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router({ mergeParams: true }); // gets :docId from parent

const UPLOADS_DIR = path.join(process.cwd(), 'data/uploads');

const attachStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.userId, 'attachments');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const attachUpload = multer({
  storage: attachStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (ok.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files accepted'));
  },
});

// GET /documents/:docId/attachments
router.get('/', requireAuth, (req, res) => {
  const { docId } = req.params;
  const db = getDb();
  // Verify user owns this doc
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND (user_id = ? OR company_id = ?)').get(docId, req.userId, req.companyId || '');
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const attachments = db.prepare(`
    SELECT id, document_id, file_path, original_filename, caption_label, page_order, created_at
    FROM document_attachments WHERE document_id = ? ORDER BY page_order ASC, created_at ASC
  `).all(docId);

  res.json({ attachments });
});

// POST /documents/:docId/attachments — upload one or more images
router.post('/', requireAuth, attachUpload.array('images', 20), async (req, res) => {
  const { docId } = req.params;
  if (!req.files?.length) return res.status(400).json({ error: 'No images uploaded' });

  const db = getDb();
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND (user_id = ? OR company_id = ?)').get(docId, req.userId, req.companyId || '');
  if (!doc) {
    // Clean up uploaded files
    for (const f of req.files) fs.unlinkSync(f.path).catch?.(() => {});
    return res.status(404).json({ error: 'Document not found' });
  }

  // Get current max page_order to append
  const maxOrder = db.prepare('SELECT MAX(page_order) as m FROM document_attachments WHERE document_id = ?').get(docId)?.m ?? -1;

  const captions = Array.isArray(req.body.captions) ? req.body.captions : [];
  const saved = [];

  for (let i = 0; i < req.files.length; i++) {
    const f = req.files[i];
    const id = uuidv4();
    const relPath = `/uploads/${req.userId}/attachments/${path.basename(f.path)}`;
    const caption = captions[i] || '';
    const order = maxOrder + 1 + i;

    db.prepare(`
      INSERT INTO document_attachments (id, document_id, user_id, company_id, file_path, original_filename, caption_label, page_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, docId, req.userId, req.companyId || null, relPath, f.originalname, caption, order);

    saved.push({ id, file_path: relPath, original_filename: f.originalname, caption_label: caption, page_order: order });
  }

  res.json({ attachments: saved });
});

// GET /documents/:docId/attachments/:id/file — serve the image file
router.get('/:id/file', requireAuth, (req, res) => {
  const { docId, id } = req.params;
  const db = getDb();
  const att = db.prepare('SELECT * FROM document_attachments WHERE id = ? AND document_id = ?').get(id, docId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });
  // Verify user has access to the document
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND (user_id = ? OR company_id = ?)').get(docId, req.userId, req.companyId || '');
  if (!doc) return res.status(403).json({ error: 'Access denied' });

  const diskPath = path.join(process.cwd(), 'data', att.file_path.replace(/^\/uploads\//, 'uploads/'));
  if (!fs.existsSync(diskPath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(diskPath);
});

// PATCH /documents/:docId/attachments/:id — update caption or order
router.patch('/:id', requireAuth, (req, res) => {
  const { docId, id } = req.params;
  const { caption_label, page_order } = req.body;
  const db = getDb();

  const att = db.prepare('SELECT * FROM document_attachments WHERE id = ? AND document_id = ? AND user_id = ?').get(id, docId, req.userId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  if (caption_label !== undefined) db.prepare('UPDATE document_attachments SET caption_label = ? WHERE id = ?').run(caption_label, id);
  if (page_order !== undefined) db.prepare('UPDATE document_attachments SET page_order = ? WHERE id = ?').run(page_order, id);

  res.json({ success: true });
});

// DELETE /documents/:docId/attachments/:id
router.delete('/:id', requireAuth, (req, res) => {
  const { docId, id } = req.params;
  const db = getDb();

  const att = db.prepare('SELECT * FROM document_attachments WHERE id = ? AND document_id = ? AND user_id = ?').get(id, docId, req.userId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  // Delete file from disk
  const diskPath = path.join(process.cwd(), 'data', att.file_path.replace(/^\/uploads\//, 'uploads/'));
  try { fs.unlinkSync(diskPath); } catch { /* file may already be gone */ }

  db.prepare('DELETE FROM document_attachments WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
