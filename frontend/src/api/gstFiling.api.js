import apiClient from './client';

export const gstFilingApi = {
  list: (params) => apiClient.get('/gst-filings', { params }),
  getById: (id) => apiClient.get(`/gst-filings/${id}`),
  create: (data) => apiClient.post('/gst-filings', data),
  update: (id, data) => apiClient.put(`/gst-filings/${id}`, data),
  remove: (id) => apiClient.delete(`/gst-filings/${id}`),
};
