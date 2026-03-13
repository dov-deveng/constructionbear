import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { InlineDocPreview } from '../components/DocumentCard.jsx';
import SaveGateModal from '../components/SaveGateModal.jsx';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const SESSION_KEY = 'cb_guest_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;

// Actions that require an account — handled with inline upsell instead of a modal
const GATED_KEYWORDS = [
  'upload', 'attach file', 'add image', 'add photo', 'markup', 'annotate',
  'import contact', 'import project', 'collaborate', 'my team', 'share doc',
  'document history', 'saved document', 'my library',
];
function isGatedAction(text) {
  const lower = text.toLowerCase();
  return GATED_KEYWORDS.some(k => lower.includes(k));
}

function loadGuestSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() - s.created_at > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}
function saveGuestSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function newGuestSession() {
  const s = { id: uuidv4(), created_at: Date.now(), messages: [], generatedDoc: null, leadId: null };
  saveGuestSession(s);
  return s;
}

// Full 24-doc grid — identical to authenticated EmptyState
const ALL_DOCS = [
  { label: 'RFI',                  mLabel: 'RFI',               prompt: 'I need to create an RFI' },
  { label: 'Change Order',         mLabel: 'Change Order',       prompt: 'I need a change order' },
  { label: 'Submittal',            mLabel: 'Submittal',          prompt: 'I need to create a submittal' },
  { label: 'Lien Waiver',          mLabel: 'Lien Waiver',        prompt: 'I need a lien waiver' },
  { label: 'Invoice',              mLabel: 'Invoice',            prompt: 'I need to create an invoice' },
  { label: 'AIA Pay App',          mLabel: 'Pay App',            prompt: 'I need an AIA pay application' },
  { label: 'Daily Field Report',   mLabel: 'Daily Report',       prompt: 'I need a daily field report' },
  { label: 'Meeting Minutes',      mLabel: 'Meeting Minutes',    prompt: 'I need meeting minutes' },
  { label: 'Punch List',           mLabel: 'Punch List',         prompt: 'I need a punch list' },
  { label: 'Transmittal',          mLabel: 'Transmittal',        prompt: 'I need a transmittal' },
  { label: 'Notice to Proceed',    mLabel: 'NTP',                prompt: 'I need a notice to proceed' },
  { label: 'Subcontract',          mLabel: 'Subcontract',        prompt: 'I need a subcontract agreement' },
  { label: 'Change Order Log',     mLabel: 'CO Log',             prompt: 'I need a change order log' },
  { label: 'Submittal Log',        mLabel: 'Submittal Log',      prompt: 'I need a submittal log' },
  { label: 'Request for Proposal', mLabel: 'RFP',                prompt: 'I need a request for proposal' },
  { label: 'Change Directive',     mLabel: 'Change Directive',   prompt: 'I need a construction change directive' },
  { label: 'Substantial Comp.',    mLabel: 'Substantial Comp.',  prompt: 'I need a certificate of substantial completion' },
  { label: 'Notice to Owner',      mLabel: 'Notice to Owner',    prompt: 'I need a notice to owner' },
  { label: 'Site Observation',     mLabel: 'Site Observation',   prompt: 'I need a site observation report' },
  { label: 'Weekly Report',        mLabel: 'Weekly Report',      prompt: 'I need a weekly report' },
  { label: 'Certified Payroll',    mLabel: 'Cert. Payroll',      prompt: 'I need a certified payroll report' },
  { label: 'Warranty Letter',      mLabel: 'Warranty Letter',    prompt: 'I need a warranty letter' },
  { label: 'Substitution Req.',    mLabel: 'Substitution',       prompt: 'I need a substitution request' },
  { label: 'Closeout Checklist',   mLabel: 'Closeout',           prompt: 'I need a closeout checklist' },
];

function buildRows(docs) {
  const rows = []; let i = 0, rowNum = 0;
  while (i < docs.length) { const size = rowNum % 2 === 0 ? 4 : 5; rows.push(docs.slice(i, i + size)); i += size; rowNum++; }
  return rows;
}

function DocGrid({ onSelect }) {
  const rows = buildRows(ALL_DOCS);
  return (
    <>
      <style>{`
        .g-tile{flex:0 0 auto;background:#1C1C1E;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-weight:500;font-size:13px;color:rgba(255,255,255,0.85);padding:12px 18px;white-space:nowrap;cursor:pointer;transition:background 150ms,border-color 150ms,transform 120ms;user-select:none;-webkit-tap-highlight-color:transparent;}
        @media(hover:hover){.g-tile:hover{background:rgba(10,132,255,0.12);border-color:#0A84FF;color:#fff;}}
        .g-tile:active{transform:scale(0.97);background:rgba(10,132,255,0.15);border-color:#0A84FF;color:#fff;}
        @media(max-width:767px){.g-desk{display:none!important;}.g-mob{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0;}.g-tile-m{display:flex;align-items:center;justify-content:center;height:48px;background:#1C1C1E;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-weight:500;font-size:13px;color:rgba(255,255,255,0.85);text-align:center;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 10px;-webkit-tap-highlight-color:transparent;user-select:none;transition:background 150ms,border-color 150ms,transform 120ms;}.g-tile-m:active{transform:scale(0.97);background:rgba(10,132,255,0.15);border-color:#0A84FF;color:#fff;}}
        @media(min-width:768px){.g-mob{display:none!important;}}
      `}</style>
      <div className="g-desk" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {row.map(({ label, prompt }) => (
              <button key={label} className="g-tile" onClick={() => onSelect(prompt)}>{label}</button>
            ))}
          </div>
        ))}
      </div>
      <div className="g-mob">
        {ALL_DOCS.map(({ mLabel, prompt }) => (
          <button key={mLabel} className="g-tile-m" onClick={() => onSelect(prompt)}>{mLabel}</button>
        ))}
      </div>
    </>
  );
}

