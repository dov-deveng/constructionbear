import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/schema.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Document type schemas — what fields are needed
export const DOC_SCHEMAS = {
  rfi: {
    label: 'Request for Information (RFI)',
    fields: ['project_name', 'rfi_number', 'date', 'subject', 'question', 'addressed_to', 'submitted_by', 'date_needed'],
    required: ['project_name', 'subject', 'question'],
  },
  change_order: {
    label: 'Change Order',
    fields: ['project_name', 'co_number', 'date', 'description', 'reason', 'cost_change', 'days_added', 'contractor', 'owner'],
    required: ['project_name', 'description', 'cost_change'],
  },
  submittal: {
    label: 'Submittal',
    fields: ['project_name', 'submittal_number', 'spec_section', 'description', 'supplier', 'revision', 'submitted_by', 'date'],
    required: ['project_name', 'spec_section', 'description'],
  },
  lien_waiver: {
    label: 'Lien Waiver',
    fields: ['type', 'claimant', 'owner', 'property_address', 'through_date', 'amount', 'project_name'],
    required: ['claimant', 'property_address', 'through_date', 'amount'],
    subTypes: ['conditional_progress', 'unconditional_progress', 'conditional_final', 'unconditional_final'],
  },
  pay_app: {
    label: 'AIA Pay Application',
    fields: ['project_name', 'application_number', 'period_to', 'contractor', 'owner', 'architect', 'contract_amount', 'work_completed', 'retainage_percent', 'previous_payments'],
    required: ['project_name', 'application_number', 'period_to', 'contract_amount', 'work_completed'],
  },
  meeting_minutes: {
    label: 'Meeting Minutes',
    fields: ['project_name', 'meeting_date', 'location', 'attendees', 'agenda_items', 'action_items', 'next_meeting'],
    required: ['project_name', 'meeting_date', 'attendees', 'agenda_items'],
  },
  notice_to_owner: {
    label: 'Notice to Owner',
    fields: ['owner_name', 'owner_address', 'property_address', 'contractor_name', 'contractor_address', 'lender_name', 'services_description', 'date'],
    required: ['owner_name', 'owner_address', 'property_address', 'contractor_name', 'services_description'],
  },
  subcontract: {
    label: 'Subcontract Agreement',
    fields: ['project_name', 'general_contractor', 'subcontractor', 'scope_of_work', 'contract_value', 'start_date', 'completion_date', 'payment_terms', 'insurance_requirements'],
    required: ['project_name', 'general_contractor', 'subcontractor', 'scope_of_work', 'contract_value'],
  },
};

const SYSTEM_PROMPT = `You are Bear, the AI assistant for ConstructionBear.AI — a platform that helps construction contractors create professional documents instantly.

Your personality: Direct, knowledgeable, efficient. You know construction inside and out. You don't waste words. You're like a seasoned project manager who knows exactly what every document needs.

Your primary job:
1. Detect when the user wants to create a construction document
2. Collect the required information through natural conversation (never a form, never a list of questions — ask one thing at a time, naturally)
3. Generate the document when you have enough information
4. Help users find and manage their existing documents

Document types you handle:
- RFI (Request for Information)
- Change Order
- Submittal
- Lien Waiver (Conditional/Unconditional, Progress/Final)
- AIA Pay Application
- Meeting Minutes
- Notice to Owner
- Subcontract Agreement

Rules:
- Ask only ONE question at a time
- Be conversational — don't make it feel like a form
- When you have the required fields, generate the document
- Format generated documents in clean, professional text
- When generating a document, wrap it in <document type="TYPE" title="TITLE"> ... </document> tags
- After generating, ask: "Want me to save this, or make any changes?"
- If user asks about existing documents, tell them to check the Document Library in the sidebar`;

