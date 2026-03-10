import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, useUIStore, useDocStore, useAuthStore } from '../store/index.js';
import { api } from '../api/index.js';
import DocumentCard from '../components/DocumentCard.jsx';
import SubscriptionModal from '../components/SubscriptionModal.jsx';
import clsx from 'clsx';

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [showSubModal, setShowSubModal] = useState(false);
  const { messages, loading, initialized, loadMessages, sendMessage } = useChatStore();
  const { toggleSidebar } = useUIStore();
  const { addDocument } = useDocStore();
  const { canCreateDoc } = useAuthStore();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { if (!initialized) loadMessages(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

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
      const doc = await api.createDocument({
        type: docData.type,
        title: docData.title,
        content: { text: docData.content },
        status: 'draft',
      });
      addDocument(doc);
      // Send confirmation message
      useChatStore.getState().addMessage({
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Document saved to your library. You can find it under Documents.`,
        created_at: Math.floor(Date.now() / 1000),
      });
    } catch (err) {
      if (err.code === 'SUBSCRIPTION_REQUIRED') setShowSubModal(true);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      {/* Header */}
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={toggleSidebar} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
          <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 bg-bear-accent rounded-lg flex items-center justify-center">
            <span className="text-base">🐻</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-bear-text">Bear</p>
            <p className="text-xs text-bear-muted">Construction Documents AI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {isEmpty && <EmptyState />}

        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onSaveDoc={saveDocument} />
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="safe-bottom bg-bear-bg border-t border-bear-border px-4 py-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={el => { textareaRef.current = el; inputRef.current = el; }}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            disabled={loading}
            rows={1}
            className="flex-1 bg-bear-surface border border-bear-border rounded-2xl px-4 py-3 text-sm text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent resize-none transition-colors leading-relaxed"
            placeholder="Ask Bear to create an RFI, Change Order, Submittal..."
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

      {showSubModal && <SubscriptionModal onClose={() => setShowSubModal(false)} />}
    </div>
  );
}

function MessageBubble({ message, onSaveDoc }) {
  const isUser = message.role === 'user';
  const doc = message.metadata?.generatedDoc;

  // Strip XML doc tags from display text
  const displayText = message.content
    .replace(/<document[^>]*>[\s\S]*?<\/document>/g, '')
    .trim();

  return (
    <div className={clsx('flex gap-2 animate-fade-in', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-sm">🐻</span>
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
            <DocumentCard doc={doc} inline onSave={() => onSaveDoc(doc)} />
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
        <span className="text-sm">🐻</span>
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

  const QUICK_STARTS = [
    { label: 'Create an RFI', prompt: 'I need to create an RFI' },
    { label: 'Write a Change Order', prompt: 'I need a change order' },
    { label: 'Make a Submittal', prompt: 'I need to create a submittal' },
    { label: 'Draft a Lien Waiver', prompt: 'I need a lien waiver' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-bear-accent/15 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-3xl">🐻</span>
      </div>
      <h2 className="text-xl font-bold text-bear-text mb-2">What do you need today?</h2>
      <p className="text-bear-muted text-sm mb-6">Tell me what document you need and I'll create it instantly.</p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        {QUICK_STARTS.map(({ label, prompt }) => (
          <button
            key={label}
            onClick={() => sendMessage(prompt)}
            className="card px-3 py-3 text-xs font-medium text-bear-muted hover:text-bear-text hover:border-bear-accent/50 transition-colors text-left"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
