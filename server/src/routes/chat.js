import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';
import { chat, onboardingChat } from '../services/ai.js';

const UPLOADS_DIR = path.join(process.cwd(), 'data/uploads');

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${uuidv4()}${ext}`);
  },
});
const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/webp'];
    if (ok.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, Word, and image files are accepted'));
  },
});

const router = Router();

// POST /chat/upload — upload a file to use as a document base in chat
router.post('/upload', requireAuth, chatUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.userId}/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

// GET /chat/messages — load current (untagged) message history
router.get('/messages', requireAuth, (req, res) => {
  const db = getDb();
  const messages = db.prepare(`
    SELECT id, role, content, metadata, created_at
    FROM chat_messages WHERE user_id = ? AND session_id IS NULL
    ORDER BY created_at ASC
    LIMIT 200
  `).all(req.userId);

  res.json({
    messages: messages.map(m => ({
      ...m,
      metadata: m.metadata ? JSON.parse(m.metadata) : null,
    })),
  });
});

// POST /chat/message — send a message, get Bear's response
router.post('/message', requireAuth, async (req, res) => {
  const { message, attachmentUrl, attachmentFilename } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const db = getDb();

  // Load recent conversation for context — only the active (untagged) session
  const recentMessages = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE user_id = ? AND session_id IS NULL ORDER BY created_at DESC LIMIT 20
  `).all(req.userId).reverse();

  // Save user message
  const userMsgId = uuidv4();
  db.prepare('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)')
    .run(userMsgId, req.userId, 'user', message);

  try {
    const { message: assistantMessage, generatedDoc } = await chat(req.userId, message, recentMessages, req.companyId);

    // If structured doc generated AND all required fields present, auto-save a draft
    let savedDocId = null;
    if (generatedDoc?.isStructured && generatedDoc?.isComplete) {
      savedDocId = uuidv4();
      const content = generatedDoc.content;
      const projectName = content.project_name || content.project || null;

      // Auto-link project if exists in company
      let projectId = null;
      if (projectName && req.companyId) {
        const proj = db.prepare('SELECT id FROM projects WHERE company_id = ? AND name = ? COLLATE NOCASE LIMIT 1')
          .get(req.companyId, projectName);
        if (proj) projectId = proj.id;
      }

      db.prepare(`
        INSERT INTO documents (id, user_id, company_id, project_id, type, title, project_name, status, content_json, template_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
      `).run(
        savedDocId, req.userId, req.companyId || null, projectId,
        generatedDoc.type, generatedDoc.title, projectName,
        JSON.stringify(content), generatedDoc.templateUsed || generatedDoc.type
      );

      // Embed attachment reference if one was uploaded during this chat
      if (attachmentUrl) {
        generatedDoc.content.attachment_url = attachmentUrl;
        if (attachmentFilename) generatedDoc.content.attachment_filename = attachmentFilename;
      }

      generatedDoc.savedDocId = savedDocId;

      // Create a chat session linked to this document
      const sessionId = uuidv4();
      db.prepare(`
        INSERT INTO chat_sessions (id, user_id, company_id, project_id, document_id, document_type, title, project_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sessionId, req.userId, req.companyId || null, projectId, savedDocId,
             generatedDoc.type, generatedDoc.title, projectName);

      // Tag all untagged messages for this user as belonging to this session
      db.prepare(`UPDATE chat_messages SET session_id = ? WHERE user_id = ? AND session_id IS NULL`)
        .run(sessionId, req.userId);

      generatedDoc.sessionId = sessionId;
    }

    // Save assistant message
    const assistantMsgId = uuidv4();
    const metadata = generatedDoc ? JSON.stringify({ generatedDoc }) : null;
    db.prepare('INSERT INTO chat_messages (id, user_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)')
      .run(assistantMsgId, req.userId, 'assistant', assistantMessage, metadata);

    res.json({
      id: assistantMsgId,
      message: assistantMessage,
      generatedDoc: generatedDoc || null,
    });
  } catch (err) {
    console.error('Chat error:', err);
    // Remove failed user message
    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(userMsgId);
    res.status(500).json({ error: 'Failed to get response. Please try again.' });
  }
});

// POST /chat/onboarding — onboarding flow messages
router.post('/onboarding', requireAuth, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

  try {
    // Load company name so Bear doesn't ask for it again
    const db = getDb();
    const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(req.userId);
    let companyName = null;
    if (user?.company_id) {
      const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(user.company_id);
      companyName = company?.name || null;
    }

    const { message, extractedProfile } = await onboardingChat(messages, { companyName });

    if (extractedProfile) {
      // Always use the company name from the companies table (not what Bear extracted)
      if (companyName) extractedProfile.company_name = companyName;

      const fields = ['company_name', 'owner_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'license_number'];
      const updates = {};
      for (const f of fields) {
        if (extractedProfile[f]) updates[f] = extractedProfile[f];
      }
      updates.onboarding_complete = 1;

      const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE profiles SET ${setClause}, updated_at = ? WHERE user_id = ?`)
        .run(...Object.values(updates), Date.now() / 1000 | 0, req.userId);
    }

    res.json({ message, profileComplete: !!extractedProfile });
  } catch (err) {
    console.error('Onboarding chat error:', err);
    res.status(500).json({ error: 'Failed to process. Please try again.' });
  }
});

// GET /chat/sessions — recent 10 sessions, or search all
router.get('/sessions', requireAuth, (req, res) => {
  const db = getDb();
  const { search } = req.query;
  const scopeId = req.companyId || req.userId;
  const scopeCol = req.companyId ? 'company_id' : 'user_id';

  let sessions;
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    sessions = db.prepare(`
      SELECT * FROM chat_sessions
      WHERE ${scopeCol} = ? AND (title LIKE ? OR project_name LIKE ? OR document_type LIKE ?)
      ORDER BY updated_at DESC LIMIT 50
    `).all(scopeId, q, q, q);
  } else {
    sessions = db.prepare(`
      SELECT * FROM chat_sessions WHERE ${scopeCol} = ?
      ORDER BY updated_at DESC LIMIT 10
    `).all(scopeId);
  }

  res.json({ sessions });
});

// GET /chat/sessions/:id — single session with its messages
router.get('/sessions/:id', requireAuth, (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const messages = db.prepare(`
    SELECT id, role, content, metadata, created_at FROM chat_messages
    WHERE session_id = ? ORDER BY created_at ASC
  `).all(req.params.id);

  res.json({
    session,
    messages: messages.map(m => ({ ...m, metadata: m.metadata ? JSON.parse(m.metadata) : null })),
  });
});

// DELETE /chat/history — clear chat history
router.delete('/history', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM chat_memory WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

export default router;
