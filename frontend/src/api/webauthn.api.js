import apiClient from './client';

/**
 * WebAuthn / Biometric Authentication API
 */

// ── Registration (requires auth token) ────────────────────────────

/** Get registration options from server */
export const getRegistrationOptions = () =>
  apiClient.post('/webauthn/register/options');

/** Send registration response to server for verification */
export const verifyRegistration = (data) =>
  apiClient.post('/webauthn/register/verify', data);

// ── Authentication (public) ───────────────────────────────────────

/** Get authentication options from server */
export const getAuthenticationOptions = (username) =>
  apiClient.post('/webauthn/login/options', { username });

/** Send authentication response to server for verification */
export const verifyAuthentication = (data) =>
  apiClient.post('/webauthn/login/verify', data);

// ── Credential Management (requires auth token) ──────────────────

/** List all registered credentials for the current user */
export const listCredentials = () =>
  apiClient.get('/webauthn/credentials');

/** Remove a credential by ID */
export const removeCredential = (id) =>
  apiClient.delete(`/webauthn/credentials/${id}`);

/** Check if a username has registered WebAuthn credentials */
export const checkCredentials = (username) =>
  apiClient.get(`/webauthn/check/${username}`);
