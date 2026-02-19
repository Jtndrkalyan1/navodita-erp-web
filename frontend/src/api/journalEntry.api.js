import apiClient from './client';

export const journalEntryApi = {
  list: (params) => apiClient.get('/journal-entries', { params }),
  getById: (id) => apiClient.get(`/journal-entries/${id}`),
  create: (data) => apiClient.post('/journal-entries', data),
  update: (id, data) => apiClient.put(`/journal-entries/${id}`, data),
  remove: (id) => apiClient.delete(`/journal-entries/${id}`),
};
