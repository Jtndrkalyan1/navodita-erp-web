import apiClient from './client';

export const deliveryChallanApi = {
  list: (params) => apiClient.get('/delivery-challans', { params }),
  getById: (id) => apiClient.get(`/delivery-challans/${id}`),
  create: (data) => apiClient.post('/delivery-challans', data),
  update: (id, data) => apiClient.put(`/delivery-challans/${id}`, data),
  remove: (id) => apiClient.delete(`/delivery-challans/${id}`),
};
