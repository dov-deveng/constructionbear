import React, { useState } from 'react';
import { api } from '../api/index.js';
import { useAuthStore } from '../store/index.js';

const ROLES = ['Owner', 'Project Manager', 'Superintendent', 'Office Manager', 'Estimator', 'Other'];
const COMPANY_TYPES = ['General Contractor', 'Subcontractor', 'Owner/Developer', 'Architect', 'Engineer', 'Other'];

const SELECT_CLS = 'w-full bg-bear-bg border border-bear-border rounded-xl px-4 py-3 text-bear-text text-sm outline-none focus:border-bear-accent transition-colors appearance-none';
const INPUT_CLS = 'w-full bg-bear-bg border border-bear-border rounded-xl px-4 py-3 text-bear-text text-sm placeholder-bear-muted outline-none focus:border-bear-accent transition-colors';

// SS3 — 3-screen Save Gate Modal
// Screen 1: Value hook (email + password, min 8 chars)
// Screen 2: Company setup (name required + optional fields)
// Screen 3: Success / transition to AppShell
export default function SaveGateModal({ guestSession, generatedDoc, onClose }) {
  const [screen, setScreen] = useState(1); // 1 | 2 | 3
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.register(email.trim(), password);
      // Store token directly — do NOT call useAuthStore.login() yet
      // (that would trigger App.jsx re-render → redirect before company setup)
      localStorage.setItem('cb_token', res.token);
      setScreen(2);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  }

  async function submitCompanySetup(skip = false) {
    if (!skip && !companyName.trim()) { setError('Company name is required.'); return; }
    setError('');
    setLoading(true);
    try {
      // Create company (required)
      await api.createCompany((companyName || 'My Company').trim());

      // Save optional profile fields
      const profileUpdates = {};
      if (role) profileUpdates.role = role;
      if (companyType) profileUpdates.company_type = companyType;
      if (phone.trim()) profileUpdates.phone = phone.trim();
      if (licenseNumber.trim()) profileUpdates.license_number = licenseNumber.trim();
      if (address.trim()) profileUpdates.address = address.trim();
      if (Object.keys(profileUpdates).length > 0) {
        try { await api.updateProfile(profileUpdates); } catch { /* non-fatal */ }
      }

      // Save the generated doc to the new account
      if (generatedDoc?.isStructured && generatedDoc?.content) {
        try {
          await api.createDocument({
            type: generatedDoc.type,
            title: generatedDoc.title,
            project_name: generatedDoc.content?.project_name || generatedDoc.content?.project || null,
            content: generatedDoc.content,
            status: 'draft',
          });
        } catch { /* non-fatal */ }
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bear-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2 flex-shrink-0">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1.5 rounded-full transition-all duration-300 ${
              n === screen ? 'w-6 bg-bear-accent' : n < screen ? 'w-1.5 bg-bear-accent/40' : 'w-1.5 bg-bear-border'
            }`} />
          ))}
        </div>

        <div className="px-6 pb-8 pt-2 overflow-y-auto">
          {screen === 1 && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-bear-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-bear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-bear-text font-bold text-xl mb-1">Your document is ready.</h2>
                <p className="text-bear-muted text-sm">
                  Create a free account to save it, access it anytime, and generate unlimited documents.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={INPUT_CLS}
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Password (min 8 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={INPUT_CLS}
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-bear-accent hover:bg-bear-accent/90 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
                  style={{ height: '52px' }}
                >
                  {loading ? 'Creating account…' : 'Save and Create Account'}
                </button>
              </form>

              <div className="mt-4 text-center space-y-2">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="text-bear-muted text-xs hover:text-bear-text transition-colors"
                >
                  Already have an account? Sign in
                </button>
                <div>
                  <button
                    onClick={onClose}
                    className="text-bear-muted/50 text-xs hover:text-bear-muted transition-colors"
                  >
                    Continue without saving
                  </button>
                </div>
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
                <h2 className="text-bear-text font-bold text-xl mb-1">Tell us about your company</h2>
                <p className="text-bear-muted text-sm">
                  This information will auto-fill your documents so you never have to enter it twice.
                </p>
              </div>

              <form onSubmit={e => { e.preventDefault(); submitCompanySetup(false); }} className="space-y-3">
                <input
                  type="text"
                  placeholder="Company name *"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className={INPUT_CLS}
                  autoFocus
                />
                <div className="relative">
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className={SELECT_CLS + ' text-' + (role ? 'bear-text' : 'bear-muted')}
                  >
                    <option value="">Your role (optional)</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={companyType}
                    onChange={e => setCompanyType(e.target.value)}
                    className={SELECT_CLS + ' text-' + (companyType ? 'bear-text' : 'bear-muted')}
                  >
                    <option value="">Company type (optional)</option>
                    {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={INPUT_CLS}
                />
                <input
                  type="text"
                  placeholder="License number (optional)"
                  value={licenseNumber}
                  onChange={e => setLicenseNumber(e.target.value)}
                  className={INPUT_CLS}
                />
                <input
                  type="text"
                  placeholder="Company address (optional)"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className={INPUT_CLS}
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !companyName.trim()}
                  className="w-full bg-bear-accent hover:bg-bear-accent/90 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Saving…' : 'Save and Go to Dashboard'}
                </button>
              </form>

              <div className="mt-3 text-center">
                <button
                  onClick={() => submitCompanySetup(true)}
                  disabled={loading}
                  className="text-bear-muted text-xs hover:text-bear-text transition-colors"
                >
                  Skip for now
                </button>
              </div>
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
                onClick={onClose}
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
