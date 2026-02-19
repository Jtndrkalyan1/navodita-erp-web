import apiClient from './client';

export const costingApi = {
  list: (params) => apiClient.get('/costing', { params }),
  getById: (id) => apiClient.get(`/costing/${id}`),
  create: (data) => apiClient.post('/costing', data),
  update: (id, data) => apiClient.put(`/costing/${id}`, data),
  remove: (id) => apiClient.delete(`/costing/${id}`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/costing/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