const DEFAULT_PLACEHOLDER = 'Ask Bear to create an RFI, Change Order, Submittal...';

export default function GuestShell() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => loadGuestSession() || newGuestSession());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const docJustGenerated = useMemo(() => {
    if (!session.messages.length) return false;
    const last = [...session.messages].reverse().find(m => m.role === 'assistant');
    return !!(last?.generatedDoc);
  }, [session.messages]);

  const lastGeneratedDoc = useMemo(() => {
    if (!docJustGenerated) return null;
    const last = [...session.messages].reverse().find(m => m.role === 'assistant');
    return last?.generatedDoc || null;
  }, [session.messages, docJustGenerated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, loading]);

  function updateSession(updates) {
    setSession(prev => { const next = { ...prev, ...updates }; saveGuestSession(next); return next; });
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  function selectDoc(prompt) { send(prompt); }

  async function send(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    // Change 5 — gated action: inline upsell, no modal
    if (isGatedAction(text)) {
      const userMsg = { id: uuidv4(), role: 'user', content: text, created_at: Date.now() };
      const upsell = {
        id: uuidv4(), role: 'assistant', isUpsell: true, created_at: Date.now(),
        content: "That feature is included with a free account — it takes about 30 seconds to set up and you'll also be able to save this document permanently. Want me to help you get started?",
      };
      updateSession({ messages: [...session.messages, userMsg, upsell] });
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    const userMsg = { id: uuidv4(), role: 'user', content: text, created_at: Date.now() };
    const history = session.messages.map(m => ({ role: m.role, content: m.content }));
    const nextMessages = [...session.messages, userMsg];
    updateSession({ messages: nextMessages });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await api.guestChat(text, history, session.id);
      const assistantMsg = {
        id: res.id || uuidv4(), role: 'assistant',
        content: res.message, generatedDoc: res.generatedDoc || null, created_at: Date.now(),
      };
      const withAssistant = [...nextMessages, assistantMsg];
      updateSession({ messages: withAssistant, generatedDoc: res.generatedDoc || null });

      if (res.generatedDoc?.isComplete && !session.leadId) {
        try {
          const lead = await api.captureLead(session.id, res.generatedDoc.type, res.generatedDoc.content || {});
          if (lead?.id) updateSession({ leadId: lead.id });
        } catch { /* non-fatal */ }
      }
    } catch {
      updateSession({ messages: [...nextMessages, { id: uuidv4(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: Date.now() }] });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function startOver() { setSession(newGuestSession()); setInput(''); }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0A0F' }}>

      {/* Header — Change 1: matches authenticated header */}
      <header className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 52, background: '#111116', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#0A84FF' }}>
            <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold text-bear-text text-sm tracking-tight">ConstructionBear</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-medium text-bear-muted hover:text-bear-text transition-colors px-3 py-1.5"
          >
            Sign In
          </button>
          <button
            onClick={() => textareaRef.current?.focus()}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-white"
            style={{ background: '#0A84FF' }}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Chat + empty state */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Change 2 — full doc grid on empty state */}
        {session.messages.length === 0 && (
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 0' }}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(10,132,255,0.15)' }}>
                <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-xl font-bold text-bear-text">What do you need today?</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                No login required. Create any construction document instantly.
              </p>
            </div>
            <DocGrid onSelect={selectDoc} />
          </div>
        )}

        {session.messages.map(msg => (
          <div key={msg.id} className="space-y-3">
            {/* Text bubble row */}
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <img src="/bear.png" alt="Bear" className="w-5 h-5 object-contain" />
                </div>
              )}
              <div className="max-w-[85%] space-y-2">
                <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-bear-accent text-white rounded-tr-sm'
                    : 'bg-bear-surface text-bear-text rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.isUpsell && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
                    style={{ background: '#0A84FF' }}
                  >
                    Create Free Account
                  </button>
                )}
              </div>
            </div>
            {/* Doc preview — full width, indented to align with bear messages */}
            {msg.generatedDoc && msg.role === 'assistant' && (
              <div style={{ paddingLeft: 36 }}>
                <InlineDocPreview doc={msg.generatedDoc} onSave={() => setShowSaveModal(true)} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <img src="/bear.png" alt="Bear" className="w-5 h-5 object-contain" />
            </div>
            <div className="bg-bear-surface rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 bg-bear-muted rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Post-doc save CTA */}
      {docJustGenerated && (
        <div className="px-4 pb-2 flex gap-2 animate-slide-up">
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex-1 py-3.5 text-white font-semibold text-sm rounded-2xl transition-opacity hover:opacity-90"
            style={{ background: '#0A84FF' }}
          >
            Save to Library — Create Free Account
          </button>
          <button
            onClick={startOver}
            className="px-4 py-3.5 text-sm font-medium text-bear-muted hover:text-bear-text bg-bear-surface rounded-2xl transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Input bar — Change 1: identical to authenticated chat input */}
      {!docJustGenerated && (
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <div className="flex items-end gap-2 rounded-2xl border px-3 py-2"
            style={{ background: '#1C1C1E', borderColor: 'rgba(255,255,255,0.10)' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder={DEFAULT_PLACEHOLDER}
              rows={1}
              className="flex-1 bg-transparent text-bear-text text-sm placeholder-bear-muted resize-none outline-none py-1.5 leading-relaxed"
              style={{ maxHeight: 140, fontSize: 16 }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#0A84FF' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-center mt-2" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
            No account needed. Save documents by creating a free account.
          </p>
        </div>
      )}

      {showSaveModal && (
        <SaveGateModal
          guestSession={session}
          generatedDoc={lastGeneratedDoc}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
