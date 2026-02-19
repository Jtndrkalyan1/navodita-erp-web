import apiClient from './client';

export const chartOfAccountApi = {
  list: (params) => apiClient.get('/chart-of-accounts', { params }),
  getById: (id) => apiClient.get(`/chart-of-accounts/${id}`),
  create: (data) => apiClient.post('/chart-of-accounts', data),
  update: (id, data) => apiClient.put(`/chart-of-accounts/${id}`, data),
  remove: (id) => apiClient.delete(`/chart-of-accounts/${id}`),
};
