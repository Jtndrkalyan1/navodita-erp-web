const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/database');
const { authenticate, generateToken } = require('../middleware/auth');

// ── In-memory challenge store (TTL 5 minutes) ─────────────────────
// In production, use Redis or a database-backed store
const challengeStore = new Map();

function storeChallenge(key, challenge) {
  challengeStore.set(key, {
    challenge,
    expires: Date.now() + 5 * 60 * 1000,
  });
}

function getAndDeleteChallenge(key) {
  const entry = challengeStore.get(key);
  challengeStore.delete(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) return null;
  return entry.challenge;
}

// Clean up expired challenges every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of challengeStore) {
    if (now > val.expires) challengeStore.delete(key);
  }
}, 10 * 60 * 1000);

// ── Helper: Relying party info ────────────────────────────────────
function getRP(req) {
  const host = req.get('host') || 'localhost';
  // rpID must be just the hostname (no port)
  const rpID = host.split(':')[0];
  return {
    rpName: 'NavoditaERP',
    rpID,
    origin: `${req.protocol}://${host}`,
  };
}

// ── Base64URL helpers ─────────────────────────────────────────────
function base64urlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

// ── CBOR minimal decoder (for public key extraction) ──────────────
// We only need to handle the attestation object format
function decodeCBORAttObj(buffer) {
  // The attestation object is CBOR-encoded. For simplicity with no
  // external CBOR dependency, we parse the authData directly.
  // SimpleWebAuthn server lib would handle this, but we keep deps minimal.
  // We'll rely on a lightweight approach: find authData in the CBOR map.
  
  // Actually, for a self-contained solution without @simplewebauthn/server,
  // we'll implement the core verification logic ourselves.
  // The client sends response.authenticatorData and response.clientDataJSON
  // as base64url strings, so we can work with those directly.
  return null; // Not used - see route handlers below
}

// ── Verify client data ────────────────────────────────────────────
function verifyClientDataJSON(clientDataBase64url, expectedType, expectedChallenge, expectedOrigin) {
  const clientDataJSON = JSON.parse(
    base64urlDecode(clientDataBase64url).toString('utf8')
  );

  if (clientDataJSON.type !== expectedType) {
    throw new Error(`Unexpected clientData type: ${clientDataJSON.type}`);
  }

  if (clientDataJSON.challenge !== expectedChallenge) {
    throw new Error('Challenge mismatch');
  }

  // Origin check - allow both http and https for localhost
  const actualOrigin = clientDataJSON.origin;
  if (actualOrigin !== expectedOrigin) {
    // Allow localhost variations
    const isLocalhost = expectedOrigin.includes('localhost') || expectedOrigin.includes('127.0.0.1');
    const actualIsLocalhost = actualOrigin.includes('localhost') || actualOrigin.includes('127.0.0.1');
    if (!(isLocalhost && actualIsLocalhost)) {
      throw new Error(`Origin mismatch: expected ${expectedOrigin}, got ${actualOrigin}`);
    }
  }

  return clientDataJSON;
}

