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
  register: (data) => api.post('/auth/register', data),
  requestOTP: (email) => api.post('/auth/login', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
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

export default api;

