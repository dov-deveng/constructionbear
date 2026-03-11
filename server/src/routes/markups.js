import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router({ mergeParams: true });

// GET /documents/:docId/markups
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { docId } = req.params;

  // Verify doc belongs to user's company
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND company_id = ?').get(docId, req.companyId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const markups = db.prepare(`
    SELECT m.*, u.email as author_email
    FROM markups m
    JOIN users u ON u.id = m.user_id
    WHERE m.document_id = ?
    ORDER BY m.created_at ASC
  `).all(docId);

  res.json({ markups });
});

// POST /documents/:docId/markups
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const { docId } = req.params;
  const { type = 'note', content, field_ref } = req.body;

  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  if (!['note', 'flag', 'highlight'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND company_id = ?').get(docId, req.companyId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO markups (id, document_id, company_id, user_id, type, field_ref, content)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, docId, req.companyId, req.userId, type, field_ref || null, content.trim());

  const markup = db.prepare(`
    SELECT m.*, u.email as author_email
    FROM markups m JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(id);

  res.status(201).json(markup);
});

// DELETE /documents/:docId/markups/:markupId
router.delete('/:markupId', requireAuth, (req, res) => {
  const db = getDb();
  const { docId, markupId } = req.params;

  const markup = db.prepare('SELECT id, user_id FROM markups WHERE id = ? AND document_id = ?').get(markupId, docId);
  if (!markup) return res.status(404).json({ error: 'Markup not found' });

  // Only creator or admin can delete
  if (markup.user_id !== req.userId && !req.isAdmin) {
    return res.status(403).json({ error: 'Not authorized to delete this markup' });
  }

  db.prepare('DELETE FROM markups WHERE id = ?').run(markupId);
  res.json({ success: true });
});

export default router;
