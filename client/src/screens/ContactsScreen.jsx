import React, { useState, useEffect } from 'react';
import { api } from '../api/index.js';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  // Build project lookup map
  const projectMap = projects.reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {});

  // Group alphabetically
  const grouped = filtered.reduce((acc, c) => {
    const letter = c.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  async function handleSave(e) {
    e.preventDefault();
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

  async function handleDelete(id) {
    if (!confirm('Delete this contact?')) return;
    await api.deleteContact(id);
    await loadContacts();
  }

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      <div className="px-4 py-3 border-b border-bear-border bg-bear-surface">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-bear-text">Contacts</h1>
          <button
            onClick={() => { setForm({}); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-bear-accent hover:bg-bear-accent-hover px-3 py-1.5 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Add Contact
          </button>
        </div>
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent"
        />
      </div>

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
                      onClick={() => { setForm({ ...c }); setShowForm(true); }}
                      className="p-1.5 text-bear-muted hover:text-bear-accent rounded-lg hover:bg-bear-accent/10 transition-colors"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
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
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Field label="Full Name *" name="name" value={form.name || ''} onChange={setForm} required />
              <Field label="Company" name="company" value={form.company || ''} onChange={setForm} />
              <Field label="Role / Title" name="role" value={form.role || ''} onChange={setForm} />
              <Field label="Email" name="email" value={form.email || ''} onChange={setForm} type="email" />
              <Field label="Phone" name="phone" value={form.phone || ''} onChange={setForm} type="tel" />
              <Field label="Address" name="address" value={form.address || ''} onChange={setForm} />
              {projects.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-bear-muted mb-1">Link to Project</label>
                  <select
                    value={form.project_id || ''}
                    onChange={e => setForm(f => ({ ...f, project_id: e.target.value || null }))}
                    className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text focus:outline-none focus:border-bear-accent"
                  >
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
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
