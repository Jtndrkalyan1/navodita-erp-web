import apiClient from './client';

export const itemApi = {
  list: (params) => apiClient.get('/items', { params }),
  getById: (id) => apiClient.get(`/items/${id}`),
  create: (data) => apiClient.post('/items', data),
  update: (id, data) => apiClient.put(`/items/${id}`, data),
  remove: (id) => apiClient.delete(`/items/${id}`),
};
