import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '../store/index.js';
import Sidebar from '../components/Sidebar.jsx';
import ChatScreen from './ChatScreen.jsx';
import LibraryScreen from './LibraryScreen.jsx';
import ProjectsScreen from './ProjectsScreen.jsx';
import ContactsScreen from './ContactsScreen.jsx';
import ProfileScreen from './ProfileScreen.jsx';
import SettingsScreen from './SettingsScreen.jsx';
import AdminScreen from './AdminScreen.jsx';

export default function AppShell() {
  const { user, company } = useAuthStore();
  const { sidebarOpen, activeView, closeSidebar } = useUIStore();

  const bannerKey = company ? `cb_code_banner_${company.id}` : null;
  const [codeBannerDismissed, setCodeBannerDismissed] = useState(
    () => !bannerKey || !!localStorage.getItem(bannerKey)
  );
  const [codeCopied, setCodeCopied] = useState(false);

  // Show banner only to the company owner
  const showCodeBanner = !codeBannerDismissed && company?.code && company?.owner_id === user?.id;

  function dismissBanner() {
    if (bannerKey) localStorage.setItem(bannerKey, '1');
    setCodeBannerDismissed(true);
  }

  function copyCode() {
    navigator.clipboard.writeText(company.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  return (
    <div className="h-full bg-bear-bg flex relative overflow-hidden">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        absolute top-0 left-0 h-full w-72 z-30 transform transition-transform duration-300 ease-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Team invite code banner — shown once to account owner */}
        {showCodeBanner && (
          <div className="flex-shrink-0 bg-bear-accent/10 border-b border-bear-accent/25 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-bear-text">
                Share this code with your team to collaborate:{' '}
                <span className="font-mono font-bold tracking-widest text-bear-accent">{company.code}</span>
              </span>
            </div>
            <button
              onClick={copyCode}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                codeCopied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-bear-accent/15 text-bear-accent hover:bg-bear-accent/25'
              }`}
            >
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={dismissBanner} className="flex-shrink-0 text-bear-muted hover:text-bear-text transition-colors p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {activeView === 'chat' && <ChatScreen />}
        {activeView === 'library' && <LibraryScreen />}
        {activeView === 'projects' && <ProjectsScreen />}
        {activeView === 'contacts' && <ContactsScreen />}
        {activeView === 'profile' && <ProfileScreen />}
        {activeView === 'settings' && <SettingsScreen />}
        {activeView === 'admin' && <AdminScreen />}
      </div>
    </div>
  );
}
