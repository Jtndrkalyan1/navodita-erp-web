import apiClient from './client';

export const bankAccountApi = {
  list: (params) => apiClient.get('/bank-accounts', { params }),
  getById: (id) => apiClient.get(`/bank-accounts/${id}`),
  create: (data) => apiClient.post('/bank-accounts', data),
  update: (id, data) => apiClient.put(`/bank-accounts/${id}`, data),
  remove: (id) => apiClient.delete(`/bank-accounts/${id}`),
};
