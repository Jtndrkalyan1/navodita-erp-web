import apiClient from './client';

export const companyApi = {
  getProfile: () => apiClient.get('/company'),
  updateProfile: (data) => apiClient.put('/company', data),
};
