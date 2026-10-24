import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (data) => api.post('/auth/login', data);
export const switchRole = (role) => api.post('/auth/switch-role', { role });
export const getMe = () => api.get('/auth/me');

// FDR
export const submitFDR = (formData) => api.post('/fdr/submit', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAllFDRs = (params) => api.get('/fdr', { params });
export const getFDR = (id) => api.get(`/fdr/${id}`);
export const markUnderScrutiny = (id) => api.put(`/fdr/${id}/scrutiny`);
export const flagDiscrepancy = (id, data) => api.put(`/fdr/${id}/flag-discrepancy`, data);
export const approveFDR = (id, data) => api.put(`/fdr/${id}/approve`, data);
export const verifyCBS = (id) => api.post(`/fdr/${id}/verify-cbs`);
export const bankVerify = (id, data) => api.put(`/fdr/${id}/bank-verify`, data);
export const renewFDR = (id, formData) => api.post(`/fdr/${id}/renew`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const requestRelease = (id, data) => api.post(`/fdr/${id}/request-release`, data);
export const scrutinyRecommend = (id, data) => api.put(`/fdr/${id}/scrutiny-recommend`, data);
export const directorApprove = (id, data) => api.put(`/fdr/${id}/director-approve`, data);
export const forfeitFDR = (id, data) => api.put(`/fdr/${id}/forfeit`, data);
export const getDashboard = () => api.get('/fdr/analytics/dashboard');
export const exportCSV = () => api.get('/fdr/export/csv', { responseType: 'blob' });

// Bank CBS
export const getBankRecords = (params) => api.get('/bank', { params });
export const createBankRecord = (data) => api.post('/bank', data);
export const updateBankRecord = (id, data) => api.put(`/bank/${id}`, data);
export const deleteBankRecord = (id) => api.delete(`/bank/${id}`);

// Bulk Import
export const downloadSampleCSV = () => api.get('/bulk-import/sample-csv', { responseType: 'blob' });
export const previewBulkImport = (formData) => api.post('/bulk-import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const executeBulkImport = (formData) => api.post('/bulk-import/execute', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Misc
export const getAuditLogs = (params) => api.get('/audit', { params });
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

// Maturity Check
export const runMaturityCheck = () => api.post('/run-maturity-check');

// Seed
export const seedDatabase = () => api.post('/seed');

export default api;
