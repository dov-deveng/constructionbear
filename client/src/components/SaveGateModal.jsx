import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { useAuthStore } from '../store/index.js';

const ROLES = ['Owner', 'Project Manager', 'Superintendent', 'Office Manager', 'Estimator', 'Other'];
const COMPANY_TYPES = ['General Contractor', 'Subcontractor', 'Owner/Developer', 'Architect', 'Engineer', 'Other'];

const INPUT = {
  style: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '14px 16px',
    fontSize: 16,
    color: '#fff',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
};

function Field({ type = 'text', placeholder, value, onChange, autoFocus }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      style={INPUT.style}
      onFocus={e => { e.target.style.borderColor = '#0A84FF'; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
    />
  );
}

function SelectField({ placeholder, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        ...INPUT.style,
        appearance: 'none',
        color: value ? '#fff' : 'rgba(255,255,255,0.35)',
      }}
      onFocus={e => { e.target.style.borderColor = '#0A84FF'; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
    >
      <option value="" style={{ color: '#999', background: '#1C1C1E' }}>{placeholder}</option>
      {options.map(o => <option key={o} value={o} style={{ color: '#fff', background: '#1C1C1E' }}>{o}</option>)}
    </select>
  );
}

// Change 4 — Save modal styled to match the app
export default function SaveGateModal({ guestSession, generatedDoc, onClose }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(1);
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
    setError(''); setLoading(true);
    try {
      const res = await api.register(email.trim(), password);
      localStorage.setItem('cb_token', res.token);
      setScreen(2);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different email.');
    } finally { setLoading(false); }
  }

  async function submitCompanySetup(skip = false) {
    if (!skip && !companyName.trim()) { setError('Company name is required.'); return; }
    setError(''); setLoading(true);
    try {
      await api.createCompany((companyName || 'My Company').trim());

      const profileUpdates = {};
      if (role) profileUpdates.role = role;
      if (companyType) profileUpdates.company_type = companyType;
      if (phone.trim()) profileUpdates.phone = phone.trim();
      if (licenseNumber.trim()) profileUpdates.license_number = licenseNumber.trim();
      if (address.trim()) profileUpdates.address = address.trim();
      if (Object.keys(profileUpdates).length > 0) {
        try { await api.updateProfile(profileUpdates); } catch { /* non-fatal */ }
      }

      if (generatedDoc?.isStructured && generatedDoc?.content) {
        try {
          await api.createDocument({
            type: generatedDoc.type, title: generatedDoc.title,
            project_name: generatedDoc.content?.project_name || generatedDoc.content?.project || null,
            content: generatedDoc.content, status: 'draft',
          });
        } catch { /* non-fatal */ }
      }

      if (guestSession?.leadId) {
        try { await api.convertLead(guestSession.leadId, null); } catch { /* non-fatal */ }
      }

      localStorage.removeItem('cb_guest_session');
      await useAuthStore.getState().init();
      setScreen(3);
    } catch (err) {
      setError(err.message || 'Failed to set up company. Please try again.');
    } finally { setLoading(false); }
  }

  const overlay = { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' };
  const sheet = { background: '#1C1C1E', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '95vh', overflowY: 'auto', padding: '28px 24px 40px', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' };

  return (
    <div style={overlay}>
      <div style={sheet}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{
              height: 6, borderRadius: 3, transition: 'all 0.3s',
              width: n === screen ? 24 : 6,
              background: n === screen ? '#0A84FF' : n < screen ? 'rgba(10,132,255,0.4)' : 'rgba(255,255,255,0.15)',
            }} />
          ))}
        </div>

        {screen === 1 && (
          <>
            {/* Bear icon */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: 'rgba(10,132,255,0.15)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <img src="/bear.png" alt="Bear" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 600, margin: '0 0 6px' }}>Save your document</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: 0 }}>
                Create a free account to access it anytime
              </p>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              <Field type="password" placeholder="Password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} />
              {error && <p style={{ color: '#FF453A', fontSize: 13, margin: 0 }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{ background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 12, height: 52, fontSize: 16, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {loading ? 'Creating account…' : 'Save and Create Account'}
              </button>
            </form>

            {/* Google OAuth */}
            <button
              onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL || ''}/auth/google?redirect_after_login=true`; }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', height: 48, marginTop: 10, background: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => navigate('/login')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Already have an account? Sign in
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Continue without saving
              </button>
            </div>
          </>
        )}

        {screen === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: 'rgba(10,132,255,0.15)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <img src="/bear.png" alt="Bear" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 600, margin: '0 0 6px' }}>Tell us about your company</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: 0 }}>
                This information will auto-fill your documents so you never have to enter it twice.
              </p>
            </div>

            <form onSubmit={e => { e.preventDefault(); submitCompanySetup(false); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field placeholder="Company name *" value={companyName} onChange={e => setCompanyName(e.target.value)} autoFocus />
              <SelectField placeholder="Your role (optional)" value={role} onChange={e => setRole(e.target.value)} options={ROLES} />
              <SelectField placeholder="Company type (optional)" value={companyType} onChange={e => setCompanyType(e.target.value)} options={COMPANY_TYPES} />
              <Field type="tel" placeholder="Phone number (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
              <Field placeholder="License number (optional)" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
              <Field placeholder="Company address (optional)" value={address} onChange={e => setAddress(e.target.value)} />
              {error && <p style={{ color: '#FF453A', fontSize: 13, margin: 0 }}>{error}</p>}
              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                style={{ background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 12, height: 52, fontSize: 16, fontWeight: 600, cursor: (loading || !companyName.trim()) ? 'not-allowed' : 'pointer', opacity: (loading || !companyName.trim()) ? 0.5 : 1, fontFamily: 'inherit' }}
              >
                {loading ? 'Saving…' : 'Save and Go to Dashboard'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={() => submitCompanySetup(true)}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {screen === 3 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(52,199,89,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#34C759" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>You're in.</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '0 0 24px' }}>
              Your document has been saved. Bear is ready to work.
            </p>
            <button
              onClick={onClose}
              style={{ background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 12, height: 52, fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
