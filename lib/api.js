import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://10.112.30.143:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT automatically ──────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = Cookies.get('NFS_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Handle 401 globally ───────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('NFS_token');
      Cookies.remove('NFS_user');
      // Ne pas rediriger si on est déjà sur une page d'auth (login, verify-otp…)
      // sinon la page se recharge et le message d'erreur n'apparaît jamais.
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/verify-otp') &&
        !window.location.pathname.startsWith('/forgot-password') &&
        !window.location.pathname.startsWith('/reset-password')
      ) {
        window.location.href = '/login';
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
  forgotPassword:    (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:     (email, token, password) => api.post('/auth/reset-password', { email, token, password }),
  changePassword:    (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
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
  getUsers:           (params) => api.get('/admin/users', { params }),
  updateUser:         (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser:         (id) => api.delete(`/admin/users/${id}`),
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

