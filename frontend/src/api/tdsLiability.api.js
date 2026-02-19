import apiClient from './client';

export const tdsLiabilityApi = {
  list: (params) => apiClient.get('/tds-liabilities', { params }),
  getById: (id) => apiClient.get(`/tds-liabilities/${id}`),
  create: (data) => apiClient.post('/tds-liabilities', data),
  update: (id, data) => apiClient.put(`/tds-liabilities/${id}`, data),
  remove: (id) => apiClient.delete(`/tds-liabilities/${id}`),
};
