const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/api';

function getToken() {
  return localStorage.getItem('cb_token');
}

async function request(method, path, body, rawBody = false) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: rawBody ? { Authorization: headers.Authorization } : headers,
    body: body ? (rawBody ? body : JSON.stringify(body)) : undefined,
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
  sendMessage: (message) => request('POST', '/chat/message', { message }),
  onboardingChat: (messages) => request('POST', '/chat/onboarding', { messages }),
  clearHistory: () => request('DELETE', '/chat/history'),

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

  // Stripe
  getSubStatus: () => request('GET', '/stripe/status'),
  createCheckout: () => request('POST', '/stripe/create-checkout'),
  createPortal: () => request('POST', '/stripe/create-portal'),
};
