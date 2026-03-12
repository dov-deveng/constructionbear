import React, { useState } from 'react';
import { api } from '../api/index.js';
import { useAuthStore } from '../store/index.js';

// SS3 — 3-screen Save Gate Modal
// Screen 1: Value hook (email + password)
// Screen 2: Company setup (company name)
// Screen 3: Success / transition to AppShell
export default function SaveGateModal({ guestSession, generatedDoc, onClose }) {
  const [screen, setScreen] = useState(1); // 1 | 2 | 3
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredToken, setRegisteredToken] = useState(null);

  async function handleRegister(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.register(email.trim(), password);
      // Store token directly — do NOT call useAuthStore.login() yet
      // (that would trigger App.jsx re-render → redirect before company setup)
      localStorage.setItem('cb_token', res.token);
      setRegisteredToken(res.token);
      setScreen(2);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanySetup(e) {
    e.preventDefault();
    if (!companyName.trim()) { setError('Company name is required.'); return; }
    setError('');
    setLoading(true);
    try {
      // Create company
      await api.createCompany(companyName.trim());

      // Save the generated doc to the new account if we have one
      if (generatedDoc?.isStructured && generatedDoc?.content) {
        try {
          await api.createDocument({
            type: generatedDoc.type,
            title: generatedDoc.title,
            project_name: generatedDoc.content?.project_name || generatedDoc.content?.project || null,
            content: generatedDoc.content,
            status: 'draft',
          });
        } catch { /* doc save failure is non-fatal */ }
      }

      // Mark lead as converted
      if (guestSession?.leadId) {
        try { await api.convertLead(guestSession.leadId, null); } catch { /* non-fatal */ }
      }

      // Clear guest session
      localStorage.removeItem('cb_guest_session');

      // Now fully initialize auth store — triggers App.jsx re-render → AppShell
      await useAuthStore.getState().init();
      setScreen(3);
    } catch (err) {
      setError(err.message || 'Failed to set up company. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bear-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1.5 rounded-full transition-all duration-300 ${
              n === screen ? 'w-6 bg-bear-accent' : n < screen ? 'w-1.5 bg-bear-accent/40' : 'w-1.5 bg-bear-border'
            }`} />
          ))}
        </div>

        <div className="px-6 pb-8 pt-2">
          {screen === 1 && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-bear-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-bear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-bear-text font-bold text-xl mb-1">Save your document</h2>
                <p className="text-bear-muted text-sm">
                  Create a free account to save{generatedDoc?.title ? ` "${generatedDoc.title}"` : ' your document'} and access it anytime.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <input
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-bear-bg border border-bear-border rounded-xl px-4 py-3 text-bear-text text-sm placeholder-bear-muted outline-none focus:border-bear-accent transition-colors"
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Create password (min 6 chars)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-bear-bg border border-bear-border rounded-xl px-4 py-3 text-bear-text text-sm placeholder-bear-muted outline-none focus:border-bear-accent transition-colors"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-bear-accent hover:bg-bear-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Creating account…' : 'Create Free Account'}
                </button>
              </form>

              <div className="mt-4 text-center space-y-2">
                <p className="text-bear-muted/60 text-xs">
                  Free plan includes 2 documents. No credit card required.
                </p>
                <button
                  onClick={onClose}
                  className="text-bear-muted text-xs hover:text-bear-text transition-colors"
                >
                  Continue without saving
                </button>
              </div>
            </>
          )}

          {screen === 2 && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-bear-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-bear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-bear-text font-bold text-xl mb-1">Name your company</h2>
                <p className="text-bear-muted text-sm">
                  Bear will use this on all your documents and invoices.
                </p>
              </div>

              <form onSubmit={handleCompanySetup} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. Acme Construction LLC"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-bear-bg border border-bear-border rounded-xl px-4 py-3 text-bear-text text-sm placeholder-bear-muted outline-none focus:border-bear-accent transition-colors"
                  autoFocus
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !companyName.trim()}
                  className="w-full bg-bear-accent hover:bg-bear-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Setting up…' : 'Save Document & Continue'}
                </button>
              </form>
            </>
          )}

          {screen === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-bear-text font-bold text-xl mb-2">You're in.</h2>
              <p className="text-bear-muted text-sm mb-6">
                Your document has been saved. Bear is ready to work.
              </p>
              <button
                onClick={handleDone}
                className="w-full bg-bear-accent hover:bg-bear-accent/90 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
