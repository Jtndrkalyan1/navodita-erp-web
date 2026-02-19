import apiClient from './client';

export const creditNoteApi = {
  list: (params) => apiClient.get('/credit-notes', { params }),
  getById: (id) => apiClient.get(`/credit-notes/${id}`),
  create: (data) => apiClient.post('/credit-notes', data),
  update: (id, data) => apiClient.put(`/credit-notes/${id}`, data),
  remove: (id) => apiClient.delete(`/credit-notes/${id}`),
};
