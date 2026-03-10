import React, { useEffect, useState } from 'react';
import { useDocStore, useUIStore } from '../store/index.js';
import { LibraryCard, LibraryListRow, LibraryIconItem } from '../components/DocumentCard.jsx';
import DocumentRenderer from '../components/DocumentRenderer.jsx';
import { api } from '../api/index.js';
import clsx from 'clsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'rfi', label: 'RFIs' },
  { id: 'change_order', label: 'Change Orders' },
  { id: 'submittal', label: 'Submittals' },
  { id: 'pay_app', label: 'Pay Apps' },
  { id: 'lien_waiver', label: 'Lien Waivers' },
  { id: 'meeting_minutes', label: 'Minutes' },
  { id: 'other', label: 'Other' },
];

export default function LibraryScreen() {
  const { documents, loading, filter, view, setFilter, setView, loadDocuments, removeDocument } = useDocStore();
  const { toggleSidebar } = useUIStore();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { loadDocuments(filter); }, []);

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
      {selectedDoc && <DocViewer doc={selectedDoc} onClose={() => setSelectedDoc(null)} onDelete={(id) => { removeDocument(id); setSelectedDoc(null); }} />}
    </div>
  );
}

function DocViewer({ doc, onClose, onDelete }) {
  const [downloading, setDownloading] = React.useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await api.downloadPdf(doc.id, `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="absolute inset-0 bg-bear-bg z-10 flex flex-col animate-slide-up">
      <div className="safe-top border-b border-bear-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
          <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="flex-1 text-sm font-semibold text-bear-text truncate">{doc.title}</h2>
        <button onClick={handleDownload} disabled={downloading} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface text-bear-muted hover:text-bear-accent transition-colors disabled:opacity-40">
          {downloading
            ? <div className="w-4 h-4 border-2 border-bear-accent/30 border-t-bear-accent rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          }
        </button>
        <button onClick={() => onDelete(doc.id)} className="text-bear-muted hover:text-red-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="max-w-2xl mx-auto">
          <DocumentRenderer doc={doc} />
        </div>
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
