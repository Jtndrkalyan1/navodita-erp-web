import apiClient from './client';

export const packingListApi = {
  list: (params) => apiClient.get('/packing-lists', { params }),
  getById: (id) => apiClient.get(`/packing-lists/${id}`),
  create: (data) => apiClient.post('/packing-lists', data),
  update: (id, data) => apiClient.put(`/packing-lists/${id}`, data),
  remove: (id) => apiClient.delete(`/packing-lists/${id}`),
};
