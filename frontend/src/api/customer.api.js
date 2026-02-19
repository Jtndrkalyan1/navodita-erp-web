import apiClient from './client';

export const customerApi = {
  list: (params) => apiClient.get('/customers', { params }),
  getById: (id) => apiClient.get(`/customers/${id}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.put(`/customers/${id}`, data),
  remove: (id) => apiClient.delete(`/customers/${id}`),
  getStatement: (id, params) => apiClient.get(`/customers/${id}/statement`, { params }),
};
