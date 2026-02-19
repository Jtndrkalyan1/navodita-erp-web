import apiClient from './client';

export const joiningLetterApi = {
  list: (params) => apiClient.get('/joining-letters', { params }),
  getById: (id) => apiClient.get(`/joining-letters/${id}`),
  create: (data) => apiClient.post('/joining-letters', data),
  update: (id, data) => apiClient.put(`/joining-letters/${id}`, data),
  remove: (id) => apiClient.delete(`/joining-letters/${id}`),
};
