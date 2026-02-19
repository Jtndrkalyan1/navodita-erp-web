import apiClient from './client';

export const paymentReceivedApi = {
  list: (params) => apiClient.get('/payments-received', { params }),
  stats: (params) => apiClient.get('/payments-received/stats', { params }),
  getById: (id) => apiClient.get(`/payments-received/${id}`),
  create: (data) => apiClient.post('/payments-received', data),
  update: (id, data) => apiClient.put(`/payments-received/${id}`, data),
  remove: (id) => apiClient.delete(`/payments-received/${id}`),
};
