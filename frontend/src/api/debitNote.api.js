import apiClient from './client';

export const debitNoteApi = {
  list: (params) => apiClient.get('/debit-notes', { params }),
  getById: (id) => apiClient.get(`/debit-notes/${id}`),
  create: (data) => apiClient.post('/debit-notes', data),
  update: (id, data) => apiClient.put(`/debit-notes/${id}`, data),
  remove: (id) => apiClient.delete(`/debit-notes/${id}`),
};
