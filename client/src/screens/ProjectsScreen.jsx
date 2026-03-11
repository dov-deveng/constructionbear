import React, { useState, useEffect } from 'react';
import { api } from '../api/index.js';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({});
  const [savingContact, setSavingContact] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data.projects);
    } catch (e) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function loadProject(id) {
    try {
      const data = await api.getProject(id);
      setSelected(data);
    } catch {}
  }

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.client_name || '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave(e) {
    e.preventDefault();
    if (!form.address?.trim()) { setError('Project address is required'); return; }
    if (!form.client_name?.trim()) { setError('Client name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await api.updateProject(form.id, form);
      } else {
        await api.createProject(form);
      }
      await loadProjects();
      setShowForm(false);
      setForm({});
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!confirmId) return;
    await api.deleteProject(confirmId);
    setConfirmId(null);
    setSelected(null);
    await loadProjects();
  }

  function openEdit(project) {
    setForm({ ...project });
    setShowForm(true);
  }

  function openNew() {
    setForm({});
    setShowForm(true);
  }

  function openContactForm(projectId) {
    setContactForm({ project_id: projectId });
    setShowContactForm(true);
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    setSavingContact(true);
    try {
      await api.createContact(contactForm);
      setShowContactForm(false);
      setContactForm({});
      // Reload project detail to show new contact
      if (selected) {
        const data = await api.getProject(selected.id);
        setSelected(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingContact(false);
    }
  }

  if (selected) {
    return (
      <div className="h-full flex flex-col bg-bear-bg">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-bear-border bg-bear-surface">
          <button onClick={() => setSelected(null)} className="text-bear-muted hover:text-bear-text">
            <BackIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-bear-text">{selected.name}</h2>
            {selected.client_name && <p className="text-xs text-bear-muted">Client: {selected.client_name}</p>}
          </div>
          <button onClick={() => openEdit(selected)} className="text-xs text-bear-accent font-medium px-3 py-1.5 rounded-lg bg-bear-accent/10">Edit</button>
          <button onClick={() => setConfirmId(selected.id)} className="text-xs text-red-400 font-medium px-3 py-1.5 rounded-lg bg-red-400/10">Delete</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <InfoCard title="Project Details">
            <Row label="Status" value={<StatusBadge status={selected.status} />} />
            {selected.address && <Row label="Address" value={`${selected.address}${selected.city ? `, ${selected.city}` : ''}${selected.state ? `, ${selected.state}` : ''}`} />}
            {selected.contract_value && <Row label="Contract Value" value={`$${Number(selected.contract_value).toLocaleString()}`} />}
            {selected.start_date && <Row label="Start Date" value={selected.start_date} />}
            {selected.end_date && <Row label="End Date" value={selected.end_date} />}
          </InfoCard>

          {(selected.client_name || selected.client_email || selected.client_phone) && (
            <InfoCard title="Client">
              {selected.client_name && <Row label="Name" value={selected.client_name} />}
              {selected.client_contact && <Row label="Contact" value={selected.client_contact} />}
              {selected.client_email && <Row label="Email" value={selected.client_email} />}
              {selected.client_phone && <Row label="Phone" value={selected.client_phone} />}
            </InfoCard>
          )}

          {(selected.gc_name || selected.architect_name) && (
            <InfoCard title="Team">
              {selected.gc_name && <Row label="GC" value={selected.gc_name} />}
              {selected.gc_contact && <Row label="GC Contact" value={selected.gc_contact} />}
              {selected.gc_email && <Row label="GC Email" value={selected.gc_email} />}
              {selected.architect_name && <Row label="Architect" value={selected.architect_name} />}
              {selected.architect_email && <Row label="Architect Email" value={selected.architect_email} />}
            </InfoCard>
          )}

          <InfoCard
            title={`Contacts (${selected.contacts?.length || 0})`}
            action={<button onClick={() => openContactForm(selected.id)} className="text-xs text-bear-accent font-medium hover:underline flex items-center gap-1"><PlusIcon className="w-3 h-3" />Add</button>}
          >
            {selected.contacts?.length > 0 ? selected.contacts.map(c => (
              <div key={c.id} className="py-1.5">
                <p className="text-sm font-medium text-bear-text">{c.name}</p>
                {c.company && <p className="text-xs text-bear-muted">{c.company}{c.role ? ` · ${c.role}` : ''}</p>}
                {c.email && <p className="text-xs text-bear-muted">{c.email}</p>}
                {c.phone && <p className="text-xs text-bear-muted">{c.phone}</p>}
              </div>
            )) : (
              <p className="text-xs text-bear-muted py-1.5">No contacts yet</p>
            )}
          </InfoCard>

          {selected.documents?.length > 0 && (
            <InfoCard title={`Documents (${selected.documents.length})`}>
              {selected.documents.map(d => (
                <div key={d.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm text-bear-text">{d.title}</p>
                    <p className="text-xs text-bear-muted capitalize">{d.type?.replace('_', ' ')}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </InfoCard>
          )}

          {selected.notes && (
            <InfoCard title="Notes">
              <p className="text-sm text-bear-text whitespace-pre-wrap">{selected.notes}</p>
            </InfoCard>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      <div className="px-4 py-3 border-b border-bear-border bg-bear-surface">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-bear-text">Projects</h1>
          <button onClick={openNew} className="flex items-center gap-1.5 text-sm font-medium text-white bg-bear-accent hover:bg-bear-accent-hover px-3 py-1.5 rounded-lg transition-colors">
            <PlusIcon className="w-4 h-4" /> New Project
          </button>
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-bear-muted text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-bear-muted text-sm mb-3">{search ? 'No projects match your search' : 'No projects yet'}</p>
            {!search && <p className="text-bear-muted text-xs">Projects are created automatically when you mention them in chat, or add them manually.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => loadProject(p.id)}
                className="w-full text-left p-3 rounded-xl bg-bear-surface border border-bear-border hover:border-bear-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-bear-text truncate">{p.name}</p>
                    {p.client_name && <p className="text-xs text-bear-muted mt-0.5">Client: {p.client_name}</p>}
                    {p.address && <p className="text-xs text-bear-muted">{p.city || p.address}</p>}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showContactForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={handleSaveContact} className="bg-bear-surface rounded-2xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-bear-border flex items-center justify-between">
              <h3 className="font-semibold text-bear-text">Add Contact to Project</h3>
              <button type="button" onClick={() => { setShowContactForm(false); setContactForm({}); }} className="text-bear-muted hover:text-bear-text">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <FormField label="Full Name *" name="name" value={contactForm.name || ''} onChange={setContactForm} required />
              <FormField label="Company" name="company" value={contactForm.company || ''} onChange={setContactForm} />
              <FormField label="Role / Title" name="role" value={contactForm.role || ''} onChange={setContactForm} />
              <FormField label="Email" name="email" value={contactForm.email || ''} onChange={setContactForm} type="email" />
              <FormField label="Phone" name="phone" value={contactForm.phone || ''} onChange={setContactForm} type="tel" />
            </div>
            <div className="px-4 py-3 border-t border-bear-border">
              <button
                type="submit"
                disabled={savingContact}
                className="w-full py-2.5 bg-bear-accent hover:bg-bear-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {savingContact ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete Project"
          message="This project and all associated data will be permanently removed. This cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-bear-surface rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-bear-surface px-4 py-3 border-b border-bear-border flex items-center justify-between">
              <h3 className="font-semibold text-bear-text">{form.id ? 'Edit Project' : 'New Project'}</h3>
              <button type="button" onClick={() => { setShowForm(false); setForm({}); }} className="text-bear-muted hover:text-bear-text">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-xl">{error}</p>}
              <FormField label="Project Name *" name="name" value={form.name || ''} onChange={setForm} required />
              <FormField label="Project Address *" name="address" value={form.address || ''} onChange={setForm} />
              <div className="grid grid-cols-2 gap-2">
                <FormField label="City" name="city" value={form.city || ''} onChange={setForm} />
                <FormField label="State" name="state" value={form.state || ''} onChange={setForm} />
              </div>
              <FormField label="Client Name *" name="client_name" value={form.client_name || ''} onChange={setForm} />
              <FormField label="Client Contact" name="client_contact" value={form.client_contact || ''} onChange={setForm} />
              <FormField label="Client Email" name="client_email" value={form.client_email || ''} onChange={setForm} type="email" />
              <FormField label="Client Phone" name="client_phone" value={form.client_phone || ''} onChange={setForm} type="tel" />
              <FormField label="General Contractor" name="gc_name" value={form.gc_name || ''} onChange={setForm} />
              <FormField label="GC Email" name="gc_email" value={form.gc_email || ''} onChange={setForm} type="email" />
              <FormField label="Architect" name="architect_name" value={form.architect_name || ''} onChange={setForm} />
              <FormField label="Contract Value" name="contract_value" value={form.contract_value || ''} onChange={setForm} type="number" />
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Start Date" name="start_date" value={form.start_date || ''} onChange={setForm} type="date" />
                <FormField label="End Date" name="end_date" value={form.end_date || ''} onChange={setForm} type="date" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bear-muted mb-1">Status</label>
                <select
                  value={form.status || 'active'}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text focus:outline-none focus:border-bear-accent"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-bear-muted mb-1">Notes</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-bear-border/30 border border-bear-border rounded-xl px-3 py-2 text-sm text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent resize-none"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-bear-surface px-4 py-3 border-t border-bear-border">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-bear-accent hover:bg-bear-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : (form.id ? 'Save Changes' : 'Create Project')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Delete' }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-bear-surface border border-bear-border rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <h3 className="font-semibold text-bear-text mb-2">{title}</h3>
        <p className="text-sm text-bear-muted mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-bear-muted border border-bear-border rounded-xl hover:bg-bear-bg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children, action }) {
  return (
    <div className="bg-bear-surface border border-bear-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-bear-border flex items-center justify-between">
        <p className="text-xs font-semibold text-bear-muted uppercase tracking-wide">{title}</p>
        {action}
      </div>
      <div className="px-4 py-3 divide-y divide-bear-border/50">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs text-bear-muted flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-bear-text text-right">{value}</span>
    </div>
  );
}

function FormField({ label, name, value, onChange, type = 'text', required }) {
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

function StatusBadge({ status }) {
  const colors = {
    active: 'bg-green-400/15 text-green-400',
    completed: 'bg-blue-400/15 text-blue-400',
    on_hold: 'bg-yellow-400/15 text-yellow-400',
    cancelled: 'bg-red-400/15 text-red-400',
    draft: 'bg-bear-border text-bear-muted',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function PlusIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
function BackIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
}
function CloseIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
