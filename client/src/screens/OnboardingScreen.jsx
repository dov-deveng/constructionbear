import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { api } from '../api/index.js';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Great — your company is set up. Now let me get a few more details about your business. This takes about 2 minutes and only happens once.\n\nWhat's your full company name as it should appear on documents?",
};

// ── Company Setup Step ─────────────────────────────────────────────────────────
function CompanySetupStep({ onComplete }) {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const company = await api.createCompany(name.trim());
      onComplete(company);
    } catch (err) {
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const company = await api.joinCompany(code.trim().toUpperCase());
      onComplete(company);
    } catch (err) {
      setError(err.message || 'Invalid company code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full bg-bear-bg flex flex-col">
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-bear-accent rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🐻</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-bear-text">Bear</p>
          <p className="text-xs text-bear-muted">Company setup</p>
        </div>
      </div>

      <div className="h-0.5 bg-bear-border">
        <div className="h-full bg-bear-accent w-1/4 transition-all duration-500" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-bear-text">Welcome to ConstructionBear</h2>
            <p className="text-sm text-bear-muted mt-1">Are you starting a new account or joining a team?</p>
          </div>

          {!mode && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-bear-border hover:border-bear-accent hover:bg-bear-accent/5 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-bear-accent/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-bear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-bear-text">Create a new company</p>
                  <p className="text-xs text-bear-muted">I'm setting up a new account</p>
                </div>
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-bear-border hover:border-bear-accent hover:bg-bear-accent/5 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-bear-accent/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-bear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-bear-text">Join an existing company</p>
                  <p className="text-xs text-bear-muted">I have a company code from my team</p>
                </div>
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <button type="button" onClick={() => { setMode(null); setError(''); }} className="text-xs text-bear-muted hover:text-bear-text flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <div>
                <label className="block text-xs font-medium text-bear-muted mb-1">Company Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ABC Contractors LLC"
                  className="input-field text-sm py-2.5"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={!name.trim() || loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Company'}
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <button type="button" onClick={() => { setMode(null); setError(''); }} className="text-xs text-bear-muted hover:text-bear-text flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <div>
                <label className="block text-xs font-medium text-bear-muted mb-1">Company Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="input-field text-sm py-2.5 tracking-widest font-mono uppercase"
                  autoFocus
                />
                <p className="text-xs text-bear-muted mt-1">Ask your account admin for the 6-character code.</p>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={code.trim().length < 6 || loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Join Company'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat Onboarding Step ───────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [companyReady, setCompanyReady] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { company, setProfile, setCompany } = useAuthStore();

  // If user already has a company, skip company step
  useEffect(() => {
    if (company) setCompanyReady(true);
  }, [company]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading && companyReady) inputRef.current?.focus();
  }, [loading, companyReady]);

  function handleCompanyComplete(companyData) {
    setCompany(companyData);
    setCompanyReady(true);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.onboardingChat(apiMessages);

      setMessages(prev => [...prev, { role: 'assistant', content: res.message }]);

      if (res.profileComplete) {
        setDone(true);
        const profile = await api.getProfile();
        setProfile(profile);
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, something went wrong. Let's try again — what was that?",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (!companyReady) {
    return <CompanySetupStep onComplete={handleCompanyComplete} />;
  }

  return (
    <div className="h-full bg-bear-bg flex flex-col">
      {/* Header */}
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-bear-accent rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🐻</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-bear-text">Bear</p>
          <p className="text-xs text-bear-muted">Setting up your profile</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-bear-border">
        <div className={`h-full bg-bear-accent transition-all duration-500 ${done ? 'w-full' : 'w-1/2'}`} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <span className="text-sm">🐻</span>
              </div>
            )}
            <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-bear'}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content.replace(/<profile>[\s\S]*?<\/profile>/g, '').trim()}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-7 h-7 bg-bear-accent rounded-lg flex items-center justify-center mr-2 mt-1">
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
        )}

        {done && (
          <div className="text-center py-4 animate-fade-in">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-bear-muted text-sm">Profile saved. Taking you to the app...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!done && (
        <div className="safe-bottom bg-bear-bg border-t border-bear-border px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              rows={1}
              className="flex-1 bg-bear-surface border border-bear-border rounded-2xl px-4 py-3 text-sm text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent resize-none transition-colors"
              placeholder="Type your answer..."
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-bear-accent rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
