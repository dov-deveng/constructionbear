import React, { useEffect, useState } from 'react';
import { useDocStore, useUIStore } from '../store/index.js';
import { LibraryCard, LibraryListRow, LibraryIconItem } from '../components/DocumentCard.jsx';
import DocumentRenderer from '../components/DocumentRenderer.jsx';
import { api } from '../api/index.js';
import clsx from 'clsx';

// Field definitions per doc type (mirrors server DOC_SCHEMAS)
const DOC_FIELDS = {
  rfi: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'rfi_number', label: 'RFI #' },
    { key: 'date', label: 'Date' },
    { key: 'subject', label: 'Subject' },
    { key: 'question', label: 'Question / Request', multiline: true },
    { key: 'addressed_to', label: 'Addressed To' },
    { key: 'submitted_by', label: 'Submitted By' },
    { key: 'date_needed', label: 'Date Needed' },
    { key: 'response', label: 'Response', multiline: true },
  ],
  change_order: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'co_number', label: 'CO #' },
    { key: 'date', label: 'Date' },
    { key: 'contractor', label: 'Contractor' },
    { key: 'owner', label: 'Owner' },
    { key: 'description', label: 'Description', multiline: true },
    { key: 'reason', label: 'Reason', multiline: true },
    { key: 'cost_change', label: 'Cost Change' },
    { key: 'days_added', label: 'Days Added' },
  ],
  submittal: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'submittal_number', label: 'Submittal #' },
    { key: 'spec_section', label: 'Spec Section' },
    { key: 'description', label: 'Description', multiline: true },
    { key: 'supplier', label: 'Supplier' },
    { key: 'revision', label: 'Revision' },
    { key: 'submitted_by', label: 'Submitted By' },
    { key: 'date', label: 'Date' },
  ],
  lien_waiver: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'claimant', label: 'Claimant' },
    { key: 'owner', label: 'Owner' },
    { key: 'property_address', label: 'Property Address' },
    { key: 'through_date', label: 'Through Date' },
    { key: 'amount', label: 'Amount' },
  ],
  pay_app: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'application_number', label: 'Application #' },
    { key: 'period_to', label: 'Period To' },
    { key: 'contractor', label: 'Contractor' },
    { key: 'owner', label: 'Owner' },
    { key: 'architect', label: 'Architect' },
    { key: 'contract_amount', label: 'Contract Amount' },
    { key: 'work_completed', label: 'Work Completed' },
    { key: 'retainage_percent', label: 'Retainage %' },
    { key: 'previous_payments', label: 'Previous Payments' },
  ],
  meeting_minutes: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'meeting_date', label: 'Meeting Date' },
    { key: 'location', label: 'Location' },
    { key: 'attendees', label: 'Attendees', multiline: true },
    { key: 'agenda_items', label: 'Agenda Items', multiline: true },
    { key: 'action_items', label: 'Action Items', multiline: true },
    { key: 'next_meeting', label: 'Next Meeting' },
  ],
  notice_to_owner: [
    { key: 'owner_name', label: 'Owner Name' },
    { key: 'owner_address', label: 'Owner Address' },
    { key: 'property_address', label: 'Property Address' },
    { key: 'contractor_name', label: 'Contractor Name' },
    { key: 'contractor_address', label: 'Contractor Address' },
    { key: 'lender_name', label: 'Lender Name' },
    { key: 'services_description', label: 'Services / Materials', multiline: true },
    { key: 'date', label: 'Date' },
  ],
  subcontract: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'general_contractor', label: 'General Contractor' },
    { key: 'subcontractor', label: 'Subcontractor' },
    { key: 'scope_of_work', label: 'Scope of Work', multiline: true },
    { key: 'contract_value', label: 'Contract Value' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'completion_date', label: 'Completion Date' },
    { key: 'payment_terms', label: 'Payment Terms' },
    { key: 'insurance_requirements', label: 'Insurance Requirements', multiline: true },
  ],
  daily_report: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'report_number', label: 'Report #' },
    { key: 'superintendent', label: 'Superintendent' },
    { key: 'weather', label: 'Weather' },
    { key: 'temperature', label: 'Temperature' },
    { key: 'workers_on_site', label: 'Workers on Site' },
    { key: 'work_performed', label: 'Work Performed', multiline: true },
    { key: 'materials_delivered', label: 'Materials Delivered', multiline: true },
    { key: 'equipment_on_site', label: 'Equipment on Site' },
    { key: 'visitors', label: 'Visitors' },
    { key: 'delays', label: 'Delays / Issues', multiline: true },
    { key: 'safety_incidents', label: 'Safety Incidents', multiline: true },
    { key: 'notes', label: 'Notes', multiline: true },
  ],
  punch_list: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'prepared_by', label: 'Prepared By' },
    { key: 'contractor', label: 'Contractor' },
    { key: 'location', label: 'Location' },
    { key: 'items', label: 'Items (one per line)', multiline: true },
  ],
  invoice: [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'date', label: 'Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'project_name', label: 'Project Name' },
    { key: 'bill_to_name', label: 'Bill To (Name)' },
    { key: 'bill_to_address', label: 'Bill To (Address)' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'tax_rate', label: 'Tax Rate' },
    { key: 'tax_amount', label: 'Tax Amount' },
    { key: 'total', label: 'Total' },
    { key: 'payment_terms', label: 'Payment Terms' },
    { key: 'notes', label: 'Notes', multiline: true },
  ],
  transmittal: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'transmittal_number', label: 'Transmittal #' },
    { key: 'date', label: 'Date' },
    { key: 'to_name', label: 'To (Name)' },
    { key: 'to_company', label: 'To (Company)' },
    { key: 'from_name', label: 'From' },
    { key: 'subject', label: 'Subject' },
    { key: 'items', label: 'Items Transmitted (one per line)', multiline: true },
    { key: 'action_required', label: 'Action Required' },
    { key: 'notes', label: 'Notes', multiline: true },
  ],
  schedule_of_values: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'contractor', label: 'Contractor' },
    { key: 'owner', label: 'Owner' },
    { key: 'architect', label: 'Architect' },
    { key: 'contract_number', label: 'Contract #' },
    { key: 'date', label: 'Date' },
    { key: 'contract_amount', label: 'Contract Amount' },
  ],
  notice_to_proceed: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'contractor_name', label: 'Contractor' },
    { key: 'contractor_address', label: 'Contractor Address' },
    { key: 'owner_name', label: 'Owner' },
    { key: 'project_address', label: 'Project Address' },
    { key: 'commencement_date', label: 'Commencement Date' },
    { key: 'completion_date', label: 'Completion Date' },
    { key: 'contract_amount', label: 'Contract Amount' },
  ],
  substantial_completion: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'project_address', label: 'Project Address' },
    { key: 'contractor', label: 'Contractor' },
    { key: 'owner', label: 'Owner' },
    { key: 'architect', label: 'Architect' },
    { key: 'date_of_issuance', label: 'Date of Issuance' },
    { key: 'date_of_substantial_completion', label: 'Date of Substantial Completion' },
    { key: 'warranty_start_date', label: 'Warranty Start Date' },
    { key: 'list_of_items', label: 'Remaining Items', multiline: true },
  ],
  warranty_letter: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'contractor_name', label: 'Contractor Name' },
    { key: 'contractor_address', label: 'Contractor Address' },
    { key: 'owner_name', label: 'Owner Name' },
    { key: 'owner_address', label: 'Owner Address' },
    { key: 'work_description', label: 'Work Description', multiline: true },
    { key: 'warranty_period', label: 'Warranty Period' },
    { key: 'warranty_start_date', label: 'Warranty Start Date' },
    { key: 'warranty_end_date', label: 'Warranty End Date' },
    { key: 'exclusions', label: 'Exclusions', multiline: true },
  ],
  substitution_request: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'request_number', label: 'Request #' },
    { key: 'submitted_by', label: 'Submitted By' },
    { key: 'specified_item', label: 'Specified Item' },
    { key: 'specified_manufacturer', label: 'Specified Manufacturer' },
    { key: 'proposed_item', label: 'Proposed Item' },
    { key: 'proposed_manufacturer', label: 'Proposed Manufacturer' },
    { key: 'reason', label: 'Reason for Substitution', multiline: true },
    { key: 'cost_difference', label: 'Cost Difference' },
    { key: 'schedule_impact', label: 'Schedule Impact' },
    { key: 'attachments', label: 'Attachments' },
  ],
  closeout_checklist: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'contractor', label: 'Contractor' },
    { key: 'owner', label: 'Owner' },
    { key: 'project_manager', label: 'Project Manager' },
    { key: 'items', label: 'Checklist Items (one per line)', multiline: true },
  ],
  certified_payroll: [
    { key: 'project_name', label: 'Project Name' },
    { key: 'contractor', label: 'Contractor' },
    { key: 'week_ending', label: 'Week Ending' },
    { key: 'project_number', label: 'Project #' },
    { key: 'payroll_number', label: 'Payroll #' },
  ],
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'rfi', label: 'RFIs' },
  { id: 'change_order', label: 'Change Orders' },
  { id: 'submittal', label: 'Submittals' },
  { id: 'pay_app', label: 'Pay Apps' },
  { id: 'lien_waiver', label: 'Lien Waivers' },
  { id: 'daily_report', label: 'Field Reports' },
  { id: 'punch_list', label: 'Punch Lists' },
  { id: 'invoice', label: 'Invoices' },
  { id: 'transmittal', label: 'Transmittals' },
  { id: 'meeting_minutes', label: 'Minutes' },
  { id: 'notice_to_owner', label: 'NTO' },
  { id: 'notice_to_proceed', label: 'NTP' },
  { id: 'schedule_of_values', label: 'SOV' },
  { id: 'subcontract', label: 'Subcontracts' },
  { id: 'substantial_completion', label: 'Substantial Completion' },
  { id: 'warranty_letter', label: 'Warranty' },
  { id: 'substitution_request', label: 'Substitutions' },
  { id: 'closeout_checklist', label: 'Close-Out' },
  { id: 'certified_payroll', label: 'Payroll' },
  { id: 'upload', label: 'Uploads' },
  { id: 'other', label: 'Other' },
];

