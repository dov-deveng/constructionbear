import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';
import { chat, onboardingChat } from '../services/ai.js';

const router = Router();

// GET /chat/messages — load full message history
router.get('/messages', requireAuth, (req, res) => {
  const db = getDb();
  const messages = db.prepare(`
    SELECT id, role, content, metadata, created_at
    FROM chat_messages WHERE user_id = ?
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
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const db = getDb();

  // Load recent conversation for context (last 20 messages)
  const recentMessages = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.userId).reverse();

  // Save user message
  const userMsgId = uuidv4();
  db.prepare('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)')
    .run(userMsgId, req.userId, 'user', message);

  try {
    const { message: assistantMessage, generatedDoc } = await chat(req.userId, message, recentMessages);

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
    const { message, extractedProfile } = await onboardingChat(messages);

    if (extractedProfile) {
      const db = getDb();
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

// DELETE /chat/history — clear chat history
router.delete('/history', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM chat_memory WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

export default router;
