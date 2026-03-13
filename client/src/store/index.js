import { create } from 'zustand';
import { api } from '../api/index.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('cb_token'),
  loading: true,
  profile: null,
  subscription: null,
  company: null,

  init: async () => {
    const token = localStorage.getItem('cb_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const [user, profile, sub, company] = await Promise.all([
        api.me(),
        api.getProfile(),
        api.getSubStatus(),
        api.getCompany().catch(() => null),
      ]);
      set({ user, profile, subscription: sub, company, loading: false });
    } catch {
      localStorage.removeItem('cb_token');
      set({ user: null, token: null, loading: false });
    }
  },

  login: (token, user) => {
    localStorage.setItem('cb_token', token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('cb_token');
    set({ user: null, token: null, profile: null, subscription: null, company: null });
  },

  setProfile: (profile) => set({ profile }),
  setSubscription: (subscription) => set({ subscription }),
  setCompany: (company) => set({ company }),

  canCreateDoc: () => {
    const { subscription } = get();
    return subscription?.can_create ?? true;
  },
}));

// Module-level abort controller — not in Zustand state (no re-render needed)
let _abortController = null;

export const useChatStore = create((set, get) => ({
  messages: [],
  loading: false,
  initialized: false,
  sessions: [],
  inProgressSessions: [],
  activeSession: null,      // { session, messages } — read-only completed session
  resumedSession: null,     // { session, messages } — in_progress session being continued
  pendingAttachment: null, // { url, filename, mimetype } — uploaded file for current chat

  loadMessages: async () => {
    try {
      const { messages } = await api.getMessages();
      set({ messages, initialized: true });
    } catch {
      set({ initialized: true });
    }
  },

  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),

  sendMessage: async (text) => {
    const userMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: Math.floor(Date.now() / 1000),
    };
    _abortController = new AbortController();
    set(s => ({ messages: [...s.messages, userMsg], loading: true }));

    try {
      const { pendingAttachment, resumedSession } = get();
      const sessionId = resumedSession?.session?.id || undefined;
      const res = await api.sendMessage(
        text,
        pendingAttachment?.url,
        pendingAttachment?.filename,
        sessionId,
        _abortController.signal,
      );
      const assistantMsg = {
        id: res.id,
        role: 'assistant',
        content: res.message,
        metadata: res.generatedDoc ? { generatedDoc: res.generatedDoc } : null,
        created_at: Math.floor(Date.now() / 1000),
      };
      set(s => ({ messages: [...s.messages, assistantMsg], loading: false }));
      // Refresh session list when a doc is generated or on every message in a resumed session
      if (res.generatedDoc?.sessionId || sessionId) {
        get().loadSessions();
      }
      return res;
    } catch (err) {
      if (err.name === 'AbortError') {
        // User stopped — keep the user message visible, just clear loading
        set({ loading: false });
        return { stopped: true };
      }
      set(s => ({
        messages: s.messages.filter(m => m.id !== userMsg.id),
        loading: false,
      }));
      throw err;
    }
  },

  stopGeneration: () => {
    _abortController?.abort();
    set({ loading: false });
  },

  clearMessages: () => set({ messages: [] }),

  setPendingAttachment: (att) => set({ pendingAttachment: att }),

  // Start a fresh chat — checkpoint any in-progress untagged messages first
  startNewChat: async () => {
    const { messages, resumedSession } = get();
    if (resumedSession) {
      // Session is already saved in DB as in_progress — just clear UI state
      // No checkpoint needed; the session will remain in the In Progress sidebar
    } else if (messages.length > 0) {
      // Fresh untagged conversation — save it as an in_progress session before clearing
      await api.checkpointSession().catch(() => {});
    }
    set({ messages: [], initialized: true, activeSession: null, resumedSession: null, pendingAttachment: null });
    await get().loadSessions();
  },

  loadSessions: async (search) => {
    try {
      const { sessions, inProgressSessions } = await api.getSessions(search);
      set({ sessions, inProgressSessions: inProgressSessions || [] });
    } catch {}
  },

  openSession: async (id) => {
    try {
      // Checkpoint any current fresh (untagged) messages before switching sessions
      const { messages: currentMessages, resumedSession: currentResumed } = get();
      if (!currentResumed && currentMessages.length > 0) {
        await api.checkpointSession().catch(() => {});
      }

      const { session, messages } = await api.getSession(id);
      if (session.status === 'in_progress') {
        // Resume: load full message history into state so conversation is visible
        set({ messages, initialized: true, activeSession: null, resumedSession: { session, messages }, pendingAttachment: null });
      } else {
        // View only — don't overwrite messages state (keep fresh chat intact if any)
        set({ activeSession: { session, messages }, resumedSession: null });
      }
      get().loadSessions();
    } catch {}
  },

  exitSession: () => set({ activeSession: null, resumedSession: null }),

  deleteSession: async (id) => {
    try {
      await api.deleteSession(id);
      get().loadSessions();
      return true;
    } catch { return false; }
  },
}));

export const useDocStore = create((set, get) => ({
  documents: [],
  total: 0,
  loading: false,
  filter: 'all',
  view: localStorage.getItem('cb_doc_view') || 'card',

  setFilter: (filter) => { set({ filter }); get().loadDocuments(filter); },
  setView: (view) => { localStorage.setItem('cb_doc_view', view); set({ view }); },

  loadDocuments: async (type) => {
    set({ loading: true });
    try {
      const params = {};
      if (type && type !== 'all') params.type = type;
      const { documents, total } = await api.getDocuments(params);
      set({ documents, total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addDocument: (doc) => set(s => ({ documents: [doc, ...s.documents], total: s.total + 1 })),

  updateDocument: (updated) => set(s => ({
    documents: s.documents.map(d => d.id === updated.id ? updated : d),
  })),

  removeDocument: async (id) => {
    await api.deleteDocument(id);
    set(s => ({ documents: s.documents.filter(d => d.id !== id), total: s.total - 1 }));
  },
}));

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  activeView: 'chat', // 'chat' | 'library' | 'profile' | 'settings'

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  setView: (view) => set({ activeView: view, sidebarOpen: false }),
}));
