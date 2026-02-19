import apiClient from './client';

export const investorOrderApi = {
  // Orders
  list: (params) => apiClient.get('/investor-orders', { params }),
  getById: (id) => apiClient.get(`/investor-orders/${id}`),
  create: (data) => apiClient.post('/investor-orders', data),
  update: (id, data) => apiClient.put(`/investor-orders/${id}`, data),
  remove: (id) => apiClient.delete(`/investor-orders/${id}`),

  // Monthly summaries (Master Book)
  listSummaries: () => apiClient.get('/investor-orders/summary'),
  getSummary: (monthYear) => apiClient.get(`/investor-orders/summary/${encodeURIComponent(monthYear)}`),
  upsertSummary: (data) => apiClient.post('/investor-orders/summary', data),

  // Partners
  getPartners: () => apiClient.get('/investor-orders/partners'),
  updatePartners: (data) => apiClient.post('/investor-orders/partners', data),

  // Partner CRUD & profile
  getPartnerById: (id) => apiClient.get(`/investor-orders/partners/${id}`),
  createPartner: (data) => apiClient.post('/investor-orders/partners/create', data),
  updatePartner: (id, data) => apiClient.put(`/investor-orders/partners/${id}`, data),
  deletePartner: (id) => apiClient.delete(`/investor-orders/partners/${id}`),

  // Partner transactions (statement entries)
  getPartnerTransactions: (id) => apiClient.get(`/investor-orders/partners/${id}/transactions`),
  createPartnerTransaction: (id, data) => apiClient.post(`/investor-orders/partners/${id}/transactions`, data),
  deletePartnerTransaction: (txnId) => apiClient.delete(`/investor-orders/partners/transactions/${txnId}`),

  // Available months
  getMonths: () => apiClient.get('/investor-orders/months'),

  // Recalculate
  recalculate: (monthYear) => apiClient.post(`/investor-orders/recalculate/${encodeURIComponent(monthYear)}`),

  // Create next month
  createNextMonth: (monthYear) => apiClient.post(`/investor-orders/create-month/${encodeURIComponent(monthYear)}`),
};
