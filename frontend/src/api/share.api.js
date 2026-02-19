import apiClient from './client';

export const shareApi = {
  sendEmail: (data) => apiClient.post('/share/email', data),
  getWhatsAppLink: (data) => apiClient.post('/share/whatsapp', data),
  getConfig: () => apiClient.get('/share/config'),
};
