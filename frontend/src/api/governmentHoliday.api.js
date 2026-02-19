import apiClient from './client';

export const governmentHolidayApi = {
  list: (params) => apiClient.get('/government-holidays', { params }),
  getById: (id) => apiClient.get(`/government-holidays/${id}`),
  create: (data) => apiClient.post('/government-holidays', data),
  update: (id, data) => apiClient.put(`/government-holidays/${id}`, data),
  remove: (id) => apiClient.delete(`/government-holidays/${id}`),
  seed: (year) => apiClient.post('/government-holidays/seed', {}, { params: year ? { year } : {} }),
};
