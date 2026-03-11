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
  daily_report: {
    label: 'Daily Field Report',
    fields: ['project_name', 'date', 'report_number', 'superintendent', 'weather', 'temperature', 'workers_on_site', 'work_performed', 'materials_delivered', 'equipment_on_site', 'visitors', 'delays', 'safety_incidents', 'notes'],
    required: ['project_name', 'date', 'work_performed'],
  },
  punch_list: {
    label: 'Punch List',
    fields: ['project_name', 'date', 'prepared_by', 'contractor', 'location', 'items'],
    required: ['project_name', 'date', 'items'],
  },
  invoice: {
    label: 'Invoice',
    fields: ['invoice_number', 'date', 'due_date', 'project_name', 'bill_to_name', 'bill_to_address', 'from_name', 'from_address', 'line_items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'payment_terms', 'notes'],
    required: ['invoice_number', 'date', 'project_name', 'bill_to_name', 'line_items', 'total'],
  },
  transmittal: {
    label: 'Transmittal',
    fields: ['project_name', 'transmittal_number', 'date', 'to_name', 'to_company', 'from_name', 'subject', 'items', 'action_required', 'notes'],
    required: ['project_name', 'date', 'to_name', 'subject', 'items'],
  },
  schedule_of_values: {
    label: 'Schedule of Values',
    fields: ['project_name', 'contractor', 'owner', 'architect', 'contract_number', 'date', 'line_items', 'contract_amount'],
    required: ['project_name', 'contractor', 'line_items', 'contract_amount'],
  },
  notice_to_proceed: {
    label: 'Notice to Proceed',
    fields: ['project_name', 'date', 'contractor_name', 'contractor_address', 'owner_name', 'commencement_date', 'completion_date', 'contract_amount', 'project_address'],
    required: ['project_name', 'date', 'contractor_name', 'commencement_date'],
  },
  substantial_completion: {
    label: 'Certificate of Substantial Completion',
    fields: ['project_name', 'project_address', 'contractor', 'owner', 'architect', 'date_of_issuance', 'date_of_substantial_completion', 'list_of_items', 'warranty_start_date'],
    required: ['project_name', 'contractor', 'owner', 'date_of_substantial_completion'],
  },
  warranty_letter: {
    label: 'Warranty Letter',
    fields: ['project_name', 'date', 'contractor_name', 'contractor_address', 'owner_name', 'owner_address', 'work_description', 'warranty_period', 'warranty_start_date', 'warranty_end_date', 'exclusions'],
    required: ['project_name', 'contractor_name', 'owner_name', 'work_description', 'warranty_period'],
  },
  substitution_request: {
    label: 'Substitution Request',
    fields: ['project_name', 'date', 'request_number', 'submitted_by', 'specified_item', 'specified_manufacturer', 'proposed_item', 'proposed_manufacturer', 'reason', 'cost_difference', 'schedule_impact', 'attachments'],
    required: ['project_name', 'specified_item', 'proposed_item', 'reason'],
  },
  closeout_checklist: {
    label: 'Project Close-Out Checklist',
    fields: ['project_name', 'date', 'contractor', 'owner', 'project_manager', 'items'],
    required: ['project_name', 'contractor', 'items'],
  },
  certified_payroll: {
    label: 'Certified Payroll Report',
    fields: ['project_name', 'contractor', 'week_ending', 'project_number', 'payroll_number', 'employees', 'contractor_signature', 'title', 'date'],
    required: ['project_name', 'contractor', 'week_ending', 'employees'],
  },
};

const SYSTEM_PROMPT = `You are Bear, the AI construction admin assistant for ConstructionBear.AI. You help contractors and project teams create professional construction documents quickly and accurately.

Your tone and style:
- Professional, understanding, and polite — like a knowledgeable construction admin who genuinely wants to help
- Always acknowledge what the user is asking before you act on it
- Confirm your understanding of the request, then move forward
- Not robotic or stiff, not overly casual — think seasoned project administrator
- Examples of your voice:
  "Got it — I'll put together an RFI for the mechanical conflict on Level 3. Just need a couple more details first."
  "Understood. Let me prepare that conditional lien waiver for the framing work. Can you confirm the through-date?"
  "Happy to help with that change order. A few quick questions and we'll have it ready."

How you work:
1. When a user asks for a document — acknowledge it, confirm the type, then collect what you need
2. Ask ONE question at a time, in a logical order — never fire off a list of questions
3. Once you have all required fields, generate the document without being asked again
4. After generating, confirm: "I've prepared your [document type] — want me to save it, or would you like any changes?"
5. If the user provides project or contact information, acknowledge you're noting it

Document types you handle:
- RFI (Request for Information)
- Change Order
- Submittal
- Lien Waiver (Conditional/Unconditional, Progress/Final)
- AIA Pay Application
- Meeting Minutes
- Notice to Owner
- Subcontract Agreement
- Daily Field Report
- Punch List
- Invoice
- Transmittal
- Schedule of Values (SOV)
- Notice to Proceed (NTP)
- Certificate of Substantial Completion
- Warranty Letter
- Substitution Request
- Project Close-Out Checklist
- Certified Payroll Report

Rules you follow without exception:
- Always acknowledge and confirm before executing — never jump straight into asking questions
- Ask only ONE field at a time
- Never generate a document with empty required fields — collect everything first
- When generating, wrap the document in <document type="TYPE" title="TITLE"> ... </document> tags
- Format all documents in clean, professional, industry-standard layout
- If the conversation drifts more than 2 exchanges away from collecting a required field, redirect politely: "Before we continue — I still need [missing field] to complete your [document type]. Can we get that first?"
- If user mentions a project name, client, GC, architect, or contact — acknowledge it and let them know you've noted it`;

