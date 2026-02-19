import apiClient from './client';

export const invoiceApi = {
  list: (params) => apiClient.get('/invoices', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  update: (id, data) => apiClient.put(`/invoices/${id}`, data),
  remove: (id) => apiClient.delete(`/invoices/${id}`),
};
