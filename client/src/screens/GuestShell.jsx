import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { InlineDocCard } from '../components/DocumentCard.jsx';
import SaveGateModal from '../components/SaveGateModal.jsx';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const SESSION_KEY = 'cb_guest_session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24h

function loadGuestSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() - s.created_at > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function saveGuestSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function newGuestSession() {
  const s = { id: uuidv4(), created_at: Date.now(), messages: [], generatedDoc: null, leadId: null };
  saveGuestSession(s);
  return s;
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
    setSession(prev => {
      const next = { ...prev, ...updates };
      saveGuestSession(next);
      return next;
    });
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: uuidv4(), role: 'user', content: text, created_at: Date.now() };
    const history = session.messages.map(m => ({ role: m.role, content: m.content }));

    const nextMessages = [...session.messages, userMsg];
    updateSession({ messages: nextMessages });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await api.guestChat(text, history);
      const assistantMsg = {
        id: res.id || uuidv4(),
        role: 'assistant',
        content: res.message,
        generatedDoc: res.generatedDoc || null,
        created_at: Date.now(),
      };
      const withAssistant = [...nextMessages, assistantMsg];
      updateSession({ messages: withAssistant, generatedDoc: res.generatedDoc || null });

      // Lead capture after doc generation
      if (res.generatedDoc?.isComplete && !session.leadId) {
        try {
          const lead = await api.captureLead(
            session.id,
            res.generatedDoc.type,
            res.generatedDoc.content || {}
          );
          if (lead?.id) updateSession({ leadId: lead.id });
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      const errMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: Date.now(),
      };
      updateSession({ messages: [...nextMessages, errMsg] });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function startOver() {
    const s = newGuestSession();
    setSession(s);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full bg-bear-bg">
      {/* Guest Header — SS7 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-bear-border bg-bear-surface flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-bear-accent rounded-xl flex items-center justify-center">
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
            onClick={() => navigate('/register')}
            className="text-xs font-semibold bg-bear-accent hover:bg-bear-accent/90 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {session.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-bear-accent/10 rounded-2xl flex items-center justify-center">
              <img src="/bear.png" alt="Bear" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h2 className="text-bear-text font-semibold text-lg mb-1">Hi, I'm Bear.</h2>
              <p className="text-bear-muted text-sm max-w-xs">
                I create construction documents for you — RFIs, Change Orders, Submittals, Pay Apps, and more. No login required.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Draft an RFI', 'Create a Change Order', 'Build a Submittal', 'Write Meeting Minutes'].map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="text-xs bg-bear-surface border border-bear-border text-bear-muted hover:text-bear-text hover:border-bear-accent/40 px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {session.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <img src="/bear.png" alt="Bear" className="w-5 h-5 object-contain" />
              </div>
            )}
            <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? '' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-bear-accent text-white rounded-tr-sm'
                  : 'bg-bear-surface text-bear-text rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.generatedDoc && (
                <InlineDocCard
                  doc={msg.generatedDoc}
                  onSave={() => setShowSaveModal(true)}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <img src="/bear.png" alt="Bear" className="w-5 h-5 object-contain" />
            </div>
            <div className="bg-bear-surface rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-bear-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-bear-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-bear-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Post-doc Save CTA */}
      {docJustGenerated && (
        <div className="px-4 pb-2 flex gap-2 animate-slide-up">
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex-1 py-3.5 bg-bear-accent hover:bg-bear-accent/90 text-white font-semibold text-sm rounded-2xl transition-colors"
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

      {/* Input area */}
      {!docJustGenerated && (
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <div className="flex items-end gap-2 bg-bear-surface rounded-2xl border border-bear-border px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder={DEFAULT_PLACEHOLDER}
              rows={1}
              className="flex-1 bg-transparent text-bear-text text-sm placeholder-bear-muted resize-none outline-none py-1.5 leading-relaxed"
              style={{ maxHeight: '140px' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-bear-accent hover:bg-bear-accent/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-center text-bear-muted/50 text-[10px] mt-2">
            No account needed. Save documents by creating a free account.
          </p>
        </div>
      )}

      {/* Save Gate Modal — SS3 */}
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
