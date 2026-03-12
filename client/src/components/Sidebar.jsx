import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore, useChatStore } from '../store/index.js';
import clsx from 'clsx';

const DOC_TYPE_SHORT = {
  rfi: 'RFI', change_order: 'CO', submittal: 'SUB', lien_waiver: 'LW',
  pay_app: 'PA', meeting_minutes: 'MM', notice_to_owner: 'NTO', subcontract: 'SC',
  daily_report: 'DFR', punch_list: 'PL', invoice: 'INV', transmittal: 'TRN',
  schedule_of_values: 'SOV', notice_to_proceed: 'NTP', substantial_completion: 'SCC',
  warranty_letter: 'WL', substitution_request: 'SR', closeout_checklist: 'CCL',
  certified_payroll: 'CP', ccd: 'CCD', rfp: 'RFP', change_order_log: 'COL',
  submittal_log: 'SL', rfi_log: 'RL', coi: 'COI', visitor_waiver: 'VW',
  notice_to_neighbors: 'NTN', parking_pass: 'PP',
};

// Stable color per doc type via simple hash
const TYPE_COLORS = ['bg-blue-500/20 text-blue-400', 'bg-green-500/20 text-green-400',
  'bg-yellow-500/20 text-yellow-400', 'bg-purple-500/20 text-purple-400',
  'bg-pink-500/20 text-pink-400', 'bg-orange-500/20 text-orange-400'];

function typeColor(docType) {
  let h = 0;
  for (let i = 0; i < docType.length; i++) h = (h * 31 + docType.charCodeAt(i)) & 0xff;
  return TYPE_COLORS[h % TYPE_COLORS.length];
}

function timeAgo(unixTs) {
  const secs = Math.floor(Date.now() / 1000) - unixTs;
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return `${Math.floor(secs / 604800)}w ago`;
}

const PRIMARY_NAV = [
  { id: 'chat', label: 'Chat', icon: ChatIcon },
  { id: 'library', label: 'Documents', icon: LibraryIcon },
  { id: 'projects', label: 'Projects', icon: ProjectsIcon },
  { id: 'contacts', label: 'Contacts', icon: ContactsIcon },
];

