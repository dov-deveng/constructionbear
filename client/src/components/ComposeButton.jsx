import React from 'react';
import { useChatStore, useUIStore } from '../store/index.js';

export default function ComposeButton() {
  const { startNewChat } = useChatStore();
  const { setView } = useUIStore();

  function handleCompose() {
    startNewChat();
    setView('chat');
  }

  return (
    <button
      onClick={handleCompose}
      title="New chat"
      className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 active:opacity-50 transition-opacity hover:opacity-70"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-bear-text">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  );
}
