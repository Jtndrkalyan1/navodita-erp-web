import apiClient from './client';

export const salaryApi = {
  list: (params) => apiClient.get('/salary-records', { params }),
  getById: (id) => apiClient.get(`/salary-records/${id}`),
  create: (data) => apiClient.post('/salary-records', data),
  update: (id, data) => apiClient.put(`/salary-records/${id}`, data),
  remove: (id) => apiClient.delete(`/salary-records/${id}`),
  generate: (data) => apiClient.post('/salary-records/generate', data),
};