const BOTTOM_NAV = [
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const { user, profile, subscription, logout } = useAuthStore();
  const { activeView, setView } = useUIStore();
  const { sessions, inProgressSessions, activeSession, resumedSession, loadSessions, openSession, exitSession, deleteSession, startNewChat } = useChatStore();
  const isAdmin = user?.is_admin;
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    const t = setTimeout(() => loadSessions(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  function handleOpenSession(id) {
    setView('chat');
    openSession(id);
  }

  return (
    <div className="h-full bg-bear-surface border-r border-bear-border flex flex-col safe-top">
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 border-b border-bear-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-bear-accent rounded-xl flex items-center justify-center">
            <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-bear-text">ConstructionBear.AI</p>
            <p className="text-xs text-bear-muted">{profile?.company_name || user?.email}</p>
          </div>
        </div>
      </div>

      {/* New Chat button */}
      <div className="px-3 pt-3">
        <button
          onClick={() => { startNewChat(); setView('chat'); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-bear-muted hover:text-bear-text hover:bg-bear-border/50 transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-bear-border/60 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-bear-bg border border-bear-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent transition-colors"
          />
        </div>
      </div>

      {/* Primary Nav */}
      <nav className="px-2 pt-2 pb-1 space-y-0.5">
        {PRIMARY_NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setView(id); if (id === 'chat' && activeSession) exitSession(); }}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              activeView === id && !activeSession
                ? 'bg-bear-accent/15 text-bear-accent'
                : 'text-bear-muted hover:text-bear-text hover:bg-bear-border/50'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Session Sections */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">

        {/* In Progress section */}
        {!search.trim() && inProgressSessions.length > 0 && (
          <>
            <p className="px-3 pt-3 pb-1 text-xs font-semibold text-amber-400 uppercase tracking-wide">In Progress</p>
            <div className="space-y-0.5 mb-1">
              {inProgressSessions.map(s => {
                const isActive = resumedSession?.session?.id === s.id;
                const docType = s.partial_doc_type || s.document_type;
                const short = docType ? (DOC_TYPE_SHORT[docType] || docType.toUpperCase().slice(0, 4)) : '···';
                return (
                  <div key={s.id} className="group relative flex items-start">
                    <button
                      onClick={() => handleOpenSession(s.id)}
                      className={clsx(
                        'flex-1 flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors min-w-0',
                        isActive
                          ? 'bg-amber-400/15 text-amber-400'
                          : 'text-bear-muted hover:text-bear-text hover:bg-bear-border/50'
                      )}
                    >
                      <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 bg-amber-400/20 text-amber-400">
                        {short}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-bear-text truncate leading-tight">
                          {s.project_name || s.title || 'Untitled chat'}
                        </p>
                        <p className="text-[11px] text-amber-400/70 truncate leading-tight mt-0.5">
                          Resume · {timeAgo(s.updated_at)}
                        </p>
                      </div>
                    </button>
                    {/* Delete button */}
                    {confirmDeleteId === s.id ? (
                      <div className="absolute right-1 top-1 flex gap-1 bg-bear-surface border border-bear-border rounded-lg p-1 z-10">
                        <button
                          onClick={() => { deleteSession(s.id); setConfirmDeleteId(null); }}
                          className="text-[10px] text-red-400 font-semibold px-2 py-0.5 rounded hover:bg-red-400/10"
                        >Delete</button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] text-bear-muted px-2 py-0.5 rounded hover:bg-bear-border/50"
                        >Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 mt-2 mr-1 flex items-center justify-center text-bear-muted hover:text-red-400 rounded transition-all"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Recent / Search results */}
        <p className="px-3 pt-3 pb-1 text-xs font-semibold text-bear-muted uppercase tracking-wide">
          {search.trim() ? 'Results' : 'Recent'}
        </p>

        {sessions.length > 0 ? (
          <div className="space-y-0.5">
            {sessions.map(s => {
              const short = DOC_TYPE_SHORT[s.document_type] || s.document_type?.toUpperCase().slice(0, 4) || '···';
              const isActive = activeSession?.session?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleOpenSession(s.id)}
                  className={clsx(
                    'w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors',
                    isActive
                      ? 'bg-bear-accent/15 text-bear-accent'
                      : 'text-bear-muted hover:text-bear-text hover:bg-bear-border/50'
                  )}
                >
                  <span className={clsx('flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5', typeColor(s.document_type || 'rfi'))}>
                    {short}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-bear-text truncate leading-tight">{s.title}</p>
                    <p className="text-[11px] text-bear-muted truncate leading-tight mt-0.5">
                      {s.project_name ? `${s.project_name} · ` : ''}{timeAgo(s.updated_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-3 py-2 text-xs text-bear-muted">
            {search.trim() ? `No results for "${search}"` : 'Document chats appear here after you generate one.'}
          </p>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="px-2 pb-2 space-y-0.5 border-t border-bear-border pt-2">
        {BOTTOM_NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              activeView === id
                ? 'bg-bear-accent/15 text-bear-accent'
                : 'text-bear-muted hover:text-bear-text hover:bg-bear-border/50'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </button>
        ))}

        {/* Admin link — only visible to admin users */}
        {isAdmin && (
          <button
            onClick={() => setView('admin')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              activeView === 'admin'
                ? 'bg-purple-500/15 text-purple-400'
                : 'text-bear-muted hover:text-purple-400 hover:bg-purple-500/10'
            )}
          >
            <AdminIcon className="w-5 h-5 flex-shrink-0" />
            Admin
          </button>
        )}
      </div>

      {/* Subscription status */}
      {subscription && subscription.status !== 'active' && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-bear-accent/10 border border-bear-accent/20">
          <p className="text-xs font-semibold text-bear-accent mb-0.5">
            {subscription.free_docs_used ? 'Free limit reached' : 'Free plan'}
          </p>
          <p className="text-xs text-bear-muted mb-2">
            {subscription.free_docs_used
              ? 'Subscribe to create unlimited documents.'
              : `${1 - subscription.doc_count} free document remaining.`}
          </p>
          <button
            onClick={() => setView('settings')}
            className="w-full text-xs font-semibold text-white bg-bear-accent hover:bg-bear-accent-hover px-3 py-1.5 rounded-lg transition-colors"
          >
            Upgrade — $19.99/mo
          </button>
        </div>
      )}

      {/* User / Logout */}
      <div className="safe-bottom px-3 pb-3 pt-2 border-t border-bear-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 bg-bear-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-bear-accent">
              {(profile?.owner_name || user?.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-bear-text truncate">{profile?.owner_name || 'Account'}</p>
            <p className="text-xs text-bear-muted truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-bear-muted hover:text-bear-text transition-colors" title="Sign out">
            <LogoutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
function ChatIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function LibraryIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ProfileIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function ProjectsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ContactsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AdminIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
