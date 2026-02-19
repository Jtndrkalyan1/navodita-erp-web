import apiClient from './client';

export const documentApi = {
  list: (params) => apiClient.get('/documents', { params }),
  getById: (id) => apiClient.get(`/documents/${id}`),
  upload: (formData) => apiClient.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => apiClient.delete(`/documents/${id}`),
};
