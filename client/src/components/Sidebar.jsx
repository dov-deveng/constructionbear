import React from 'react';
import { useAuthStore, useUIStore } from '../store/index.js';
import clsx from 'clsx';

const NAV_ITEMS = [
  { id: 'chat', label: 'Chat', icon: ChatIcon },
  { id: 'library', label: 'Documents', icon: LibraryIcon },
  { id: 'projects', label: 'Projects', icon: ProjectsIcon },
  { id: 'contacts', label: 'Contacts', icon: ContactsIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const { user, profile, subscription, logout } = useAuthStore();
  const { activeView, setView } = useUIStore();

  return (
    <div className="h-full bg-bear-surface border-r border-bear-border flex flex-col safe-top">
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 border-b border-bear-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-bear-accent rounded-xl flex items-center justify-center">
            <span className="text-lg">🐻</span>
          </div>
          <div>
            <p className="text-sm font-bold text-bear-text">ConstructionBear.AI</p>
            <p className="text-xs text-bear-muted">{profile?.company_name || user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
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
      </nav>

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
