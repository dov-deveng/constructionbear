import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'data/logos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  },
});

// GET /profile
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

// PUT /profile
router.put('/', requireAuth, (req, res) => {
  const db = getDb();
  const fields = ['company_name', 'owner_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'license_number', 'onboarding_complete'];
  const updates = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  if (Object.keys(updates).length === 0) return res.json({ success: true });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), Date.now() / 1000 | 0, req.userId];

  db.prepare(`UPDATE profiles SET ${setClause}, updated_at = ? WHERE user_id = ?`).run(...values);
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  res.json(profile);
});

// POST /profile/logo
router.post('/logo', requireAuth, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const db = getDb();
  const logoPath = `/logos/${req.file.filename}`;
  db.prepare('UPDATE profiles SET logo_path = ?, updated_at = ? WHERE user_id = ?')
    .run(logoPath, Date.now() / 1000 | 0, req.userId);
  res.json({ logo_path: logoPath });
});

// DELETE /profile/logo
router.delete('/logo', requireAuth, (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT logo_path FROM profiles WHERE user_id = ?').get(req.userId);
  if (profile?.logo_path) {
    const fullPath = path.join(process.cwd(), 'data', profile.logo_path);
    fs.unlink(fullPath, () => {});
  }
  db.prepare('UPDATE profiles SET logo_path = NULL WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

export default router;