const EXTRACT_PROMPT = `You are a data extraction assistant. Given a conversation message, extract any project or contact information mentioned.

Return a JSON object with this structure (omit fields not mentioned, return null if nothing found):
{
  "project": {
    "name": "...",
    "client_name": "...",
    "client_contact": "...",
    "client_email": "...",
    "client_phone": "...",
    "address": "...",
    "gc_name": "...",
    "architect_name": "...",
    "contract_value": 0,
    "start_date": "...",
    "status": "active"
  },
  "contacts": [
    {
      "name": "...",
      "company": "...",
      "role": "...",
      "email": "...",
      "phone": "..."
    }
  ]
}

Only extract clearly stated information. Do not infer or guess. Return null for "project" if no project info found. Return empty array for "contacts" if no contacts found. Return ONLY valid JSON.`;

export async function chat(userId, userMessage, conversationHistory = [], companyId = null) {
  const db = getDb();

  // Load compressed memory, profile, and existing projects/contacts for context
  const memory = db.prepare('SELECT summary FROM chat_memory WHERE user_id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const scopeId = companyId || userId;
  const scopeCol = companyId ? 'company_id' : 'user_id';
  const projects = db.prepare(`SELECT id, name, client_name, status FROM projects WHERE ${scopeCol} = ? ORDER BY created_at DESC LIMIT 10`).all(scopeId);
  const contacts = db.prepare(`SELECT id, name, company, role FROM contacts WHERE ${scopeCol} = ? ORDER BY name ASC LIMIT 20`).all(scopeId);

  let systemPrompt = SYSTEM_PROMPT;

  if (profile?.company_name) {
    systemPrompt += `\n\nUser's company: ${profile.company_name}`;
    if (profile.owner_name) systemPrompt += ` | Owner: ${profile.owner_name}`;
    if (profile.license_number) systemPrompt += ` | License: ${profile.license_number}`;
    if (profile.city) systemPrompt += ` | Location: ${profile.city}, ${profile.state}`;
  }

  if (projects.length > 0) {
    systemPrompt += `\n\nKnown projects: ${projects.map(p => `${p.name}${p.client_name ? ` (client: ${p.client_name})` : ''}`).join('; ')}`;
  }

  if (contacts.length > 0) {
    systemPrompt += `\nKnown contacts: ${contacts.map(c => `${c.name}${c.company ? ` @ ${c.company}` : ''}${c.role ? ` (${c.role})` : ''}`).join('; ')}`;
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

  // Auto-extract project/contact info from user message (non-blocking)
  extractAndSave(userId, companyId, userMessage, db).catch(console.error);

  // Compress memory every 20 messages
  const msgCount = db.prepare('SELECT COUNT(*) as n FROM chat_messages WHERE user_id = ?').get(userId).n;
  if (msgCount > 0 && msgCount % 20 === 0) {
    compressMemory(userId).catch(console.error);
  }

  return { message: assistantMessage, generatedDoc };
}

async function extractAndSave(userId, companyId, userMessage, db) {
  // Only extract if message is long enough to contain real info
  if (userMessage.trim().length < 20) return;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  let extracted;
  try {
    const text = response.content[0].text.replace(/```json\n?|\n?```/g, '').trim();
    extracted = JSON.parse(text);
  } catch {
    return;
  }

  const { v4: uuidv4 } = await import('uuid');

  // Save project if found and not already tracked — capture its ID for contact linking
  let linkedProjectId = null;
  const scopeCol = companyId ? 'company_id' : 'user_id';
  const scopeId = companyId || userId;

  if (extracted.project?.name) {
    const existing = db.prepare(`SELECT id FROM projects WHERE ${scopeCol} = ? AND name = ? COLLATE NOCASE LIMIT 1`)
      .get(scopeId, extracted.project.name);
    if (existing) {
      linkedProjectId = existing.id;
    } else {
      const p = extracted.project;
      const newId = uuidv4();
      db.prepare(`
        INSERT INTO projects (id, user_id, company_id, name, client_name, client_contact, client_email, client_phone, address, gc_name, architect_name, contract_value, start_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newId, userId, companyId || null, p.name, p.client_name || null, p.client_contact || null,
        p.client_email || null, p.client_phone || null, p.address || null,
        p.gc_name || null, p.architect_name || null, p.contract_value || null,
        p.start_date || null, p.status || 'active');
      linkedProjectId = newId;
    }
  }

  // Save new contacts; link to project if project was mentioned in same message
  if (Array.isArray(extracted.contacts)) {
    for (const c of extracted.contacts) {
      if (!c.name) continue;
      const existing = db.prepare(`SELECT id, project_id FROM contacts WHERE ${scopeCol} = ? AND name = ? COLLATE NOCASE LIMIT 1`)
        .get(scopeId, c.name);
      if (existing) {
        if (linkedProjectId && !existing.project_id) {
          db.prepare('UPDATE contacts SET project_id = ? WHERE id = ?').run(linkedProjectId, existing.id);
        }
      } else {
        db.prepare(`
          INSERT INTO contacts (id, user_id, company_id, project_id, name, company, role, email, phone)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), userId, companyId || null, linkedProjectId, c.name, c.company || null, c.role || null,
          c.email || null, c.phone || null);
      }
    }
  }
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
