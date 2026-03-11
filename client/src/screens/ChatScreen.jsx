import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChatStore, useUIStore, useDocStore, useAuthStore } from '../store/index.js';
import { api } from '../api/index.js';
import DocumentCard from '../components/DocumentCard.jsx';
import SubscriptionModal from '../components/SubscriptionModal.jsx';
import ChatFileViewer from '../components/ChatFileViewer.jsx';
import clsx from 'clsx';

// ── Context-aware placeholder rules (Task 12) ─────────────────────────────────
// Ordered by specificity — first match wins.
const PLACEHOLDER_RULES = [
  { kw: ['project name', 'name of the project', 'which project', 'project are you'],  hint: 'e.g. 123 Main Street Renovation' },
  { kw: ['rfi number', 'rfi #', 'rfi no'],                                             hint: 'e.g. RFI-003' },
  { kw: ['change order number', 'co number', 'co #'],                                  hint: 'e.g. CO-007' },
  { kw: ['submittal number', 'submittal #'],                                            hint: 'e.g. SUB-012' },
  { kw: ['application number', 'pay app number', 'pay application number'],            hint: 'e.g. Pay App #5' },
  { kw: ['invoice number', 'invoice #'],                                               hint: 'e.g. INV-2026-001' },
  { kw: ['transmittal number'],                                                         hint: 'e.g. TRN-004' },
  { kw: ['ccd number', 'ccd #', 'directive number'],                                   hint: 'e.g. CCD-002' },
  { kw: ['rfp number', 'rfp #'],                                                        hint: 'e.g. RFP-001' },
  { kw: ['subject', 'subject of the rfi', 'what is the subject'],                      hint: 'e.g. Mechanical conflict on Level 3' },
  { kw: ['question', 'rfi question', 'what is your question', 'what is the question'], hint: 'Describe the question or clarification needed...' },
  { kw: ['scope of work', 'scope', 'what work will'],                                  hint: 'Describe the scope of work...' },
  { kw: ['description', 'describe the work', 'describe the change', 'what is being'],  hint: 'Describe in detail...' },
  { kw: ['contract amount', 'contract value', 'what is the contract'],                 hint: 'e.g. $250,000.00' },
  { kw: ['cost change', 'cost of the change', 'how much does', 'cost impact'],         hint: 'e.g. +$4,500.00 or -$1,200.00' },
  { kw: ['amount', 'how much', 'total amount', 'lien waiver amount'],                  hint: 'e.g. $12,500.00' },
  { kw: ['retainage', 'retainage percent'],                                             hint: 'e.g. 10%' },
  { kw: ['spec section', 'specification section'],                                      hint: 'e.g. 15000 — Mechanical' },
  { kw: ['supplier', 'manufacturer', 'who is the supplier'],                            hint: 'e.g. Carrier HVAC Equipment' },
  { kw: ['subcontractor', 'who is the subcontractor', 'sub name'],                     hint: 'e.g. Elite Plumbing & Mechanical' },
  { kw: ['general contractor', 'gc name', 'who is the gc', 'contractor name'],         hint: 'e.g. Sunrise General Contractors' },
  { kw: ['owner name', 'who is the owner', 'property owner'],                          hint: 'e.g. Smith Family Trust' },
  { kw: ['architect', 'who is the architect'],                                          hint: 'e.g. Design Associates LLC' },
  { kw: ['claimant', 'who is the claimant'],                                            hint: 'e.g. XYZ Framing Inc.' },
  { kw: ['addressed to', 'who is this addressed', 'send this to'],                     hint: 'e.g. Sarah Chen, Project Architect' },
  { kw: ['property address', 'project address', 'address of the project'],             hint: 'e.g. 456 Ocean Dr, Miami FL 33139' },
  { kw: ['through date', 'through-date', 'work performed through'],                    hint: `e.g. ${new Date().toISOString().split('T')[0]}` },
  { kw: ['due date', 'when is it due', 'date needed', 'response due'],                 hint: 'e.g. 2 weeks from today' },
  { kw: ['commencement date', 'start date', 'when does work begin'],                   hint: `e.g. ${new Date().toISOString().split('T')[0]}` },
  { kw: ['completion date', 'when must', 'substantial completion'],                    hint: 'e.g. 90 days from commencement' },
  { kw: ['warranty period', 'how long is the warranty'],                               hint: 'e.g. 1 year from substantial completion' },
  { kw: ['payment terms'],                                                              hint: 'e.g. Net 30 days' },
  { kw: ['attendees', 'who attended', 'who was present'],                              hint: 'e.g. John Smith (GC), Maria Lopez (Architect)' },
  { kw: ['action items', 'action item'],                                               hint: 'e.g. 1. Review RFI by Friday  2. Confirm layout' },
  { kw: ['agenda', 'agenda items', 'topics'],                                           hint: 'e.g. 1. Schedule update  2. RFI review...' },
  { kw: ['weather', 'what was the weather'],                                            hint: 'e.g. Partly cloudy, 78°F' },
  { kw: ['workers on site', 'how many workers', 'crew size'],                          hint: 'e.g. 8 workers — 4 framing, 4 electrical' },
  { kw: ['work performed', 'what work was done', 'what was completed today'],          hint: 'Describe work completed today...' },
  { kw: ['materials', 'materials delivered'],                                           hint: 'e.g. (2) pallets of drywall, (50) 2x4x8 studs' },
  { kw: ['delays', 'any delays', 'issues today'],                                       hint: 'e.g. Rain delay 2 hours — resumed at 10am' },
  { kw: ['punch list item', 'items', 'checklist item'],                                hint: 'e.g. Touch up paint in bedroom 2' },
  { kw: ['lien waiver type', 'type of lien waiver', 'conditional or unconditional'],   hint: 'e.g. conditional progress / unconditional final' },
  { kw: ['reason', 'why', 'reason for'],                                               hint: 'Explain the reason...' },
  { kw: ['phone', 'phone number', 'contact number'],                                   hint: 'e.g. (305) 555-0100' },
  { kw: ['email', 'email address'],                                                     hint: 'e.g. contact@company.com' },
  { kw: ['license', 'license number'],                                                  hint: 'e.g. CGC1234567' },
  { kw: ['location', 'where is the meeting', 'meeting location'],                      hint: 'e.g. Job trailer, 123 Main St' },
];

