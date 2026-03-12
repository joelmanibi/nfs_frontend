import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT automatically ──────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = Cookies.get('nfs_token');
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
      Cookies.remove('nfs_token');
      Cookies.remove('nfs_user');
      if (typeof window !== 'undefined') {
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
  forgotPassword:    (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:     (email, token, password) => api.post('/auth/reset-password', { email, token, password }),
  changePassword:    (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
};

// ── Files ─────────────────────────────────────────────────────────────────────
export const filesAPI = {
  upload: (formData) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  download: (id, downloadCode) =>
    api.post(
      `/files/${id}/download`,
      downloadCode ? { downloadCode } : {},
      { responseType: 'blob' },
    ),

  getInbox: () => api.get('/files/inbox'),
  getSent: () => api.get('/files/sent'),
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
};

export default api;

