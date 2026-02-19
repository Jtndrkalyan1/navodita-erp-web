import apiClient from './client';

export const purchaseOrderApi = {
  list: (params) => apiClient.get('/purchase-orders', { params }),
  getById: (id) => apiClient.get(`/purchase-orders/${id}`),
  create: (data) => apiClient.post('/purchase-orders', data),
  update: (id, data) => apiClient.put(`/purchase-orders/${id}`, data),
  remove: (id) => apiClient.delete(`/purchase-orders/${id}`),
};
