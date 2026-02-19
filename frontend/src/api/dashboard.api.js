import apiClient from './client';

export const dashboardApi = {
  getSummary: () => apiClient.get('/dashboard'),
};
