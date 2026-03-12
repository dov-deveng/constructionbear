import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';
import { chat, onboardingChat } from '../services/ai.js';
import { assignDocNumber } from '../services/docNumber.js';

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

// Extract contact fields from full conversation text (user messages only)
function extractGuestFields(history, latestMessage) {
  const allText = [...history.filter(m => m.role === 'user').map(m => m.content), latestMessage].join('\n');
  const fields = {};

  const emailMatch = allText.match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  if (emailMatch) fields.email = emailMatch[0];

  const phoneMatch = allText.match(/\b(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/);
  if (phoneMatch) fields.phone = phoneMatch[0];

  // Company/name: look for "my company is X", "company name is X", "I'm with X"
  const compMatch = allText.match(/(?:company(?:\s+name)?(?:\s+is)?|I(?:'m|\s+am)\s+with|from)\s+([A-Z][^,.\n]{2,40})/i);
  if (compMatch) fields.company_name = compMatch[1].trim();

  // Name: look for "my name is X", "I'm X", "contact is X"
  const nameMatch = allText.match(/(?:my name is|I(?:'m|\s+am)|contact(?:\s+is)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  if (nameMatch) fields.contact_name = nameMatch[1].trim();

  return Object.keys(fields).length > 0 ? fields : null;
}

// POST /chat/guest — unauthenticated chat for guest users (no DB persistence)
router.post('/guest', async (req, res) => {
  const { message, messages: history = [], guest_session_id } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
  try {
    const { message: assistantMessage, generatedDoc } = await chat(null, message.trim(), history, null);

    // Extract and persist any contact fields collected so far
    if (guest_session_id) {
      const extracted = extractGuestFields(history, message.trim());
      if (extracted) {
        const db = getDb();
        const existing = db.prepare('SELECT id, collected_fields FROM leads WHERE guest_session_id = ?').get(guest_session_id);
        if (existing) {
          const current = existing.collected_fields ? JSON.parse(existing.collected_fields) : {};
          const merged = { ...current, ...extracted };
          db.prepare('UPDATE leads SET collected_fields = ? WHERE id = ?')
            .run(JSON.stringify(merged), existing.id);
        }
        // If no lead row yet, it will be created by the /leads POST when doc is generated
      }
    }

    res.json({ id: uuidv4(), message: assistantMessage, generatedDoc: generatedDoc || null });
  } catch (err) {
    console.error('Guest chat error:', err);
    res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

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

// POST /chat/sessions/checkpoint — save current untagged messages as an in_progress session
// Called by client before startNewChat() when there are untagged messages in the current chat
router.post('/sessions/checkpoint', requireAuth, (req, res) => {
  const db = getDb();
  const { partial_doc_type } = req.body;

  // Check if there are untagged messages to checkpoint
  const untagged = db.prepare(`
    SELECT COUNT(*) as n FROM chat_messages WHERE user_id = ? AND session_id IS NULL
  `).get(req.userId);

  if (!untagged.n) return res.json({ saved: false });

  // Don't create a duplicate if there's already an in_progress session with no messages
  const sessionId = uuidv4();
  db.prepare(`
    INSERT INTO chat_sessions (id, user_id, company_id, status, partial_doc_type, title)
    VALUES (?, ?, ?, 'in_progress', ?, 'In Progress')
  `).run(sessionId, req.userId, req.companyId || null, partial_doc_type || null);

  db.prepare(`UPDATE chat_messages SET session_id = ? WHERE user_id = ? AND session_id IS NULL`)
    .run(sessionId, req.userId);

  res.json({ saved: true, sessionId });
});

// DELETE /chat/sessions/:id — delete an in_progress session and its messages
router.delete('/sessions/:id', requireAuth, (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status === 'completed') return res.status(400).json({ error: 'Cannot delete completed sessions' });

  db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(req.params.id);
  db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /chat/message — send a message, get Bear's response
router.post('/message', requireAuth, async (req, res) => {
  const { message, attachmentUrl, attachmentFilename, session_id: resumedSessionId } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const db = getDb();

  // Load recent conversation context
  // If resuming an in_progress session, load from that session; otherwise load untagged
  const recentMessages = resumedSessionId
    ? db.prepare(`SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 20`).all(resumedSessionId).reverse()
    : db.prepare(`SELECT role, content FROM chat_messages WHERE user_id = ? AND session_id IS NULL ORDER BY created_at DESC LIMIT 20`).all(req.userId).reverse();

  // Save user message (tagged to resumed session or untagged)
  const userMsgId = uuidv4();
  if (resumedSessionId) {
    db.prepare('INSERT INTO chat_messages (id, user_id, role, content, session_id) VALUES (?, ?, ?, ?, ?)')
      .run(userMsgId, req.userId, 'user', message, resumedSessionId);
  } else {
    db.prepare('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)')
      .run(userMsgId, req.userId, 'user', message);
  }

  try {
    const { message: assistantMessage, generatedDoc } = await chat(req.userId, message, recentMessages, req.companyId);

    // If structured doc generated AND all required fields present, auto-save a draft
    let savedDocId = null;
    let paywallRequired = false;
    if (generatedDoc?.isStructured && generatedDoc?.isComplete) {
      // Free plan: allow exactly 1 document total per company
      const company = req.companyId ? db.prepare('SELECT plan FROM companies WHERE id = ?').get(req.companyId) : null;
      const plan = company?.plan || 'free';
      if (plan === 'free' && !req.isAdmin && !req.isTestAccount) {
        const scopeId = req.companyId || req.userId;
        const scopeCol = req.companyId ? 'company_id' : 'user_id';
        const docCount = db.prepare(`SELECT COUNT(*) as n FROM documents WHERE ${scopeCol} = ?`).get(scopeId).n;
        if (docCount >= 2) {
          paywallRequired = true;
        }
      }

      if (!paywallRequired) {
      savedDocId = uuidv4();
      const content = generatedDoc.content;
      const projectName = content.project_name || content.project || null;

      // Auto-link or auto-create project
      let projectId = null;
      if (projectName && req.companyId) {
        const proj = db.prepare('SELECT id FROM projects WHERE company_id = ? AND name = ? COLLATE NOCASE AND deleted_at IS NULL LIMIT 1')
          .get(req.companyId, projectName);
        if (proj) {
          projectId = proj.id;
        } else {
          // Create the project automatically from chat context
          projectId = uuidv4();
          db.prepare(`
            INSERT INTO projects (id, user_id, company_id, name, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'active', unixepoch(), unixepoch())
          `).run(projectId, req.userId, req.companyId, projectName);
        }
      }

      // Assign atomic document number
      const docNumber = assignDocNumber(projectId, projectName, generatedDoc.type);
      if (docNumber) content.doc_number = docNumber;

      db.prepare(`
        INSERT INTO documents (id, user_id, company_id, project_id, type, title, project_name, status, content_json, template_used, doc_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
      `).run(
        savedDocId, req.userId, req.companyId || null, projectId,
        generatedDoc.type, generatedDoc.title, projectName,
        JSON.stringify(content), generatedDoc.templateUsed || generatedDoc.type, docNumber || null
      );

      // Embed attachment reference if one was uploaded during this chat
      if (attachmentUrl) {
        generatedDoc.content.attachment_url = attachmentUrl;
        if (attachmentFilename) generatedDoc.content.attachment_filename = attachmentFilename;
      }

      generatedDoc.savedDocId = savedDocId;

      // Create or update a chat session linked to this document
      let sessionId;
      if (resumedSessionId) {
        // Update the existing in_progress session to completed
        sessionId = resumedSessionId;
        db.prepare(`
          UPDATE chat_sessions SET status = 'completed', document_id = ?, document_type = ?,
            title = ?, project_name = ?, project_id = ?, updated_at = unixepoch()
          WHERE id = ?
        `).run(savedDocId, generatedDoc.type, generatedDoc.title, projectName, projectId, sessionId);
      } else {
        sessionId = uuidv4();
        db.prepare(`
          INSERT INTO chat_sessions (id, user_id, company_id, project_id, document_id, document_type, title, project_name, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `).run(sessionId, req.userId, req.companyId || null, projectId, savedDocId,
               generatedDoc.type, generatedDoc.title, projectName);

        // Tag all untagged messages for this user as belonging to this session
        db.prepare(`UPDATE chat_messages SET session_id = ? WHERE user_id = ? AND session_id IS NULL`)
          .run(sessionId, req.userId);
      }

      generatedDoc.sessionId = sessionId;
      } // end !paywallRequired
    }

    // Save assistant message (tagged to resumed session or untagged)
    const assistantMsgId = uuidv4();
    const metadata = generatedDoc ? JSON.stringify({ generatedDoc }) : null;
    if (resumedSessionId) {
      db.prepare('INSERT INTO chat_messages (id, user_id, role, content, metadata, session_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(assistantMsgId, req.userId, 'assistant', assistantMessage, metadata, resumedSessionId);
      // Touch updated_at on the session
      db.prepare('UPDATE chat_sessions SET updated_at = unixepoch() WHERE id = ?').run(resumedSessionId);
    } else {
      db.prepare('INSERT INTO chat_messages (id, user_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(assistantMsgId, req.userId, 'assistant', assistantMessage, metadata);
    }

    res.json({
      id: assistantMsgId,
      message: assistantMessage,
      generatedDoc: generatedDoc || null,
      paywallRequired: paywallRequired || false,
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

// GET /chat/sessions — returns { inProgressSessions, sessions }
// inProgressSessions: all in_progress for this user (most recent first)
// sessions: recent 10 completed, or search all completed
router.get('/sessions', requireAuth, (req, res) => {
  const db = getDb();
  const { search } = req.query;
  const scopeId = req.companyId || req.userId;
  const scopeCol = req.companyId ? 'company_id' : 'user_id';

  // Always load all in_progress sessions (no limit)
  const inProgressSessions = db.prepare(`
    SELECT * FROM chat_sessions WHERE ${scopeCol} = ? AND (status = 'in_progress' OR status IS NULL AND document_id IS NULL)
    ORDER BY updated_at DESC
  `).all(scopeId);

  let sessions;
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    sessions = db.prepare(`
      SELECT * FROM chat_sessions
      WHERE ${scopeCol} = ? AND status = 'completed'
        AND (title LIKE ? OR project_name LIKE ? OR document_type LIKE ?)
      ORDER BY updated_at DESC LIMIT 50
    `).all(scopeId, q, q, q);
  } else {
    sessions = db.prepare(`
      SELECT * FROM chat_sessions WHERE ${scopeCol} = ? AND status = 'completed'
      ORDER BY updated_at DESC LIMIT 10
    `).all(scopeId);
  }

  res.json({ sessions, inProgressSessions });
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
