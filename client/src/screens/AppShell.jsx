import React, { useEffect } from 'react';
import { useUIStore } from '../store/index.js';
import Sidebar from '../components/Sidebar.jsx';
import ChatScreen from './ChatScreen.jsx';
import LibraryScreen from './LibraryScreen.jsx';
import ProfileScreen from './ProfileScreen.jsx';
import SettingsScreen from './SettingsScreen.jsx';

export default function AppShell() {
  const { sidebarOpen, activeView, closeSidebar } = useUIStore();

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
        {activeView === 'chat' && <ChatScreen />}
        {activeView === 'library' && <LibraryScreen />}
        {activeView === 'profile' && <ProfileScreen />}
        {activeView === 'settings' && <SettingsScreen />}
      </div>
    </div>
  );
}