const DEFAULT_PLACEHOLDER = 'Ask Bear to create an RFI, Change Order, Submittal...';

function getPlaceholder(messages) {
  if (!messages?.length) return DEFAULT_PLACEHOLDER;
  const lastBear = [...messages].reverse().find(m => m.role === 'assistant');
  if (!lastBear) return DEFAULT_PLACEHOLDER;

  const text = lastBear.content.toLowerCase();
  // Only change placeholder when Bear is asking a question
  if (!text.includes('?')) return DEFAULT_PLACEHOLDER;

  for (const { kw, hint } of PLACEHOLDER_RULES) {
    if (kw.some(k => text.includes(k))) return hint;
  }
  return DEFAULT_PLACEHOLDER;
}

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [showSubModal, setShowSubModal] = useState(false);
  const { messages, loading, initialized, loadMessages, sendMessage, startNewChat,
          activeSession, exitSession, pendingAttachment, setPendingAttachment } = useChatStore();
  const { toggleSidebar } = useUIStore();
  const { addDocument } = useDocStore();
  const { canCreateDoc } = useAuthStore();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // When viewing a past session, show its messages instead
  const displayMessages = activeSession ? activeSession.messages : messages;
  const placeholder = useMemo(() => getPlaceholder(messages), [messages]);

  // True when the most recent assistant message has a completed, session-saved document
  const docJustGenerated = useMemo(() => {
    if (activeSession || !messages.length) return false;
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    return !!(last?.metadata?.generatedDoc?.sessionId);
  }, [messages, activeSession]);

  useEffect(() => { if (!initialized) loadMessages(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [displayMessages, loading]);
  useEffect(() => { if (!loading && !activeSession && !docJustGenerated) inputRef.current?.focus(); }, [loading, activeSession, docJustGenerated]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await sendMessage(text);

      // If a doc was generated, offer to save it
      if (res?.generatedDoc) {
        // Doc card is shown inline via message metadata
      }
    } catch (err) {
      if (err.code === 'SUBSCRIPTION_REQUIRED') {
        setShowSubModal(true);
      }
    }
  }

  async function saveDocument(docData) {
    try {
      if (!canCreateDoc()) { setShowSubModal(true); return; }

      // Structured docs are auto-saved as drafts on generation — just confirm
      if (docData.isStructured && docData.savedDocId) {
        useChatStore.getState().addMessage({
          id: `sys-${Date.now()}`,
          role: 'assistant',
          content: `Your ${docData.title} has been saved to your Documents library.`,
          created_at: Math.floor(Date.now() / 1000),
        });
        return;
      }

      // Legacy raw-text fallback
      const project_name = docData.project_name ||
        (typeof docData.content === 'object' ? docData.content?.project_name : null) ||
        null;
      const doc = await api.createDocument({
        type: docData.type,
        title: docData.title,
        project_name,
        content: { text: typeof docData.content === 'string' ? docData.content : JSON.stringify(docData.content) },
        status: 'draft',
      });
      addDocument(doc);
      useChatStore.getState().addMessage({
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Your ${docData.title} has been saved to your Documents library.`,
        created_at: Math.floor(Date.now() / 1000),
      });
    } catch (err) {
      if (err.code === 'SUBSCRIPTION_REQUIRED') setShowSubModal(true);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadLoading(true);
    try {
      const result = await api.chatUpload(file);
      // Store as pending attachment so it's passed with future messages
      setPendingAttachment({ url: result.url, filename: result.filename, mimetype: result.mimetype });
      // Add inline viewer as a local user message
      useChatStore.getState().addMessage({
        id: `upload-${Date.now()}`,
        role: 'user',
        content: '',
        metadata: { uploadedFile: result },
        created_at: Math.floor(Date.now() / 1000),
      });
      // Auto-send acknowledgement to Bear so it knows about the upload
      await sendMessage(`I've uploaded "${result.filename}" — please use it as the base document.`);
    } catch {
      useChatStore.getState().addMessage({
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, the file upload failed. Please try again.',
        created_at: Math.floor(Date.now() / 1000),
      });
    } finally {
      setUploadLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const isEmpty = displayMessages.length === 0 && !loading;

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      {/* Header */}
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={toggleSidebar} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
          <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {activeSession ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-bear-text truncate">{activeSession.session.title}</p>
              <p className="text-xs text-bear-muted truncate">
                {activeSession.session.project_name ? `${activeSession.session.project_name} · ` : ''}Past session
              </p>
            </div>
            <button
              onClick={exitSession}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-bear-accent hover:text-bear-accent-hover font-medium px-3 py-1.5 rounded-lg bg-bear-accent/10 hover:bg-bear-accent/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-bear-accent rounded-lg flex items-center justify-center">
              <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-bear-text">Bear</p>
              <p className="text-xs text-bear-muted">Construction Documents AI</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {isEmpty && !activeSession && <EmptyState />}

        <div className="space-y-4 max-w-2xl mx-auto">
          {displayMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onSaveDoc={activeSession ? null : saveDocument} />
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input — three states: past session view, doc just completed, or normal */}
      {(activeSession || docJustGenerated) ? (
        <div className="safe-bottom bg-bear-bg border-t border-bear-border px-4 py-4 flex-shrink-0">
          <div className="max-w-2xl mx-auto space-y-2">
            {docJustGenerated && (
              <p className="text-center text-xs text-bear-muted">Document saved to your library and Recent chats.</p>
            )}
            <button
              onClick={activeSession ? exitSession : startNewChat}
              className="w-full flex items-center justify-center gap-2 bg-bear-accent hover:bg-bear-accent-hover rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start New Chat
            </button>
          </div>
        </div>
      ) : (
        <div className="safe-bottom bg-bear-bg border-t border-bear-border px-4 py-3 flex-shrink-0">
          {/* Attachment indicator */}
          {pendingAttachment && (
            <div className="max-w-2xl mx-auto mb-2 flex items-center gap-2 px-3 py-1.5 bg-bear-accent/10 border border-bear-accent/20 rounded-xl">
              <svg className="w-3.5 h-3.5 text-bear-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-xs text-bear-accent flex-1 truncate">{pendingAttachment.filename}</span>
              <button onClick={() => setPendingAttachment(null)} className="text-bear-muted hover:text-bear-text text-xs">×</button>
            </div>
          )}
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            {/* Paperclip upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadLoading}
              title="Attach a file"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-bear-muted hover:text-bear-text hover:bg-bear-surface transition-colors flex-shrink-0 disabled:opacity-40"
            >
              {uploadLoading ? (
                <span className="w-4 h-4 border-2 border-bear-muted/30 border-t-bear-muted rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            <textarea
              ref={el => { textareaRef.current = el; inputRef.current = el; }}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
              disabled={loading}
              rows={1}
              className="flex-1 bg-bear-surface border border-bear-border rounded-2xl px-4 py-3 text-sm text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent resize-none transition-colors leading-relaxed"
              placeholder={placeholder}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-bear-accent rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showSubModal && <SubscriptionModal onClose={() => setShowSubModal(false)} />}
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function MessageBubble({ message, onSaveDoc }) {
  const isUser = message.role === 'user';
  const doc        = message.metadata?.generatedDoc;
  const uploadedFile = message.metadata?.uploadedFile;

  // Strip XML doc tags from display text; also hide the auto-upload message text
  const displayText = message.content
    .replace(/<document[^>]*>[\s\S]*?<\/document>/g, '')
    .trim();

  // Upload messages show the inline viewer, no bubble needed
  if (uploadedFile) {
    return (
      <div className="flex gap-2 animate-fade-in justify-end">
        <div className="w-full max-w-sm">
          <ChatFileViewer
            url={`${API_BASE}${uploadedFile.url}`}
            filename={uploadedFile.filename}
            mimetype={uploadedFile.mimetype}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex gap-2 animate-fade-in', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
        </div>
      )}
      <div className={clsx('max-w-xs sm:max-w-sm lg:max-w-md space-y-2', isUser && 'items-end flex flex-col')}>
        {displayText && (
          <div className={isUser ? 'bubble-user' : 'bubble-bear'}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
          </div>
        )}
        {doc && (
          <div className="w-full max-w-sm">
            <DocumentCard doc={doc} inline onSave={onSaveDoc ? () => onSaveDoc(doc) : null} />
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 justify-start animate-fade-in">
      <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
        <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
      </div>
      <div className="bubble-bear">
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-bear-muted rounded-full animate-pulse-dot" style={{ animationDelay: `${i * 0.16}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { sendMessage } = useChatStore();

  const DOC_CATEGORIES = [
    {
      label: 'Field Documents',
      docs: [
        { name: 'RFI', desc: 'Request for Information', prompt: 'I need to create an RFI', icon: '❓' },
        { name: 'Daily Field Report', desc: 'Site activity and progress log', prompt: 'I need a daily field report', icon: '📋' },
        { name: 'Punch List', desc: 'Outstanding items before closeout', prompt: 'I need a punch list', icon: '✅' },
        { name: 'Site Observation Report', desc: 'Architect or inspector site visit notes', prompt: 'I need a site observation report', icon: '🔍' },
        { name: 'Notice to Proceed', desc: 'Authorization to begin work', prompt: 'I need a notice to proceed', icon: '🚦' },
      ],
    },
    {
      label: 'Submittals & Approvals',
      docs: [
        { name: 'Submittal', desc: 'Product data, shop drawings, samples', prompt: 'I need to create a submittal', icon: '📁' },
        { name: 'Submittal Log', desc: 'Track all project submittals', prompt: 'I need a submittal log', icon: '📊' },
        { name: 'Transmittal', desc: 'Cover sheet for sending documents', prompt: 'I need a transmittal', icon: '📤' },
        { name: 'Request for Proposal', desc: 'Solicit pricing from subs or vendors', prompt: 'I need a request for proposal', icon: '📩' },
      ],
    },
    {
      label: 'Financial',
      docs: [
        { name: 'Invoice', desc: 'Bill for services rendered', prompt: 'I need to create an invoice', icon: '💵' },
        { name: 'AIA Pay App (G702/G703)', desc: 'Application and certificate for payment', prompt: 'I need an AIA pay application G702', icon: '🏦' },
        { name: 'Change Order (G701)', desc: 'Modify contract scope or price', prompt: 'I need a change order', icon: '🔄' },
        { name: 'Change Order Log', desc: 'Track all change orders on a project', prompt: 'I need a change order log', icon: '📈' },
        { name: 'Construction Change Directive', desc: 'AIA G714 — directed change before CO', prompt: 'I need a construction change directive', icon: '⚡' },
      ],
    },
    {
      label: 'Legal & Closeout',
      docs: [
        { name: 'Lien Waiver — Conditional Progress', desc: 'Waive lien rights upon payment', prompt: 'I need a conditional progress lien waiver', icon: '📜' },
        { name: 'Lien Waiver — Unconditional Progress', desc: 'Waive lien rights, payment received', prompt: 'I need an unconditional progress lien waiver', icon: '📜' },
        { name: 'Lien Waiver — Conditional Final', desc: 'Final waiver upon final payment', prompt: 'I need a conditional final lien waiver', icon: '📜' },
        { name: 'Lien Waiver — Unconditional Final', desc: 'Final waiver, payment confirmed', prompt: 'I need an unconditional final lien waiver', icon: '📜' },
        { name: 'Substantial Completion', desc: 'AIA G704 certificate of substantial completion', prompt: 'I need a certificate of substantial completion', icon: '🏁' },
        { name: 'Subcontract Agreement', desc: 'Short-form subcontract for trade work', prompt: 'I need a subcontract agreement', icon: '🤝' },
      ],
    },
    {
      label: 'Administrative',
      docs: [
        { name: 'Meeting Minutes', desc: 'Record of project meeting discussion', prompt: 'I need meeting minutes', icon: '🗒️' },
        { name: 'Weekly Report', desc: 'Weekly project status summary', prompt: 'I need a weekly report', icon: '📅' },
        { name: 'Contact Directory', desc: 'Project team contact list', prompt: 'I need a contact directory', icon: '📇' },
        { name: 'Project Summary', desc: 'High-level project overview', prompt: 'I need a project summary', icon: '🏗️' },
      ],
    },
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-bear-accent/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-bear-text">What do you need today?</h2>
          <p className="text-bear-muted text-sm mt-1">Select a document type to get started instantly.</p>
        </div>

        <div className="space-y-5">
          {DOC_CATEGORIES.map(({ label, docs }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-bear-muted uppercase tracking-widest mb-2 px-1">{label}</p>
              <div className="grid grid-cols-2 gap-2">
                {docs.map(({ name, desc, prompt, icon }) => (
                  <button
                    key={name}
                    onClick={() => sendMessage(prompt)}
                    className="card p-3 text-left hover:border-bear-accent/50 hover:bg-bear-surface/80 transition-all group"
                  >
                    <span className="text-lg leading-none mb-1 block">{icon}</span>
                    <p className="text-xs font-semibold text-bear-text group-hover:text-bear-accent transition-colors leading-snug">{name}</p>
                    <p className="text-xs text-bear-muted mt-0.5 leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
