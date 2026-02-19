import apiClient from './client';

export const bankTransactionApi = {
  list: (params) => apiClient.get('/bank-transactions', { params }),
  getById: (id) => apiClient.get(`/bank-transactions/${id}`),
  create: (data) => apiClient.post('/bank-transactions', data),
  update: (id, data) => apiClient.put(`/bank-transactions/${id}`, data),
  remove: (id) => apiClient.delete(`/bank-transactions/${id}`),
};
