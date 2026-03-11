import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/schema.js';
import { getTemplate } from '../data/aia-templates.js';

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
  ccd: {
    label: 'Construction Change Directive (AIA G714)',
    fields: ['project_name', 'ccd_number', 'date', 'owner', 'architect', 'contractor', 'description', 'basis', 'amount', 'time_adjustment'],
    required: ['project_name', 'ccd_number', 'description', 'basis'],
  },
  rfp: {
    label: 'Request for Proposal (RFP)',
    fields: ['project_name', 'rfp_number', 'date', 'addressed_to', 'description', 'response_due'],
    required: ['project_name', 'rfp_number', 'addressed_to', 'description', 'response_due'],
  },
  change_order_log: {
    label: 'Change Order Log',
    fields: ['project_name', 'date', 'contractor', 'entries'],
    required: ['project_name', 'date', 'entries'],
  },
  submittal_log: {
    label: 'Submittal Log',
    fields: ['project_name', 'date', 'contractor', 'entries'],
    required: ['project_name', 'date', 'entries'],
  },
  rfi_log: {
    label: 'RFI Log',
    fields: ['project_name', 'date', 'contractor', 'entries'],
    required: ['project_name', 'date', 'entries'],
  },
  coi: {
    label: 'Certificate of Insurance (COI)',
    fields: ['project_name', 'date', 'insured', 'certificate_holder', 'gl_expiration', 'wc_expiration'],
    required: ['project_name', 'date', 'insured', 'certificate_holder'],
  },
  visitor_waiver: {
    label: "Visitor's Waiver",
    fields: ['project_name', 'project_address', 'company_name', 'date', 'visitor_name', 'visitor_company', 'host', 'purpose'],
    required: ['project_name', 'project_address', 'company_name', 'date'],
  },
  notice_to_neighbors: {
    label: 'Notice to Neighbors',
    fields: ['project_name', 'project_address', 'company_name', 'date', 'work_description', 'start_date', 'end_date', 'work_hours'],
    required: ['project_name', 'project_address', 'company_name', 'date', 'work_description', 'start_date'],
  },
  parking_pass: {
    label: 'Construction Parking Pass',
    fields: ['project_name', 'project_address', 'date', 'expiration_date', 'holder_name', 'vehicle_make', 'license_plate', 'authorized_area'],
    required: ['project_name', 'project_address', 'date'],
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
- RFI (AIA G716)
- Submittal Cover Sheet
- Change Order (AIA G701)
- Construction Change Directive / CCD (AIA G714)
- Application for Payment (AIA G702/G703)
- Lien Waiver (Conditional Progress, Unconditional Progress, Conditional Final, Unconditional Final)
- Transmittal
- Meeting Minutes
- Daily Field Report
- Punch List
- Notice to Proceed (NTP)
- Certificate of Substantial Completion (AIA G704)
- Request for Proposal (RFP)
- Subcontract Agreement (short form)
- Change Order Log
- Submittal Log
- RFI Log
- Certificate of Insurance (COI)
- Visitor's Waiver
- Notice to Neighbors
- Parking Pass
- Notice to Owner
- Invoice
- Schedule of Values
- Warranty Letter
- Substitution Request
- Certified Payroll Report

Rules you follow without exception:
- Always acknowledge and confirm before executing — never jump straight into asking questions
- Ask only ONE field at a time
- Never generate a document with empty required fields — collect everything first
- If the conversation drifts more than 2 exchanges away from collecting a required field, redirect politely: "Before we continue — I still need [missing field] to complete your [document type]. Can we get that first?"
- If user mentions a project name, client, GC, architect, or contact — acknowledge it and let them know you've noted it
- Never ask for information already provided in the company profile context above (company name, address, phone, email, license number)
- UPLOAD-FIRST RULE — RFI and Submittal only: when a user first requests an RFI or Submittal, your very first response MUST be: "Would you like to start from an existing document? You can upload a PDF or Word file and I'll use it as the base." Then wait for their answer before collecting any other fields. If they upload a file or say yes, acknowledge it ("Got it — I'll use that as the base.") and continue. If they say no or skip, proceed with normal field collection immediately.

DOCUMENT GENERATION FORMAT (critical — follow exactly):
When you have all required fields and are ready to generate the document, output:

<document type="TYPE" title="TITLE">
<fields>
{"field_name": "value", "field_name_2": "value2", ...}
</fields>
</document>

Where:
- TYPE is the document type key (e.g. rfi, change_order, submittal, lien_waiver, pay_app, ccd, rfp, etc.)
- TITLE is a descriptive title (e.g. "RFI-003 — Mechanical Conflict Level 3")
- The <fields> block contains ALL collected field values as a valid JSON object
- Field names must match the document type's field schema exactly
- Do NOT write the full document text — only output the JSON field values
- After the document tag, add a brief confirmation line like "I've prepared your RFI — ready to save, or need any changes?"`;

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

// ── Context realignment: detect in-progress collection session ─────────────────
// Scans recent conversation history to find if Bear has started collecting fields
// for a specific document type but hasn't completed it yet.
// Returns { type, label, required, exchangesSince } or null.

const COLLECTION_TRIGGERS = [
  "i'll prepare", "i'll put together", "let me prepare", "let me put together",
  "put together a", "prepare a", "prepare your", "preparing a", "preparing your",
  "working on your", "to complete your", "need a few more", "couple more details",
  "quick question", "one more thing", "just need", "a few questions",
];

function detectCollectionSession(conversationHistory) {
  if (!conversationHistory || conversationHistory.length < 2) return null;

  const recent = conversationHistory.slice(-12);

  // If the last assistant message already generated a document, no active session
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].role === 'assistant' && recent[i].content.includes('<document type=')) {
      return null;
    }
  }

  // Scan backwards through assistant messages for a collection session start
  for (let i = recent.length - 1; i >= 0; i--) {
    const msg = recent[i];
    if (msg.role !== 'assistant') continue;

    const content = msg.content.toLowerCase();
    const hasTrigger = COLLECTION_TRIGGERS.some(t => content.includes(t));
    if (!hasTrigger) continue;

    // Check which doc type this message mentions
    for (const [type, schema] of Object.entries(DOC_SCHEMAS)) {
      const label = schema.label.toLowerCase();
      const typeWords = type.replace(/_/g, ' ');
      if (content.includes(label) || content.includes(typeWords)) {
        // Count full exchanges (user+assistant pairs) since this point
        const messagesAfter = recent.length - 1 - i;
        const exchangesSince = Math.floor(messagesAfter / 2);
        return { type, label: schema.label, required: schema.required, exchangesSince };
      }
    }
  }

  return null;
}

// Inject required fields checklist for any active collection session (Task 10)
function buildRequiredFieldsInjection(session) {
  if (!session) return '';
  const schema = DOC_SCHEMAS[session.type];
  if (!schema) return '';
  return `

ACTIVE COLLECTION SESSION — ${session.label.toUpperCase()}:
Required fields you MUST collect before generating: ${schema.required.join(', ')}
Confirm you have a non-empty value for EVERY field above before outputting <document>. If any are missing, ask for the next missing one before generating.`;
}

// Build a realignment injection when the session has drifted (Task 9)
function buildRealignmentInjection(session) {
  if (!session || session.exchangesSince < 2) return '';
  return `

REALIGNMENT REQUIRED — ACTIVE COLLECTION SESSION:
You are currently collecting information for a ${session.label}. This session has been active for ${session.exchangesSince} exchanges. If the last user message did not provide one of the required fields (${session.required.join(', ')}), you MUST redirect the conversation back before responding to anything else.

Use this exact approach: acknowledge their message briefly in one sentence, then immediately redirect: "Before we get to that — I still need [specific missing field] to complete your ${session.label}. Can you give me that first?"

Do not answer off-topic questions, provide general advice, or discuss anything else until the required fields are collected or the user explicitly asks to cancel the document.`;
}

// ── Date auto-population (Task 11) ────────────────────────────────────────────

function isoDate(daysFromNow = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Fields that should default to today
const DATE_FIELDS_TODAY = new Set([
  'date', 'period_to', 'week_ending', 'meeting_date', 'through_date',
  'date_of_issuance', 'commencement_date', 'start_date',
]);

// Fields that should default to today + 14 days
const DATE_FIELDS_PLUS14 = new Set([
  'due_date', 'date_needed', 'response_due', 'completion_date',
  'end_date', 'warranty_end_date',
]);

// Submittals get a tighter 2-day response window
const SUBMITTAL_TYPES = new Set(['submittal']);

function autoPopulateDates(docType, fields) {
  const today = isoDate(0);
  const plus2 = isoDate(2);
  const plus14 = isoDate(14);
  const isSubmittal = SUBMITTAL_TYPES.has(docType);
  const result = { ...fields };

  for (const key of Object.keys(result)) {
    const val = result[key];
    // Only fill empty/missing date fields
    if (val !== null && val !== undefined && String(val).trim() !== '') continue;

    if (DATE_FIELDS_TODAY.has(key)) {
      result[key] = today;
    } else if (DATE_FIELDS_PLUS14.has(key)) {
      // Submittals use 2-day window for response deadlines
      result[key] = isSubmittal ? plus2 : plus14;
    }
  }

  // For submittals: if date_needed was provided as empty, always use +2
  if (isSubmittal && !result.date_needed) {
    result.date_needed = plus2;
  }

  return result;
}

// ── Profile auto-fill (Task 13) ───────────────────────────────────────────────
// Maps known profile data into empty document fields so Bear never has to ask.

// Each key is a profile field; value is the list of doc fields it can fill.
const PROFILE_FIELD_MAP = {
  company_name:    ['contractor', 'general_contractor', 'contractor_name', 'from_name', 'claimant', 'insured', 'company_name'],
  owner_name:      ['submitted_by', 'prepared_by', 'superintendent', 'project_manager', 'contractor_signature'],
  address_full:    ['contractor_address', 'from_address'],  // assembled below
  license_number:  ['license_number'],
};

function autoPopulateFromProfile(docType, fields, profile) {
  if (!profile) return fields;
  const result = { ...fields };

  // Build full address string once
  const fullAddress = [profile.address, profile.city, profile.state, profile.zip]
    .filter(Boolean).join(', ');

  const profileValues = {
    company_name:   profile.company_name,
    owner_name:     profile.owner_name,
    address_full:   fullAddress || null,
    license_number: profile.license_number,
  };

  for (const [profileKey, docFields] of Object.entries(PROFILE_FIELD_MAP)) {
    const val = profileValues[profileKey];
    if (!val) continue;
    for (const docField of docFields) {
      // Only fill if the field exists in the result and is empty/missing
      if (docField in result) {
        const existing = result[docField];
        if (existing === null || existing === undefined || (typeof existing === 'string' && !existing.trim())) {
          result[docField] = val;
        }
      }
    }
  }

  return result;
}

// Post-generation validation: check all required fields are populated
function validateGeneratedDoc(generatedDoc) {
  if (!generatedDoc?.isStructured) return generatedDoc;
  const schema = DOC_SCHEMAS[generatedDoc.type];
  if (!schema) return generatedDoc;

  const missing = schema.required.filter(field => {
    const val = generatedDoc.content[field];
    return val === undefined || val === null || (typeof val === 'string' && !val.trim());
  });

  return { ...generatedDoc, missingFields: missing, isComplete: missing.length === 0 };
}

export async function chat(userId, userMessage, conversationHistory = [], companyId = null) {
  const db = getDb();

  // Load compressed memory, profile, and existing projects/contacts for context
  const memory = db.prepare('SELECT summary FROM chat_memory WHERE user_id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const scopeId = companyId || userId;
  const scopeCol = companyId ? 'company_id' : 'user_id';
  const projects = db.prepare(`SELECT id, name, client_name, status FROM projects WHERE ${scopeCol} = ? ORDER BY created_at DESC LIMIT 10`).all(scopeId);
  const contacts = db.prepare(`SELECT id, name, company, role FROM contacts WHERE ${scopeCol} = ? ORDER BY name ASC LIMIT 20`).all(scopeId);

  // Task 11: inject today's date so Bear can reference it in conversations and documents
  const todayStr = isoDate(0);
  const plus14Str = isoDate(14);
  let systemPrompt = SYSTEM_PROMPT + `\n\nToday's date: ${todayStr}. Default due dates: 14 days from today (${plus14Str}) unless otherwise specified. Submittals default to 2-day response window.`;

  if (profile?.company_name) {
    const knownFields = [];
    systemPrompt += `\n\nCOMPANY PROFILE (pre-filled — do NOT ask the user for any of these):`;
    systemPrompt += `\n  Company name: ${profile.company_name}`; knownFields.push('company name');
    if (profile.owner_name) { systemPrompt += ` | Owner: ${profile.owner_name}`; knownFields.push('owner name'); }
    if (profile.phone) { systemPrompt += ` | Phone: ${profile.phone}`; knownFields.push('phone'); }
    if (profile.email) { systemPrompt += ` | Email: ${profile.email}`; knownFields.push('email'); }
    if (profile.address) {
      const fullAddr = [profile.address, profile.city, profile.state, profile.zip].filter(Boolean).join(', ');
      systemPrompt += ` | Address: ${fullAddr}`; knownFields.push('address');
    }
    if (profile.license_number) { systemPrompt += ` | License: ${profile.license_number}`; knownFields.push('license number'); }
    systemPrompt += `\nDO NOT ask the user for: ${knownFields.join(', ')}. These are already known and will be pre-filled automatically.`;
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

  // Task 10: inject required fields checklist for any active collection session
  const collectionSession = detectCollectionSession(conversationHistory);
  const requiredFieldsInjection = buildRequiredFieldsInjection(collectionSession);
  if (requiredFieldsInjection) {
    systemPrompt += requiredFieldsInjection;
  }

  // Task 9: inject realignment directive if session has drifted
  const realignmentInjection = buildRealignmentInjection(collectionSession);
  if (realignmentInjection) {
    systemPrompt += realignmentInjection;
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
    const docType = docMatch[1];
    const docTitle = docMatch[2];
    const docBody = docMatch[3].trim();

    // Try to parse structured <fields> JSON block
    const fieldsMatch = docBody.match(/<fields>\s*([\s\S]*?)\s*<\/fields>/);
    if (fieldsMatch) {
      try {
        const rawFields = JSON.parse(fieldsMatch[1]);
        // Task 11: auto-populate empty date fields
        // Task 13: auto-populate empty profile fields (company name, owner, address, license)
        const datedFields = autoPopulateDates(docType, rawFields);
        const fields = autoPopulateFromProfile(docType, datedFields, profile);
        // Load AIA template and merge with company profile defaults
        const template = getTemplate(docType, fields.subtype || fields.type || null);
        generatedDoc = {
          type: docType,
          title: docTitle,
          content: fields,
          templateUsed: template ? (template.aia_form || docType) : docType,
          isStructured: true,
        };
      } catch {
        // Fallback to raw text if JSON parse fails
        generatedDoc = { type: docType, title: docTitle, content: docBody, isStructured: false };
      }
    } else {
      // Legacy raw text format fallback
      generatedDoc = { type: docType, title: docTitle, content: docBody, isStructured: false };
    }
  }

  // Task 10: validate required fields — discard incomplete structured docs
  if (generatedDoc) {
    generatedDoc = validateGeneratedDoc(generatedDoc);
    if (generatedDoc.isStructured && !generatedDoc.isComplete) {
      // Don't auto-save — return as incomplete so chat.js skips saving
      generatedDoc.savedDocId = null;
    }
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
// knownData: { companyName } — fields already known from company setup step
export async function onboardingChat(messages, knownData = {}) {
  const { companyName } = knownData;

  // Build the list of fields still needed (skip company name if already known)
  const fieldsToCollect = [];
  if (!companyName) fieldsToCollect.push('1. Company name');
  fieldsToCollect.push(
    `${fieldsToCollect.length + 1}. Owner's full name`,
    `${fieldsToCollect.length + 2}. Business email`,
    `${fieldsToCollect.length + 3}. Phone number`,
    `${fieldsToCollect.length + 4}. Business address (street, city, state, zip)`,
    `${fieldsToCollect.length + 5}. Contractor license number (optional)`,
  );

  const knownSection = companyName
    ? `\n\nALREADY KNOWN — do NOT ask for this:\n- Company name: "${companyName}" (pre-filled from account setup — include it in the final <profile> block)`
    : '';

  const ONBOARDING_PROMPT = `You are Bear, the AI assistant for ConstructionBear.AI. A new user just signed up. Your job is to collect their company information in a friendly, conversational way — like you're having a quick chat, not filling out a form.${knownSection}

Collect these details (one at a time, naturally):
${fieldsToCollect.join('\n')}

When you have all the information, return a JSON block like this:
<profile>
{
  "company_name": "${companyName || '...'}",
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
