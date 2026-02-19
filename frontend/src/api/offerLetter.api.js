import apiClient from './client';

export const offerLetterApi = {
  list: (params) => apiClient.get('/offer-letters', { params }),
  getById: (id) => apiClient.get(`/offer-letters/${id}`),
  create: (data) => apiClient.post('/offer-letters', data),
  update: (id, data) => apiClient.put(`/offer-letters/${id}`, data),
  remove: (id) => apiClient.delete(`/offer-letters/${id}`),
};
