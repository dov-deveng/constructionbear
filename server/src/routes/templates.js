import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';
import { AIA_TEMPLATES, TEMPLATE_TYPES, getTemplate } from '../data/aia-templates.js';

const router = Router();

// GET /templates — list all available template types
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const companyId = req.companyId;

  // Load any company-level overrides
  const overrides = companyId
    ? db.prepare('SELECT doc_type, template_json FROM doc_templates WHERE company_id = ?').all(companyId)
    : [];
  const overrideMap = Object.fromEntries(overrides.map(o => [o.doc_type, JSON.parse(o.template_json)]));

  const templates = TEMPLATE_TYPES.map(type => {
    const base = AIA_TEMPLATES[type];
    const override = overrideMap[type];
    return {
      type: base.type,
      key: type,
      label: base.label,
      aia_form: base.aia_form || null,
      customized: !!override,
    };
  });

  res.json({ templates });
});

// GET /templates/:type — get a specific template (with company override if exists)
router.get('/:type', requireAuth, (req, res) => {
  const db = getDb();
  const { type } = req.params;
  const { subtype } = req.query;

  const base = getTemplate(type, subtype);
  if (!base) return res.status(404).json({ error: 'Template not found' });

  // Check for company override
  const key = subtype ? `${type}_${subtype}` : type;
  const override = req.companyId
    ? db.prepare('SELECT template_json FROM doc_templates WHERE company_id = ? AND doc_type = ?').get(req.companyId, key)
    : null;

  const template = override ? { ...base, ...JSON.parse(override.template_json), customized: true } : base;
  res.json(template);
});

// PUT /templates/:type — save a company-level template override
router.put('/:type', requireAuth, (req, res) => {
  const db = getDb();
  const { type } = req.params;
  const { subtype } = req.query;

  const key = subtype ? `${type}_${subtype}` : type;
  const base = getTemplate(type, subtype);
  if (!base) return res.status(404).json({ error: 'Template not found' });

  if (!req.companyId) return res.status(400).json({ error: 'No company assigned' });

  const templateJson = JSON.stringify({ ...base, ...req.body, updated_at: Date.now() });

  const existing = db.prepare('SELECT id FROM doc_templates WHERE company_id = ? AND doc_type = ?').get(req.companyId, key);
  if (existing) {
    db.prepare('UPDATE doc_templates SET template_json = ? WHERE id = ?').run(templateJson, existing.id);
  } else {
    db.prepare('INSERT INTO doc_templates (id, user_id, company_id, doc_type, template_json) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), req.userId, req.companyId, key, templateJson);
  }

  res.json({ success: true, type: key });
});

// DELETE /templates/:type — remove company override, revert to system default
router.delete('/:type', requireAuth, (req, res) => {
  const db = getDb();
  const { type } = req.params;
  const { subtype } = req.query;
  const key = subtype ? `${type}_${subtype}` : type;

  if (!req.companyId) return res.status(400).json({ error: 'No company assigned' });
  db.prepare('DELETE FROM doc_templates WHERE company_id = ? AND doc_type = ?').run(req.companyId, key);
  res.json({ success: true });
});

export default router;
