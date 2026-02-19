import apiClient from './client';

export const vendorApi = {
  list: (params) => apiClient.get('/vendors', { params }),
  getById: (id) => apiClient.get(`/vendors/${id}`),
  create: (data) => apiClient.post('/vendors', data),
  update: (id, data) => apiClient.put(`/vendors/${id}`, data),
  remove: (id) => apiClient.delete(`/vendors/${id}`),
  getStatement: (id, params) => apiClient.get(`/vendors/${id}/statement`, { params }),
};
