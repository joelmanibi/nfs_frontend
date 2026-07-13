import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const AUTH_FAILURE_MESSAGES = new Set([
  'Token manquant ou mal formaté.',
  'Token expiré.',
  'Token invalide.',
  'Non authentifié.',
]);

const isPublicAuthScreen = (pathname = '') => (
  pathname.startsWith('/login')
  || pathname.startsWith('/verify-otp')
  || pathname.startsWith('/forgot-password')
  || pathname.startsWith('/reset-password')
  || pathname.startsWith('/register')
);

// ── Handle 401 globally ───────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const shouldHandleAuthFailure = (
      error.response?.status === 401
      && !error.config?.skipAuthHandler
      && AUTH_FAILURE_MESSAGES.has(error.response?.data?.message)
    );

    if (shouldHandleAuthFailure) {
      try {
        await api.post('/auth/logout', {}, { skipAuthHandler: true });
      } catch {
        // no-op: local cleanup and redirect still happen
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:logout'));

        if (!isPublicAuthScreen(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:          (data) => api.post('/auth/register', data),
  requestOTP:        (email) => api.post('/auth/login', { email }),
  verifyOTP:         (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  loginWithPassword: (email, password) => api.post('/auth/login-password', { email, password }),
  loginWithLDAP:     (username, password) => api.post('/auth/login-ldap', { username, password }),
  getMe:             () => api.get('/auth/me', { skipAuthHandler: true }),
  forgotPassword:    (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:     (email, token, password) => api.post('/auth/reset-password', { email, token, password }),
  changePassword:    (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
  logout:            () => api.post('/auth/logout', {}, { skipAuthHandler: true }),
};

// ── Files ─────────────────────────────────────────────────────────────────────
export const filesAPI = {
  upload: (formData, options = {}) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...options,
    }),

  download: (id, downloadCode) =>
    api.post(
      `/files/${id}/download`,
      downloadCode ? { downloadCode } : {},
      { responseType: 'blob' },
    ),

  getInbox:  () => api.get('/files/inbox'),
  getSent:   () => api.get('/files/sent'),
  getDetails: (id) => api.get(`/files/${id}`),
  blockFile: (id) => api.patch(`/files/${id}/block`),
  deleteFile: (id) => api.delete(`/files/${id}`),
};

// ── Share links ───────────────────────────────────────────────────────────────
export const shareAPI = {
  /** Crée un lien de partage pour un fichier envoyé (auth requise). */
  createLink: (fileId, expiresInHours) =>
    api.post(`/files/${fileId}/share`, { expiresInHours }),

  /** Récupère les infos d'un lien public (pas d'auth). */
  getInfo: (token) =>
    api.get(`/share/${token}`, { headers: { Authorization: undefined } }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  /** Recherche des utilisateurs (DB + AD) par nom ou email. q doit faire ≥ 2 caractères. */
  search: (q) => api.get('/users/search', { params: { q } }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats:           () => api.get('/admin/stats'),
  createUser:         (data) => api.post('/admin/users', data),
  getStatsTimeseries: ({ startDate, endDate }) => api.get('/admin/stats/timeseries', { params: { startDate, endDate } }),
  getStatsExtensions: ({ startDate, endDate }) => api.get('/admin/stats/extensions', { params: { startDate, endDate } }),
  getTopSenders:      () => api.get('/admin/stats/top-senders'),
  getUsers:           (params) => api.get('/admin/users', { params }),
  getUserStats:       (id, { startDate, endDate }) => api.get(`/admin/users/${id}/stats`, { params: { startDate, endDate } }),
  updateUser:         (id, data) => api.patch(`/admin/users/${id}`, data),
  blockUser:          (id) => api.patch(`/admin/users/${id}/block`),
  deleteUser:         (id) => api.delete(`/admin/users/${id}`),
  getCollections:     () => api.get('/admin/collections'),
  getCollection:      (id) => api.get(`/admin/collections/${id}`),
  createCollection:   (data) => api.post('/admin/collections', data),
  updateCollection:   (id, data) => api.patch(`/admin/collections/${id}`, data),
  deleteCollection:   (id) => api.delete(`/admin/collections/${id}`),
  runCollection:      (id) => api.post(`/admin/collections/${id}/run`),
  getCollectionExecutions: (id, params) => api.get(`/admin/collections/${id}/executions`, { params }),
  getTransfers:       (params) => api.get('/admin/transfers', { params }),
  getActiveTransfers: () => api.get('/admin/transfers/active'),
  deleteTransfer:     (id) => api.delete(`/admin/transfers/${id}`),
  getAuditLogs:       (params) => api.get('/admin/audit', { params }),
  // Approbation
  getPendingUsers:    () => api.get('/admin/users/pending'),
  approveUser:        (id) => api.patch(`/admin/users/${id}/approve`),
  rejectUser:         (id) => api.delete(`/admin/users/${id}/reject`),
};

export default api;

