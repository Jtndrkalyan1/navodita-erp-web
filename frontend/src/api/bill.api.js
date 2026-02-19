import apiClient from './client';

export const billApi = {
  list: (params) => apiClient.get('/bills', { params }),
  stats: (params) => apiClient.get('/bills/stats', { params }),
  getById: (id) => apiClient.get(`/bills/${id}`),
  create: (data) => apiClient.post('/bills', data),
  update: (id, data) => apiClient.put(`/bills/${id}`, data),
  remove: (id) => apiClient.delete(`/bills/${id}`),
};
