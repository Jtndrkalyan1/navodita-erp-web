import apiClient from './client';

export const tdsChallanApi = {
  list: (params) => apiClient.get('/tds-challans', { params }),
  getById: (id) => apiClient.get(`/tds-challans/${id}`),
  create: (data) => apiClient.post('/tds-challans', data),
  update: (id, data) => apiClient.put(`/tds-challans/${id}`, data),
  remove: (id) => apiClient.delete(`/tds-challans/${id}`),
};
