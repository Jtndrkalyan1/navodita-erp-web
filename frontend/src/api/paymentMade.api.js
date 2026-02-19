import apiClient from './client';

export const paymentMadeApi = {
  list: (params) => apiClient.get('/payments-made', { params }),
  stats: (params) => apiClient.get('/payments-made/stats', { params }),
  getById: (id) => apiClient.get(`/payments-made/${id}`),
  create: (data) => apiClient.post('/payments-made', data),
  update: (id, data) => apiClient.put(`/payments-made/${id}`, data),
  remove: (id) => apiClient.delete(`/payments-made/${id}`),
};