export default function LibraryScreen() {
  const { documents, loading, filter, view, setFilter, setView, loadDocuments, removeDocument, updateDocument } = useDocStore();
  const { toggleSidebar } = useUIStore();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = React.useRef(null);

  useEffect(() => { loadDocuments(filter); }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      await api.uploadDocument(file);
      await loadDocuments(filter);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const filtered = search
    ? documents.filter(d =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.project_name?.toLowerCase().includes(search.toLowerCase())
      )
    : documents;

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      {/* Header */}
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={toggleSidebar} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
            <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-bear-text flex-1">Documents</h1>

          {/* Upload button */}
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload PDF"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface text-bear-muted hover:text-bear-accent transition-colors disabled:opacity-40"
          >
            {uploading
              ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            }
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-bear-surface border border-bear-border rounded-xl p-1 gap-0.5">
            {[
              { id: 'card', icon: GridIcon },
              { id: 'list', icon: ListIcon },
              { id: 'icon', icon: IconViewIcon },
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={clsx('w-7 h-7 flex items-center justify-center rounded-lg transition-colors', view === id ? 'bg-bear-accent text-white' : 'text-bear-muted hover:text-bear-text')}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {uploadError && (
          <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center justify-between">
            {uploadError}
            <button onClick={() => setUploadError('')} className="ml-2 text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="input-field pl-9 py-2.5 text-sm"
          />
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={clsx(
                'flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
                filter === id
                  ? 'bg-bear-accent text-white'
                  : 'bg-bear-surface border border-bear-border text-bear-muted hover:text-bear-text'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-bear-accent/30 border-t-bear-accent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 bg-bear-surface rounded-2xl flex items-center justify-center mb-3">
              <span className="text-2xl">📂</span>
            </div>
            <p className="text-bear-text font-semibold mb-1">{search ? 'No results' : 'No documents yet'}</p>
            <p className="text-bear-muted text-sm">{search ? 'Try a different search term' : 'Go to chat to create your first document.'}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {view === 'card' && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(doc => (
                  <LibraryCard key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} onDelete={removeDocument} />
                ))}
              </div>
            )}
            {view === 'list' && (
              <div>
                {filtered.map(doc => (
                  <LibraryListRow key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} onDelete={removeDocument} />
                ))}
              </div>
            )}
            {view === 'icon' && (
              <div className="p-4 flex flex-wrap gap-2">
                {filtered.map(doc => (
                  <LibraryIconItem key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Document viewer modal */}
      {selectedDoc && (
        <DocViewer
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={(id) => { removeDocument(id); setSelectedDoc(null); }}
          onUpdate={(updated) => { updateDocument(updated); setSelectedDoc(updated); }}
        />
      )}
    </div>
  );
}

function DocViewer({ doc, onClose, onDelete, onUpdate }) {
  const [downloading, setDownloading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [currentDoc, setCurrentDoc] = React.useState(doc);

  async function handleDownload() {
    setDownloading(true);
    try {
      await api.downloadPdf(currentDoc.id, `${currentDoc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  function handleSaved(updated) {
    setCurrentDoc(updated);
    onUpdate(updated);
    setEditing(false);
  }

  return (
    <div className="absolute inset-0 bg-bear-bg z-10 flex flex-col animate-slide-up">
      <div className="safe-top border-b border-bear-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={editing ? () => setEditing(false) : onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
          <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="flex-1 text-sm font-semibold text-bear-text truncate">
          {editing ? 'Edit Document' : currentDoc.title}
        </h2>
        {!editing && (
          <>
            <button onClick={() => setEditing(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface text-bear-muted hover:text-bear-accent transition-colors" title="Edit">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={handleDownload} disabled={downloading} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface text-bear-muted hover:text-bear-accent transition-colors disabled:opacity-40">
              {downloading
                ? <div className="w-4 h-4 border-2 border-bear-accent/30 border-t-bear-accent rounded-full animate-spin" />
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              }
            </button>
            <button onClick={() => onDelete(currentDoc.id)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface text-bear-muted hover:text-red-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="max-w-2xl mx-auto">
          {editing
            ? <EditForm doc={currentDoc} onSaved={handleSaved} onCancel={() => setEditing(false)} />
            : <DocumentRenderer doc={currentDoc} />
          }
        </div>
      </div>
    </div>
  );
}

function EditForm({ doc, onSaved, onCancel }) {
  const rawContent = doc.content || {};
  const isPlainText = typeof rawContent === 'string' || typeof rawContent.text === 'string';
  const initialContent = isPlainText
    ? { text: typeof rawContent === 'string' ? rawContent : rawContent.text }
    : rawContent;

  const [title, setTitle] = useState(doc.title);
  const [fields, setFields] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fieldDefs = DOC_FIELDS[doc.type] || [];

  function setField(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateDocument(doc.id, {
        title: title.trim(),
        content: fields,
      });
      onSaved({ ...updated, content: updated.content || fields });
    } catch (e) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-bear-muted uppercase tracking-wider mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input-field w-full"
        />
      </div>

      {isPlainText ? (
        <div>
          <label className="block text-xs font-semibold text-bear-muted uppercase tracking-wider mb-1">Content</label>
          <textarea
            value={fields.text || ''}
            onChange={e => setField('text', e.target.value)}
            rows={14}
            className="input-field w-full resize-none font-mono text-sm"
          />
        </div>
      ) : (
        fieldDefs.map(({ key, label, multiline }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-bear-muted uppercase tracking-wider mb-1">{label}</label>
            {multiline ? (
              <textarea
                value={fields[key] || ''}
                onChange={e => setField(key, e.target.value)}
                rows={3}
                className="input-field w-full resize-none"
              />
            ) : (
              <input
                type="text"
                value={fields[key] || ''}
                onChange={e => setField(key, e.target.value)}
                className="input-field w-full"
              />
            )}
          </div>
        ))
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
          {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="btn-secondary px-5">Cancel</button>
      </div>
    </div>
  );
}

// View icons
function GridIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 16 16">
      <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function IconViewIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 16 16">
      <rect x="1" y="1" width="4" height="4" rx="1" /><rect x="6" y="1" width="4" height="4" rx="1" /><rect x="11" y="1" width="4" height="4" rx="1" />
      <rect x="1" y="6" width="4" height="4" rx="1" /><rect x="6" y="6" width="4" height="4" rx="1" /><rect x="11" y="6" width="4" height="4" rx="1" />
      <rect x="1" y="11" width="4" height="4" rx="1" /><rect x="6" y="11" width="4" height="4" rx="1" /><rect x="11" y="11" width="4" height="4" rx="1" />
    </svg>
  );
}
