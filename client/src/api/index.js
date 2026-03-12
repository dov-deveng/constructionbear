const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/api';

function getToken() {
  return localStorage.getItem('cb_token');
}

async function request(method, path, body, rawBody = false, signal) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: rawBody ? { Authorization: headers.Authorization } : headers,
    body: body ? (rawBody ? body : JSON.stringify(body)) : undefined,
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    const error = new Error(err.error || 'Request failed');
    error.code = err.code;
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export const api = {
  // Auth
  register: (email, password) => request('POST', '/auth/register', { email, password }),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  googleAuth: (credential) => request('POST', '/auth/google', { credential }),
  me: () => request('GET', '/auth/me'),
  verifyEmail: (token) => request('POST', '/auth/verify-email', { token }),
  forgotPassword: (email) => request('POST', '/auth/forgot-password', { email }),
  resetPassword: (token, password) => request('POST', '/auth/reset-password', { token, password }),

  // Company
  getCompany: () => request('GET', '/auth/company'),
  createCompany: (name) => request('POST', '/auth/company/create', { name }),
  joinCompany: (code) => request('POST', '/auth/company/join', { code }),

  // Profile
  getProfile: () => request('GET', '/profile'),
  updateProfile: (data) => request('PUT', '/profile', data),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('logo', file);
    const token = getToken();
    return fetch(`${BASE}/profile/logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(r => r.json());
  },
  deleteLogo: () => request('DELETE', '/profile/logo'),

  // Chat
  getMessages: () => request('GET', '/chat/messages'),
  onboardingChat: (messages) => request('POST', '/chat/onboarding', { messages }),
  clearHistory: () => request('DELETE', '/chat/history'),
  chatUpload: (file) => {
    const form = new FormData();
    form.append('file', file);
    const token = localStorage.getItem('cb_token');
    return fetch(`${BASE}/chat/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  getSessions: (search) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request('GET', `/chat/sessions${qs}`);
  },
  getSession: (id) => request('GET', `/chat/sessions/${id}`),
  checkpointSession: (partial_doc_type) => request('POST', '/chat/sessions/checkpoint', { partial_doc_type }),
  deleteSession: (id) => request('DELETE', `/chat/sessions/${id}`),
  sendMessage: (message, attachmentUrl, attachmentFilename, session_id, signal) =>
    request('POST', '/chat/message', { message, attachmentUrl, attachmentFilename, session_id }, false, signal),

  // Documents
  getDocuments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/documents${qs ? '?' + qs : ''}`);
  },
  getDocument: (id) => request('GET', `/documents/${id}`),
  createDocument: (data) => request('POST', '/documents', data),
  updateDocument: (id, data) => request('PUT', `/documents/${id}`, data),
  deleteDocument: (id) => request('DELETE', `/documents/${id}`),
  getDocStats: () => request('GET', '/documents/stats/summary'),
  uploadDocument: (file, title, projectName) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    if (projectName) form.append('project_name', projectName);
    const token = getToken();
    return fetch(`${BASE}/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) { const err = new Error(data.error || 'Upload failed'); err.code = data.code; err.status = r.status; throw err; }
      return data;
    });
  },

  // PDF
  downloadPdf: async (id, filename) => {
    const token = getToken();
    const res = await fetch(`${BASE}/pdf/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Projects
  getProjects: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/projects${qs ? '?' + qs : ''}`);
  },
  getProject: (id) => request('GET', `/projects/${id}`),
  createProject: (data) => request('POST', '/projects', data),
  updateProject: (id, data) => request('PUT', `/projects/${id}`, data),
  deleteProject: (id) => request('DELETE', `/projects/${id}`),

  // Contacts
  getContacts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/contacts${qs ? '?' + qs : ''}`);
  },
  getContact: (id) => request('GET', `/contacts/${id}`),
  createContact: (data) => request('POST', '/contacts', data),
  updateContact: (id, data) => request('PUT', `/contacts/${id}`, data),
  deleteContact: (id) => request('DELETE', `/contacts/${id}`),

  // Document Attachments
  getDocAttachments: (docId) => request('GET', `/documents/${docId}/attachments`),
  addDocAttachments: (docId, files, captions = []) => {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    captions.forEach(c => form.append('captions[]', c));
    const token = getToken();
    return fetch(`${BASE}/documents/${docId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  updateDocAttachment: (docId, attId, data) => request('PATCH', `/documents/${docId}/attachments/${attId}`, data),
  deleteDocAttachment: (docId, attId) => request('DELETE', `/documents/${docId}/attachments/${attId}`),

  // Markups
  getMarkups: (docId) => request('GET', `/documents/${docId}/markups`),
  addMarkup: (docId, data) => request('POST', `/documents/${docId}/markups`, data),
  deleteMarkup: (docId, markupId) => request('DELETE', `/documents/${docId}/markups/${markupId}`),

  // Admin
  adminStats: () => request('GET', '/admin/stats'),
  adminUsers: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request('GET', `/admin/users${qs ? '?' + qs : ''}`); },
  adminUser: (id) => request('GET', `/admin/users/${id}`),
  adminGrantSub: (id, months) => request('POST', `/admin/users/${id}/grant-subscription`, { months }),
  adminGrantAdmin: (id) => request('POST', `/admin/users/${id}/grant-admin`),
  adminRevokeAdmin: (id) => request('POST', `/admin/users/${id}/revoke-admin`),

  // Company members
  getMembers: () => request('GET', '/auth/company/members'),
  removeMember: (userId) => request('DELETE', `/auth/company/members/${userId}`),

  // Stripe
  getSubStatus: () => request('GET', '/stripe/status'),
  createCheckout: (plan = 'pro') => request('POST', '/stripe/create-checkout', { plan }),
  createPortal: () => request('POST', '/stripe/create-portal'),

  // Guest (unauthenticated)
  guestChat: (message, messages, guestSessionId) => request('POST', '/chat/guest', { message, messages, guest_session_id: guestSessionId }),
  captureLead: (guest_session_id, document_type, collected_fields) =>
    request('POST', '/leads', { guest_session_id, document_type, collected_fields }),
  convertLead: (id, user_id) => request('PUT', `/leads/${id}/convert`, { user_id }),
};
