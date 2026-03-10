import React, { useState } from 'react';
import { useAuthStore, useUIStore } from '../store/index.js';
import { api } from '../api/index.js';

export default function ProfileScreen() {
  const { profile, setProfile } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [form, setForm] = useState({
    company_name: profile?.company_name || '',
    owner_name: profile?.owner_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    zip: profile?.zip || '',
    license_number: profile?.license_number || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateProfile(form);
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      const res = await api.uploadLogo(file);
      setProfile({ ...profile, logo_path: res.logo_path });
    } catch (err) {
      setError('Failed to upload logo');
    } finally {
      setLogoLoading(false);
    }
  }

  async function handleLogoDelete() {
    await api.deleteLogo();
    setProfile({ ...profile, logo_path: null });
  }

  const logoUrl = profile?.logo_path ? `/api${profile.logo_path}` : null;

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={toggleSidebar} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
          <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-bear-text">Company Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Logo */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-bear-text mb-3">Company Logo</h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-bear-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoLoading ? (
                  <div className="w-5 h-5 border-2 border-bear-accent/30 border-t-bear-accent rounded-full animate-spin" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-3xl">🏗️</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary text-sm py-2 px-3 cursor-pointer">
                  {logoUrl ? 'Replace' : 'Upload Logo'}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {logoUrl && (
                  <button onClick={handleLogoDelete} className="text-xs text-red-400 hover:underline text-left">Remove</button>
                )}
                <p className="text-xs text-bear-muted">PNG, JPG up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-bear-text">Company Details</h2>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-xl">{error}</div>}

            <Field label="Company Name" name="company_name" value={form.company_name} onChange={handleChange} placeholder="ABC Contractors LLC" />
            <Field label="Owner / Contact Name" name="owner_name" value={form.owner_name} onChange={handleChange} placeholder="John Smith" />
            <Field label="Business Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="contact@abccontractors.com" />
            <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="(305) 555-0100" />
            <Field label="Address" name="address" value={form.address} onChange={handleChange} placeholder="123 Main St" />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Field label="City" name="city" value={form.city} onChange={handleChange} placeholder="Miami" />
              </div>
              <div className="col-span-1">
                <Field label="State" name="state" value={form.state} onChange={handleChange} placeholder="FL" maxLength={2} />
              </div>
              <div className="col-span-1">
                <Field label="ZIP" name="zip" value={form.zip} onChange={handleChange} placeholder="33101" />
              </div>
            </div>

            <Field label="Contractor License #" name="license_number" value={form.license_number} onChange={handleChange} placeholder="CGC1234567" />

            <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', placeholder, maxLength }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bear-muted mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="input-field text-sm py-2.5"
      />
    </div>
  );
}
