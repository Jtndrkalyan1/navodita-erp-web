import apiClient from './client';

export const hrPolicyApi = {
  list: (params) => apiClient.get('/hr-policies', { params }),
  getById: (id) => apiClient.get(`/hr-policies/${id}`),
  create: (data) => apiClient.post('/hr-policies', data),
  update: (id, data) => apiClient.put(`/hr-policies/${id}`, data),
  remove: (id) => apiClient.delete(`/hr-policies/${id}`),
  seed: () => apiClient.post('/hr-policies/seed'),
};
