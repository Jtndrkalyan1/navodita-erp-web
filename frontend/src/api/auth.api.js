import apiClient from './client';

/**
 * POST /auth/register
 * Create a new user account
 */
export const registerUser = (data) =>
  apiClient.post('/auth/register', data);

/**
 * POST /auth/change-password
 * Change password for the currently authenticated user
 */
export const changePassword = (data) =>
  apiClient.post('/auth/change-password', data);

/**
 * POST /auth/login
 * Login with username and password
 */
export const loginUser = (data) =>
  apiClient.post('/auth/login', data);
