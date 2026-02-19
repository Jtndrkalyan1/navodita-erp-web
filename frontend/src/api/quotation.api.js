import apiClient from './client';

export const quotationApi = {
  list: (params) => apiClient.get('/quotations', { params }),
  getById: (id) => apiClient.get(`/quotations/${id}`),
  create: (data) => apiClient.post('/quotations', data),
  update: (id, data) => apiClient.put(`/quotations/${id}`, data),
  remove: (id) => apiClient.delete(`/quotations/${id}`),
};