export async function chat(userId, userMessage, conversationHistory = []) {
  const db = getDb();

  // Load compressed memory
  const memory = db.prepare('SELECT summary FROM chat_memory WHERE user_id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);

  let systemPrompt = SYSTEM_PROMPT;

  if (profile?.company_name) {
    systemPrompt += `\n\nUser's company: ${profile.company_name}`;
    if (profile.owner_name) systemPrompt += ` | Owner: ${profile.owner_name}`;
    if (profile.license_number) systemPrompt += ` | License: ${profile.license_number}`;
    if (profile.city) systemPrompt += ` | Location: ${profile.city}, ${profile.state}`;
  }

  if (memory?.summary) {
    systemPrompt += `\n\nContext from previous conversations:\n${memory.summary}`;
  }

  // Build messages array
  const messages = [...conversationHistory, { role: 'user', content: userMessage }];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const assistantMessage = response.content[0].text;

  // Parse if document was generated
  const docMatch = assistantMessage.match(/<document type="([^"]+)" title="([^"]+)">([\s\S]*?)<\/document>/);
  let generatedDoc = null;

  if (docMatch) {
    generatedDoc = {
      type: docMatch[1],
      title: docMatch[2],
      content: docMatch[3].trim(),
    };
  }

  // Compress memory every 20 messages
  const msgCount = db.prepare('SELECT COUNT(*) as n FROM chat_messages WHERE user_id = ?').get(userId).n;
  if (msgCount > 0 && msgCount % 20 === 0) {
    compressMemory(userId).catch(console.error);
  }

  return { message: assistantMessage, generatedDoc };
}

async function compressMemory(userId) {
  const db = getDb();
  const messages = db.prepare(`
    SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 40
  `).all(userId).reverse();

  if (messages.length < 10) return;

  const summaryResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Summarize this conversation history in 3-5 sentences, focusing on: what projects they're working on, what documents they've created, and any important company details mentioned.\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`,
      },
    ],
  });

  const summary = summaryResponse.content[0].text;
  const existingMemory = db.prepare('SELECT id FROM chat_memory WHERE user_id = ?').get(userId);

  if (existingMemory) {
    db.prepare('UPDATE chat_memory SET summary = ?, message_count = ?, last_updated = ? WHERE user_id = ?')
      .run(summary, messages.length, Date.now() / 1000 | 0, userId);
  } else {
    const { v4: uuidv4 } = await import('uuid');
    db.prepare('INSERT INTO chat_memory (id, user_id, summary, message_count) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), userId, summary, messages.length);
  }
}

// Generate document template (called once per doc type per user)
export async function generateTemplate(userId, docType) {
  const schema = DOC_SCHEMAS[docType];
  if (!schema) throw new Error(`Unknown doc type: ${docType}`);

  const db = getDb();
  const existing = db.prepare('SELECT template_json FROM doc_templates WHERE user_id = ? AND doc_type = ?').get(userId, docType);
  if (existing) return JSON.parse(existing.template_json);

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Create a professional ${schema.label} template for a construction company${profile?.company_name ? ` called "${profile.company_name}"` : ''}.

Return a JSON object with these fields as keys and placeholder values (like "{{project_name}}", "{{date}}", etc.):
${schema.fields.join(', ')}

Also include a "formatted_text" field with the complete document text using the placeholders.

Return ONLY valid JSON.`,
      },
    ],
  });

  let template;
  try {
    const text = response.content[0].text.replace(/```json\n?|\n?```/g, '').trim();
    template = JSON.parse(text);
  } catch {
    template = { fields: schema.fields.reduce((acc, f) => ({ ...acc, [f]: `{{${f}}}` }), {}) };
  }

  const { v4: uuidv4 } = await import('uuid');
  db.prepare('INSERT OR REPLACE INTO doc_templates (id, user_id, doc_type, template_json) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), userId, docType, JSON.stringify(template));

  return template;
}

// Onboarding chat — collect company profile
export async function onboardingChat(messages) {
  const ONBOARDING_PROMPT = `You are Bear, the AI assistant for ConstructionBear.AI. A new user just signed up. Your job is to collect their company information in a friendly, conversational way — like you're having a quick chat, not filling out a form.

Collect these details (one at a time, naturally):
1. Company name
2. Owner's full name
3. Business email
4. Phone number
5. Business address (street, city, state, zip)
6. Contractor license number (optional)

When you have all the information, return a JSON block like this:
<profile>
{
  "company_name": "...",
  "owner_name": "...",
  "email": "...",
  "phone": "...",
  "address": "...",
  "city": "...",
  "state": "...",
  "zip": "...",
  "license_number": "..."
}
</profile>

Then say something warm to welcome them.

Keep it short. Be friendly but efficient. This should feel like 2 minutes, not 10.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: ONBOARDING_PROMPT,
    messages,
  });

  const text = response.content[0].text;
  const profileMatch = text.match(/<profile>([\s\S]*?)<\/profile>/);
  let extractedProfile = null;

  if (profileMatch) {
    try {
      extractedProfile = JSON.parse(profileMatch[1].trim());
    } catch {
      // ignore parse errors
    }
  }

  return { message: text, extractedProfile };
}
