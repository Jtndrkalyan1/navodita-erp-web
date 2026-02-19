import apiClient from './client';

export const ewayBillApi = {
  list: (params) => apiClient.get('/eway-bills', { params }),
  getById: (id) => apiClient.get(`/eway-bills/${id}`),
  create: (data) => apiClient.post('/eway-bills', data),
  update: (id, data) => apiClient.put(`/eway-bills/${id}`, data),
  remove: (id) => apiClient.delete(`/eway-bills/${id}`),
};
