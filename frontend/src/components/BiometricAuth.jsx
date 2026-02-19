import React, { useState, useEffect, useCallback } from 'react';
import { HiOutlineFingerPrint } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import {
  getAuthenticationOptions,
  verifyAuthentication,
  checkCredentials,
} from '../api/webauthn.api';

/**
 * Base64URL helpers for WebAuthn browser API
 */
function base64urlToBuffer(base64url) {
  let str = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Check if WebAuthn is supported in the current browser
 */
function isWebAuthnSupported() {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Check if platform authenticator (fingerprint/face) is available
 */
async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * BiometricAuth component
 * Shows fingerprint/biometric login button on the login page.
 * Handles both first-time setup prompt and subsequent biometric logins.
 *
 * Props:
 *   - username: current username typed in login form
 *   - onLoginSuccess: callback({ token, user }) when biometric login succeeds
 *   - mode: 'login' (default) or 'setup' (for settings page)
 */
export default function BiometricAuth({ username, onLoginSuccess, mode = 'login' }) {
  const [supported, setSupported] = useState(false);
  const [hasCredential, setHasCredential] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check browser support on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await isPlatformAuthenticatorAvailable();
      if (!cancelled) {
        setSupported(available);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Check if the current username has registered credentials
  const checkUserCredentials = useCallback(async () => {
    if (!username || !username.trim()) {
      setHasCredential(false);
      return;
    }

    try {
      const res = await checkCredentials(username.trim());
      setHasCredential(res.data.hasCredentials);
    } catch {
      setHasCredential(false);
    }
  }, [username]);

  useEffect(() => {
    if (supported && mode === 'login') {
      const timer = setTimeout(checkUserCredentials, 500);
      return () => clearTimeout(timer);
    }
  }, [username, supported, mode, checkUserCredentials]);

  // ── Handle biometric authentication ─────────────────────────────
  const handleBiometricLogin = async () => {
    if (!username || !username.trim()) {
      toast.error('Please enter your username first.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Get authentication options from server
      const optionsRes = await getAuthenticationOptions(username.trim());
      const { options, challengeKey } = optionsRes.data;

      // Step 2: Convert base64url values to ArrayBuffers for browser API
      const publicKeyOptions = {
        challenge: base64urlToBuffer(options.challenge),
        rpId: options.rpId,
        timeout: options.timeout,
        userVerification: options.userVerification,
        allowCredentials: (options.allowCredentials || []).map((cred) => ({
          id: base64urlToBuffer(cred.id),
          type: cred.type,
          transports: cred.transports,
        })),
      };

      // Step 3: Trigger the browser's biometric prompt
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });

      // Step 4: Encode the response for the server
      const authResponse = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        challengeKey,
        response: {
          authenticatorData: bufferToBase64url(credential.response.authenticatorData),
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          signature: bufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle
            ? bufferToBase64url(credential.response.userHandle)
            : null,
        },
      };

      // Step 5: Verify with server
      const verifyRes = await verifyAuthentication(authResponse);
      const { token, user } = verifyRes.data;

      toast.success('Biometric login successful!');

      if (onLoginSuccess) {
        onLoginSuccess({ token, user });
      }
    } catch (err) {
      // Handle user cancellation
      if (err.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled.');
      } else if (err.name === 'SecurityError') {
        toast.error('Security error. Make sure you are using HTTPS or localhost.');
      } else {
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Biometric authentication failed. Please try password login.';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Don't render if not supported or still checking ─────────────
  if (checking || !supported) {
    return null;
  }

  // ── Login mode: show biometric login button ─────────────────────
  if (mode === 'login') {
    return (
      <div className="mt-5">
        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[var(--zoho-border)]" />
          <span className="text-xs text-[var(--zoho-text-secondary)] select-none">or</span>
          <div className="flex-1 h-px bg-[var(--zoho-border)]" />
        </div>

        <button
          type="button"
          onClick={handleBiometricLogin}
          disabled={loading || !username?.trim()}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-sm font-medium
                     border border-[var(--zoho-border)] rounded-lg transition-all duration-150
                     hover:bg-gray-50 hover:border-[var(--zoho-blue)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-[var(--zoho-text)] cursor-pointer"
          title={
            !username?.trim()
              ? 'Enter your username to use biometric login'
              : hasCredential
                ? 'Use Fingerprint to Login'
                : 'Set up Fingerprint Unlock after signing in'
          }
        >
          <HiOutlineFingerPrint
            className={`w-5 h-5 ${loading ? 'animate-pulse' : ''} ${
              hasCredential ? 'text-[var(--zoho-blue)]' : 'text-[var(--zoho-text-secondary)]'
            }`}
          />
          {loading ? (
            <span>Authenticating...</span>
          ) : hasCredential ? (
            <span>Use Fingerprint to Login</span>
          ) : (
            <span className="text-[var(--zoho-text-secondary)]">
              Use Fingerprint Login
            </span>
          )}
        </button>

        {!hasCredential && username?.trim() && (
          <p className="text-xs text-center text-[var(--zoho-text-secondary)] mt-2">
            Sign in with your password first, then set up fingerprint in Settings
          </p>
        )}
      </div>
    );
  }

  return null;
}

/**
 * BiometricSetup component for the Settings page
 * Allows registering and managing biometric credentials
 */
export function BiometricSetup() {
  const [supported, setSupported] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await isPlatformAuthenticatorAvailable();
      if (!cancelled) {
        setSupported(available);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const { listCredentials } = await import('../api/webauthn.api');
      const res = await listCredentials();
      setCredentials(res.data.data || []);
    } catch {
      // Silently fail - API might not be available yet
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supported) {
      fetchCredentials();
    }
  }, [supported, fetchCredentials]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const { getRegistrationOptions, verifyRegistration } = await import('../api/webauthn.api');

      // Step 1: Get registration options
      const optionsRes = await getRegistrationOptions();
      const { options } = optionsRes.data;

      // Step 2: Convert for browser API
      const publicKeyOptions = {
        challenge: base64urlToBuffer(options.challenge),
        rp: options.rp,
        user: {
          ...options.user,
          id: base64urlToBuffer(options.user.id),
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        authenticatorSelection: options.authenticatorSelection,
        attestation: options.attestation,
        excludeCredentials: (options.excludeCredentials || []).map((cred) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        })),
      };

      // Step 3: Trigger browser registration prompt
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });

      // Step 4: Encode response for server
      const attestationResponse = credential.response;
      const registrationData = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        deviceName: navigator.platform || 'Unknown Device',
        response: {
          clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
          authenticatorData: attestationResponse.getAuthenticatorData
            ? bufferToBase64url(attestationResponse.getAuthenticatorData())
            : bufferToBase64url(attestationResponse.attestationObject),
          publicKey: attestationResponse.getPublicKey
            ? bufferToBase64url(attestationResponse.getPublicKey())
            : null,
          transports: attestationResponse.getTransports
            ? attestationResponse.getTransports()
            : ['internal'],
        },
      };

      // Step 5: Verify with server
      await verifyRegistration(registrationData);

      toast.success('Fingerprint registered successfully!');
      fetchCredentials();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.error('Biometric registration was cancelled.');
      } else if (err.name === 'InvalidStateError') {
        toast.error('This device is already registered.');
      } else {
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to register biometric credential.';
        toast.error(message);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRemove = async (credId) => {
    if (!window.confirm('Remove this biometric credential? You will not be able to use it to log in anymore.')) {
      return;
    }

    try {
      const { removeCredential } = await import('../api/webauthn.api');
      await removeCredential(credId);
      toast.success('Credential removed');
      fetchCredentials();
    } catch (err) {
      const message =
        err.response?.data?.error || 'Failed to remove credential.';
      toast.error(message);
    }
  };

  if (checking) {
    return null;
  }

  if (!supported) {
    return (
      <div className="mt-6 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineFingerPrint className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-700">
            <p className="font-medium">Biometric Login Not Available</p>
            <p className="mt-0.5">
              Your browser or device does not support biometric authentication (WebAuthn).
              Try using a modern browser like Chrome, Safari, or Edge on a device with a fingerprint sensor or Face ID.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#333]">Fingerprint / Biometric Login</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Use your device's fingerprint sensor or Face ID to sign in quickly
          </p>
        </div>
      </div>

      {/* Registered credentials list */}
      {loading ? (
        <div className="text-xs text-[#9CA3AF] py-2">Loading credentials...</div>
      ) : credentials.length > 0 ? (
        <div className="border border-[#E5E7EB] rounded-lg divide-y divide-[#E5E7EB]">
          {credentials.map((cred) => (
            <div key={cred.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
                  <HiOutlineFingerPrint className="w-4 h-4 text-[#0071DC]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#333]">{cred.device_name || 'Biometric Device'}</p>
                  <p className="text-xs text-[#9CA3AF]">
                    Registered {new Date(cred.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(cred.id)}
                className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-[#6B7280]">
            No biometric credentials registered yet. Click the button below to set up fingerprint login.
          </p>
        </div>
      )}

      {/* Register new credential button */}
      <button
        type="button"
        onClick={handleRegister}
        disabled={registering}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0071DC] rounded-lg hover:bg-[#005BB5] transition-colors disabled:opacity-50 cursor-pointer"
      >
        {registering ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Registering...
          </>
        ) : (
          <>
            <HiOutlineFingerPrint className="w-4 h-4" />
            {credentials.length > 0 ? 'Add Another Device' : 'Set up Fingerprint Unlock'}
          </>
        )}
      </button>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HiOutlineFingerPrint className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium">How it works</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>Register your device's biometric sensor (fingerprint or face)</li>
              <li>On the login page, enter your username and click "Use Fingerprint to Login"</li>
              <li>Your browser will prompt you for biometric verification</li>
              <li>Your biometric data never leaves your device - only a cryptographic key is stored</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
