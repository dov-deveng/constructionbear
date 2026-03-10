import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { api } from '../api/index.js';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hey! Welcome to ConstructionBear.AI — I'm Bear. Before we get started, I need a few details about your company. This takes about 2 minutes and only happens once.\n\nWhat's your company name?",
};

export default function OnboardingScreen() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { setProfile } = useAuthStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Only send role/content to API
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.onboardingChat(apiMessages);

      setMessages(prev => [...prev, { role: 'assistant', content: res.message }]);

      if (res.profileComplete) {
        setDone(true);
        // Refresh profile
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
        <div className={`h-full bg-bear-accent transition-all duration-500 ${done ? 'w-full' : 'w-1/3'}`} />
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