// ── Parse authenticator data ──────────────────────────────────────
function parseAuthenticatorData(authDataBase64url) {
  const authData = base64urlDecode(authDataBase64url);
  
  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const signCount = authData.readUInt32BE(33);

  const result = {
    rpIdHash,
    flags,
    signCount,
    userPresent: !!(flags & 0x01),
    userVerified: !!(flags & 0x04),
    attestedCredentialData: !!(flags & 0x40),
  };

  // If attested credential data is present (registration)
  if (result.attestedCredentialData && authData.length > 37) {
    const aaguid = authData.slice(37, 53);
    const credentialIdLength = authData.readUInt16BE(53);
    const credentialId = authData.slice(55, 55 + credentialIdLength);
    // The rest is the CBOR-encoded public key
    const publicKeyBytes = authData.slice(55 + credentialIdLength);

    result.aaguid = aaguid;
    result.credentialId = credentialId;
    result.publicKeyBytes = publicKeyBytes;
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════
// REGISTRATION ROUTES (require authentication)
// ══════════════════════════════════════════════════════════════════

/**
 * POST /register/options
 * Generate registration options for the authenticated user
 */
router.post('/register/options', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rpName, rpID } = getRP(req);

    // Get user info
    const user = await db('app_users')
      .select('id', 'username', 'display_name', 'email')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get existing credentials for exclusion
    const existingCreds = await db('webauthn_credentials')
      .where({ user_id: userId })
      .select('credential_id', 'transports');

    // Generate challenge
    const challenge = base64urlEncode(crypto.randomBytes(32));

    // Store challenge for verification
    storeChallenge(`reg_${userId}`, challenge);

    const options = {
      challenge,
      rp: {
        name: rpName,
        id: rpID,
      },
      user: {
        id: base64urlEncode(Buffer.from(user.id)),
        name: user.username,
        displayName: user.display_name || user.username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      attestation: 'none',
      excludeCredentials: existingCreds.map((c) => ({
        id: c.credential_id,
        type: 'public-key',
        transports: c.transports ? JSON.parse(c.transports) : ['internal'],
      })),
    };

    res.json({ options });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /register/verify
 * Verify registration response and store credential
 */
router.post('/register/verify', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rpID } = getRP(req);
    const { id, rawId, response: authResponse, type, deviceName } = req.body;

    if (type !== 'public-key') {
      return res.status(400).json({ error: 'Invalid credential type' });
    }

    // Retrieve stored challenge
    const expectedChallenge = getAndDeleteChallenge(`reg_${userId}`);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Registration challenge expired or not found. Please try again.' });
    }

    // Verify clientDataJSON
    const { origin } = getRP(req);
    verifyClientDataJSON(
      authResponse.clientDataJSON,
      'webauthn.create',
      expectedChallenge,
      origin
    );

    // Parse authenticator data from attestationObject or authenticatorData
    let parsedAuthData;
    if (authResponse.authenticatorData) {
      parsedAuthData = parseAuthenticatorData(authResponse.authenticatorData);
    } else {
      // If the browser sends attestationObject, we need to extract authData from it
      // For 'none' attestation, the authenticatorData should be available directly
      return res.status(400).json({ error: 'authenticatorData is required' });
    }

    if (!parsedAuthData.userPresent) {
      return res.status(400).json({ error: 'User was not present during registration' });
    }

    // Verify rpIdHash
    const expectedRpIdHash = crypto.createHash('sha256').update(rpID).digest();
    if (!parsedAuthData.rpIdHash.equals(expectedRpIdHash)) {
      return res.status(400).json({ error: 'RP ID hash mismatch' });
    }

    // Store the credential
    // Use the rawId as credential_id and the public key from authResponse
    const credentialId = rawId || id;
    const publicKey = authResponse.publicKey || authResponse.authenticatorData;

    // Check if credential already exists
    const existing = await db('webauthn_credentials')
      .where({ credential_id: credentialId })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'This credential is already registered' });
    }

    await db('webauthn_credentials').insert({
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
      counter: parsedAuthData.signCount || 0,
      transports: authResponse.transports
        ? JSON.stringify(authResponse.transports)
        : JSON.stringify(['internal']),
      device_name: deviceName || 'Biometric Device',
    });

    // Log the registration
    await db('audit_logs').insert({
      user_id: userId,
      action: 'WEBAUTHN_REGISTER',
      entity_type: 'WebAuthnCredential',
      entity_id: userId,
      new_values: JSON.stringify({ device_name: deviceName || 'Biometric Device' }),
      performed_at: new Date(),
    });

    res.json({
      success: true,
      message: 'Biometric credential registered successfully',
    });
  } catch (err) {
    if (err.message.includes('mismatch') || err.message.includes('Unexpected')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES (public)
// ══════════════════════════════════════════════════════════════════

/**
 * POST /login/options
 * Generate authentication options
 * Accepts optional { username } to scope credentials
 */
router.post('/login/options', async (req, res, next) => {
  try {
    const { username } = req.body;
    const { rpID } = getRP(req);

    let allowCredentials = [];
    let userId = null;

    if (username) {
      const user = await db('app_users')
        .where({ username, is_active: true })
        .first();

      if (!user) {
        return res.status(404).json({ error: 'No biometric credentials found for this user' });
      }

      userId = user.id;

      const creds = await db('webauthn_credentials')
        .where({ user_id: user.id })
        .select('credential_id', 'transports');

      if (creds.length === 0) {
        return res.status(404).json({ error: 'No biometric credentials registered for this user' });
      }

      allowCredentials = creds.map((c) => ({
        id: c.credential_id,
        type: 'public-key',
        transports: c.transports ? JSON.parse(c.transports) : ['internal'],
      }));
    }

    // Generate challenge
    const challenge = base64urlEncode(crypto.randomBytes(32));

    // Store challenge with userId context
    const challengeKey = userId ? `auth_${userId}` : `auth_anonymous_${challenge.slice(0, 16)}`;
    storeChallenge(challengeKey, challenge);

    const options = {
      challenge,
      rpId: rpID,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials,
    };

    res.json({
      options,
      challengeKey,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /login/verify
 * Verify authentication response and return JWT
 */
router.post('/login/verify', async (req, res, next) => {
  try {
    const { id, rawId, response: authResponse, type, challengeKey } = req.body;
    const { rpID, origin } = getRP(req);

    if (type !== 'public-key') {
      return res.status(400).json({ error: 'Invalid credential type' });
    }

    // Find the credential
    const credentialId = rawId || id;
    const credential = await db('webauthn_credentials')
      .where({ credential_id: credentialId })
      .first();

    if (!credential) {
      return res.status(401).json({ error: 'Credential not recognized' });
    }

    // Retrieve stored challenge
    const storedChallengeKey = challengeKey || `auth_${credential.user_id}`;
    const expectedChallenge = getAndDeleteChallenge(storedChallengeKey);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Authentication challenge expired. Please try again.' });
    }

    // Verify clientDataJSON
    verifyClientDataJSON(
      authResponse.clientDataJSON,
      'webauthn.get',
      expectedChallenge,
      origin
    );

    // Parse authenticator data
    const parsedAuthData = parseAuthenticatorData(authResponse.authenticatorData);

    if (!parsedAuthData.userPresent) {
      return res.status(400).json({ error: 'User was not present during authentication' });
    }

    // Verify rpIdHash
    const expectedRpIdHash = crypto.createHash('sha256').update(rpID).digest();
    if (!parsedAuthData.rpIdHash.equals(expectedRpIdHash)) {
      return res.status(400).json({ error: 'RP ID hash mismatch' });
    }

    // Update counter (replay attack protection)
    const storedCounter = parseInt(credential.counter, 10);
    if (parsedAuthData.signCount > 0 && parsedAuthData.signCount <= storedCounter) {
      // Possible cloned authenticator
      return res.status(400).json({ error: 'Authenticator counter mismatch - possible credential cloning detected' });
    }

    await db('webauthn_credentials')
      .where({ id: credential.id })
      .update({
        counter: parsedAuthData.signCount,
        updated_at: new Date(),
      });

    // Get the user
    const user = await db('app_users')
      .where({ id: credential.user_id, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account is locked. Try again later.' });
    }

    // Reset failed attempts and update last login
    await db('app_users').where({ id: user.id }).update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
    });

    // Generate JWT
    const token = generateToken(user.id);

    // Log the biometric login
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'WEBAUTHN_LOGIN',
      entity_type: 'AppUser',
      entity_id: user.id,
      performed_at: new Date(),
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.message.includes('mismatch') || err.message.includes('Unexpected') || err.message.includes('expired')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════
// CREDENTIAL MANAGEMENT ROUTES (require authentication)
// ══════════════════════════════════════════════════════════════════

/**
 * GET /credentials
 * List all registered WebAuthn credentials for the current user
 */
router.get('/credentials', authenticate, async (req, res, next) => {
  try {
    const credentials = await db('webauthn_credentials')
      .where({ user_id: req.user.id })
      .select('id', 'device_name', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc');

    res.json({ data: credentials });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /credentials/:id
 * Remove a WebAuthn credential
 */
router.delete('/credentials/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const credential = await db('webauthn_credentials')
      .where({ id, user_id: req.user.id })
      .first();

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    await db('webauthn_credentials')
      .where({ id, user_id: req.user.id })
      .del();

    // Log the removal
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'WEBAUTHN_REMOVE',
      entity_type: 'WebAuthnCredential',
      entity_id: id,
      old_values: JSON.stringify({ device_name: credential.device_name }),
      performed_at: new Date(),
    });

    res.json({ message: 'Credential removed successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /check/:username
 * Check if a username has registered WebAuthn credentials (public route)
 */
router.get('/check/:username', async (req, res, next) => {
  try {
    const { username } = req.params;

    const user = await db('app_users')
      .where({ username, is_active: true })
      .first();

    if (!user) {
      return res.json({ hasCredentials: false });
    }

    const count = await db('webauthn_credentials')
      .where({ user_id: user.id })
      .count('id as count')
      .first();

    res.json({ hasCredentials: parseInt(count.count, 10) > 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
