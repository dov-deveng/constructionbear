import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';

const router = Router();

function extractContactFields(fields) {
  if (!fields || typeof fields !== 'object') return {};
  const name = fields.submitted_by || fields.from_name || fields.from_contact_name || fields.contact_name || fields.name || null;
  const email = fields.email || fields.from_email || fields.contact_email || fields.submitted_by_email || null;
  const phone = fields.phone || fields.from_phone || fields.contact_phone || null;
  return { name, email, phone };
}

// POST /leads — capture a guest lead (no auth required)
router.post('/', (req, res) => {
  const { guest_session_id, document_type, collected_fields } = req.body;
  if (!guest_session_id) return res.status(400).json({ error: 'guest_session_id required' });

  const db = getDb();
  const contact = extractContactFields(collected_fields);
  const fieldsJson = collected_fields ? JSON.stringify(collected_fields) : null;

  // Upsert: one lead per guest session
  const existing = db.prepare('SELECT id, name, email, phone FROM leads WHERE guest_session_id = ?').get(guest_session_id);
  if (existing) {
    db.prepare('UPDATE leads SET document_type = ?, collected_fields = ?, name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?')
      .run(document_type || null, fieldsJson, contact.name, contact.email, contact.phone, existing.id);
    return res.json({ id: existing.id });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO leads (id, guest_session_id, document_type, collected_fields, name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, guest_session_id, document_type || null, fieldsJson, contact.name, contact.email, contact.phone);

  res.status(201).json({ id });
});

// PUT /leads/:id/convert — mark lead converted when guest creates account
router.put('/:id/convert', (req, res) => {
  const { user_id } = req.body;
  const db = getDb();
  db.prepare('UPDATE leads SET converted = 1, converted_user_id = ? WHERE id = ?')
    .run(user_id || null, req.params.id);
  res.json({ success: true });
});

export default router;
