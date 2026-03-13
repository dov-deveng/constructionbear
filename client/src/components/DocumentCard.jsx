import React, { useState } from 'react';
import clsx from 'clsx';
import { DocumentContent } from './DocumentRenderer.jsx';

const TYPE_LABELS = {
  rfi: 'RFI',
  change_order: 'Change Order',
  submittal: 'Submittal',
  lien_waiver: 'Lien Waiver',
  pay_app: 'Pay App',
  meeting_minutes: 'Minutes',
  notice_to_owner: 'NTO',
  subcontract: 'Subcontract',
  other: 'Document',
};

const TYPE_COLORS = {
  rfi: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  change_order: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  submittal: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  lien_waiver: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pay_app: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  meeting_minutes: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  notice_to_owner: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  subcontract: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Full inline document preview — shown in chat after generation (Phase 3)
export function InlineDocPreview({ doc, onSave, onPreviewPdf }) {
  const typeKey = doc.type || 'other';
  return (
    <div className="rounded-2xl border border-bear-border overflow-hidden animate-slide-up w-full" style={{ background: '#111116' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-bear-border flex items-center gap-2.5">
        <span className={clsx('doc-badge border flex-shrink-0', TYPE_COLORS[typeKey] || TYPE_COLORS.other)}>
          {TYPE_LABELS[typeKey] || 'Document'}
        </span>
        <p className="text-sm font-semibold text-bear-text flex-1 truncate">{doc.title}</p>
        <svg className="w-4 h-4 text-bear-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Document content */}
      <div className="overflow-y-auto scrollbar-thin p-4" style={{ maxHeight: 340 }}>
        <DocumentContent doc={doc} />
      </div>

      {/* Action */}
      {(onSave || onPreviewPdf) && (
        <div className="px-4 py-3 border-t border-bear-border">
          {onPreviewPdf ? (
            <button
              onClick={onPreviewPdf}
              className="w-full flex items-center justify-center gap-2 bg-bear-surface border border-bear-border hover:border-bear-accent rounded-xl px-4 py-2.5 text-sm font-semibold text-bear-text transition-colors active:scale-[0.99]"
            >
              <svg className="w-4 h-4 text-bear-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Preview PDF
            </button>
          ) : (
            <button
              onClick={onSave}
              className="w-full btn-primary text-sm py-2.5"
            >
              Save to Library
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Inline card (shown in chat after document generation)
export function InlineDocCard({ doc, onSave }) {
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const text = typeof doc.content === 'string' ? doc.content : doc.content?.text || '';

  async function handleSave() {
    await onSave();
    setSaved(true);
  }

  return (
    <div className="card border-bear-border rounded-2xl overflow-hidden animate-slide-up">
      <div className="px-4 py-3 border-b border-bear-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx('doc-badge border', TYPE_COLORS[doc.type] || TYPE_COLORS.other)}>
            {TYPE_LABELS[doc.type] || 'Document'}
          </span>
          <p className="text-sm font-medium text-bear-text truncate">{doc.title}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-bear-muted hover:text-bear-text transition-colors ml-2">
          <svg className={clsx('w-4 h-4 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 border-b border-bear-border">
          <pre className="text-xs text-bear-muted leading-relaxed whitespace-pre-wrap font-sans max-h-48 overflow-y-auto scrollbar-thin">{text}</pre>
        </div>
      )}

      <div className="px-4 py-3 flex gap-2">
        {!saved ? (
          <button onClick={handleSave} className="btn-primary text-sm py-2 px-4 flex-1">
            Save to Library
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </div>
        )}
      </div>
    </div>
  );
}

// Library card view
export function LibraryCard({ doc, onClick, onDelete }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="card hover:border-bear-accent/30 transition-colors cursor-pointer relative"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <span className={clsx('doc-badge border', TYPE_COLORS[doc.type] || TYPE_COLORS.other)}>
            {TYPE_LABELS[doc.type] || 'Document'}
          </span>
          <button
            onClick={e => { e.stopPropagation(); setShowActions(s => !s); }}
            className="text-bear-muted hover:text-bear-text transition-colors -mt-0.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
            </svg>
          </button>
        </div>
        <h3 className="text-sm font-semibold text-bear-text mb-1 line-clamp-2">{doc.title}</h3>
        {doc.project_name && <p className="text-xs text-bear-muted mb-2">{doc.project_name}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-bear-muted">{formatDate(doc.created_at)}</p>
          <span className={clsx('text-xs px-1.5 py-0.5 rounded', doc.status === 'final' ? 'text-emerald-400' : 'text-bear-muted')}>
            {doc.status === 'final' ? 'Final' : 'Draft'}
          </span>
        </div>
      </div>

      {showActions && (
        <div className="absolute right-2 top-8 bg-bear-surface border border-bear-border rounded-xl shadow-xl z-10 py-1 min-w-36"
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { onClick(); setShowActions(false); }} className="w-full text-left px-4 py-2 text-sm text-bear-text hover:bg-bear-border transition-colors">View</button>
          <button onClick={() => { onDelete(doc.id); setShowActions(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-bear-border transition-colors">Delete</button>
        </div>
      )}
    </div>
  );
}

// Library list row
export function LibraryListRow({ doc, onClick, onDelete }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-bear-border hover:bg-bear-surface/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <span className={clsx('doc-badge border flex-shrink-0', TYPE_COLORS[doc.type] || TYPE_COLORS.other)}>
        {TYPE_LABELS[doc.type] || 'Doc'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-bear-text truncate">{doc.title}</p>
        {doc.project_name && <p className="text-xs text-bear-muted">{doc.project_name}</p>}
      </div>
      <p className="text-xs text-bear-muted flex-shrink-0">{formatDate(doc.created_at)}</p>
      <button
        onClick={e => { e.stopPropagation(); onDelete(doc.id); }}
        className="opacity-0 group-hover:opacity-100 text-bear-muted hover:text-red-400 transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// Library icon view
export function LibraryIconItem({ doc, onClick }) {
  const typeKey = doc.type || 'other';
  const colorClass = TYPE_COLORS[typeKey] || TYPE_COLORS.other;

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-bear-surface transition-colors">
      <div className={clsx('w-14 h-14 rounded-2xl border flex items-center justify-center', colorClass)}>
        <span className="text-2xl">{getDocEmoji(typeKey)}</span>
      </div>
      <p className="text-xs text-bear-text font-medium text-center line-clamp-2 max-w-16 leading-tight">{doc.title}</p>
    </button>
  );
}

function getDocEmoji(type) {
  const map = { rfi: '❓', change_order: '📝', submittal: '📋', lien_waiver: '📜', pay_app: '💰', meeting_minutes: '📅', notice_to_owner: '📬', subcontract: '🤝', other: '📄' };
  return map[type] || '📄';
}

// Default export for inline use in chat
export default function DocumentCard({ doc, inline, onSave }) {
  if (inline) return <InlineDocCard doc={doc} onSave={onSave} />;
  return null;
}
