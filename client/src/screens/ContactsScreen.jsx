import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/index.js';
import ComposeButton from '../components/ComposeButton.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Dynamically load the Google Identity Services script once
function loadGsi() {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gsi-script');
    if (existing) { existing.addEventListener('load', resolve); return; }
    const s = document.createElement('script');
    s.id = 'gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function fetchGoogleContacts(token) {
  let allConnections = [];
  let pageToken;
  do {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,organizations',
      pageSize: 1000,
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(`https://people.googleapis.com/v1/people/me/connections?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Google contacts');
    const data = await res.json();
    if (data.connections) allConnections = allConnections.concat(data.connections);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allConnections
    .map(p => ({
      name: p.names?.[0]?.displayName,
      email: p.emailAddresses?.[0]?.value || '',
      phone: p.phoneNumbers?.[0]?.value || '',
      company: p.organizations?.[0]?.name || '',
      role: p.organizations?.[0]?.title || '',
    }))
    .filter(c => c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [googleImport, setGoogleImport] = useState(null); // { contacts: [], selected: Set }
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleImporting, setGoogleImporting] = useState(false);
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    loadContacts();
    api.getProjects({ limit: 100 }).then(d => setProjects(d.projects)).catch(() => {});
  }, []);

  async function loadContacts() {
    setLoading(true);
    try {
      const data = await api.getContacts({ limit: 200 });
      setContacts(data.contacts);
    } catch {
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  const filtered = contacts.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const projectMap = projects.reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {});

  const grouped = filtered.reduce((acc, c) => {
    const letter = c.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  async function handleSave(e) {
    e.preventDefault();
    if (!form.role?.trim()) { setError('Role / Title is required'); return; }
    if (!form.project_id) { setError('Project link is required — every contact must be linked to a project'); return; }
    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await api.updateContact(form.id, form);
      } else {
        await api.createContact(form);
      }
      await loadContacts();
      setShowForm(false);
      setForm({});
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGoogleImport() {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
      return;
    }
    setGoogleLoading(true);
    setGoogleError('');
    try {
      await loadGsi();
      const token = await new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/contacts.readonly',
          callback: (resp) => {
            if (resp.error) reject(new Error(resp.error));
            else resolve(resp.access_token);
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      });
      const contacts = await fetchGoogleContacts(token);
      if (contacts.length === 0) {
        setGoogleError('No contacts found in your Google account.');
        return;
      }
      setGoogleImport({ contacts, selected: new Set(contacts.map((_, i) => i)) });
    } catch (e) {
      setGoogleError(e.message || 'Failed to connect to Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGoogleConfirm() {
    if (!googleImport) return;
    setGoogleImporting(true);
    const toImport = googleImport.contacts.filter((_, i) => googleImport.selected.has(i));
    let imported = 0;
    for (const c of toImport) {
      try {
        // role is intentionally omitted — Google job titles won't match our VALID_ROLES whitelist
        await api.createContact({ name: c.name, email: c.email, phone: c.phone, company: c.company });
        imported++;
      } catch {}
    }
    setGoogleImporting(false);
    setGoogleImport(null);
    await loadContacts();
    if (imported > 0) setError('');
  }

  async function confirmDelete() {
    if (!confirmId) return;
    await api.deleteContact(confirmId);
    setConfirmId(null);
    await loadContacts();
  }

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      <div className="px-4 py-3 border-b border-bear-border bg-bear-surface">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-lg font-bold text-bear-text flex-1">Contacts</h1>
          <button
            onClick={handleGoogleImport}
            disabled={googleLoading}
            className="flex items-center gap-1.5 text-sm font-medium text-bear-text bg-bear-border/50 hover:bg-bear-border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            title="Import from Google Contacts"
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-bear-muted/30 border-t-bear-muted rounded-full animate-spin" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => { setForm({}); setError(''); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-bear-accent hover:bg-bear-accent-hover px-3 py-1.5 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Add Contact
          </button>
          <ComposeButton />
        </div>
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent"
        />
      </div>

      {/* Google import error */}
      {googleError && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
          <span className="flex-1">{googleError}</span>
          <button onClick={() => setGoogleError('')} className="text-red-400/70 hover:text-red-400">✕</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-bear-muted text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <p className="text-bear-muted text-sm mb-2">{search ? 'No contacts match your search' : 'No contacts yet'}</p>
            {!search && <p className="text-bear-muted text-xs">Contacts are added automatically when you mention people in chat, or add them manually.</p>}
          </div>
        ) : (
          Object.keys(grouped).sort().map(letter => (
            <div key={letter}>
              <div className="px-4 py-1.5 bg-bear-border/20">
                <p className="text-xs font-bold text-bear-muted">{letter}</p>
              </div>
              {grouped[letter].map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-bear-border/40 hover:bg-bear-surface/50">
                  <div className="w-9 h-9 bg-bear-accent/15 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-bear-accent">{c.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-bear-text">{c.name}</p>
                    {c.company && <p className="text-xs text-bear-muted truncate">{c.company}{c.role ? ` · ${c.role}` : ''}</p>}
                    {!c.company && c.role && <p className="text-xs text-bear-muted truncate">{c.role}</p>}
                    {c.email && <p className="text-xs text-bear-muted truncate">{c.email}</p>}
                    {c.phone && <p className="text-xs text-bear-muted">{c.phone}</p>}
                    {c.project_id && projectMap[c.project_id] && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-bear-accent bg-bear-accent/10 px-1.5 py-0.5 rounded-md">
                        <FolderIcon className="w-3 h-3" />{projectMap[c.project_id]}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setForm({ ...c }); setError(''); setShowForm(true); }}
                      className="p-1.5 text-bear-muted hover:text-bear-accent rounded-lg hover:bg-bear-accent/10 transition-colors"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmId(c.id)}
                      className="p-1.5 text-bear-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Contact form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-bear-surface rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-bear-surface px-4 py-3 border-b border-bear-border flex items-center justify-between">
              <h3 className="font-semibold text-bear-text">{form.id ? 'Edit Contact' : 'New Contact'}</h3>
              <button type="button" onClick={() => { setShowForm(false); setForm({}); }} className="text-bear-muted hover:text-bear-text">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-xl">{error}</p>}
              <Field label="Full Name *" name="name" value={form.name || ''} onChange={setForm} required />
              <Field label="Company" name="company" value={form.company || ''} onChange={setForm} />
              <Field label="Role / Title *" name="role" value={form.role || ''} onChange={setForm} />
              <div>
                <label className="block text-xs font-medium text-bear-muted mb-1">Project *</label>
                {projects.length === 0 ? (
                  <p className="text-xs text-bear-muted italic px-2 py-1.5">No projects yet — create a project first, then add contacts to it.</p>
                ) : (
                  <select
                    value={form.project_id || ''}
                    onChange={e => setForm(f => ({ ...f, project_id: e.target.value || null }))}
                    className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text focus:outline-none focus:border-bear-accent"
                  >
                    <option value="">— Select a project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
              <Field label="Email" name="email" value={form.email || ''} onChange={setForm} type="email" />
              <Field label="Phone" name="phone" value={form.phone || ''} onChange={setForm} type="tel" />
              <Field label="Address" name="address" value={form.address || ''} onChange={setForm} />
              <div>
                <label className="block text-xs font-medium text-bear-muted mb-1">Notes</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text focus:outline-none focus:border-bear-accent resize-none"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-bear-surface px-4 py-3 border-t border-bear-border">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-bear-accent hover:bg-bear-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : (form.id ? 'Save Changes' : 'Add Contact')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmId && (
        <ConfirmModal
          title="Delete Contact"
          message="This contact will be permanently removed. This cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Google Contacts import modal */}
      {googleImport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-bear-surface rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="sticky top-0 bg-bear-surface px-4 py-3 border-b border-bear-border flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-bear-text">Import Google Contacts</h3>
                <p className="text-xs text-bear-muted mt-0.5">
                  {googleImport.selected.size} of {googleImport.contacts.length} selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allSelected = googleImport.selected.size === googleImport.contacts.length;
                    setGoogleImport(g => ({
                      ...g,
                      selected: allSelected ? new Set() : new Set(g.contacts.map((_, i) => i)),
                    }));
                  }}
                  className="text-xs text-bear-accent hover:underline"
                >
                  {googleImport.selected.size === googleImport.contacts.length ? 'Deselect all' : 'Select all'}
                </button>
                <button onClick={() => setGoogleImport(null)} className="text-bear-muted hover:text-bear-text">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {googleImport.contacts.map((c, i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-bear-border/30 hover:bg-bear-border/20 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={googleImport.selected.has(i)}
                    onChange={() => {
                      setGoogleImport(g => {
                        const s = new Set(g.selected);
                        s.has(i) ? s.delete(i) : s.add(i);
                        return { ...g, selected: s };
                      });
                    }}
                    className="w-4 h-4 accent-bear-accent flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-bear-text truncate">{c.name}</p>
                    {(c.company || c.role) && (
                      <p className="text-xs text-bear-muted truncate">{[c.company, c.role].filter(Boolean).join(' · ')}</p>
                    )}
                    {c.email && <p className="text-xs text-bear-muted truncate">{c.email}</p>}
                  </div>
                </label>
              ))}
            </div>

            <div className="sticky bottom-0 bg-bear-surface px-4 py-3 border-t border-bear-border rounded-b-2xl flex gap-2">
              <button
                onClick={() => setGoogleImport(null)}
                className="flex-1 py-2.5 text-sm font-medium text-bear-muted border border-bear-border rounded-xl hover:bg-bear-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGoogleConfirm}
                disabled={googleImporting || googleImport.selected.size === 0}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-bear-accent hover:bg-bear-accent-hover rounded-xl transition-colors disabled:opacity-50"
              >
                {googleImporting
                  ? 'Importing...'
                  : `Import ${googleImport.selected.size} Contact${googleImport.selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Delete', danger = true }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-bear-surface border border-bear-border rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <h3 className="font-semibold text-bear-text mb-2">{title}</h3>
        <p className="text-sm text-bear-muted mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium text-bear-muted border border-bear-border rounded-xl hover:bg-bear-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-bear-accent hover:bg-bear-accent-hover text-white'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bear-muted mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(f => ({ ...f, [name]: e.target.value }))}
        required={required}
        className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text focus:outline-none focus:border-bear-accent"
      />
    </div>
  );
}

function PlusIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
function EditIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}
function TrashIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
function CloseIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
function FolderIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>;
}
function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
