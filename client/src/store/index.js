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

export const useChatStore = create((set, get) => ({
  messages: [],
  loading: false,
  initialized: false,

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
    set(s => ({ messages: [...s.messages, userMsg], loading: true }));

    try {
      const res = await api.sendMessage(text);
      const assistantMsg = {
        id: res.id,
        role: 'assistant',
        content: res.message,
        metadata: res.generatedDoc ? { generatedDoc: res.generatedDoc } : null,
        created_at: Math.floor(Date.now() / 1000),
      };
      set(s => ({ messages: [...s.messages, assistantMsg], loading: false }));
      return res;
    } catch (err) {
      set(s => ({
        messages: s.messages.filter(m => m.id !== userMsg.id),
        loading: false,
      }));
      throw err;
    }
  },

  clearMessages: () => set({ messages: [] }),
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
