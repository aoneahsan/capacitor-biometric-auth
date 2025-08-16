import { WebAuthnCreateOptions, WebAuthnGetOptions } from '../definitions';

/**
 * Convert various input formats to ArrayBuffer for WebAuthn API
 */
export function toArrayBuffer(
  data: ArrayBuffer | Uint8Array | string | undefined
): ArrayBuffer | undefined {
  if (!data) return undefined;

  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (data instanceof Uint8Array) {
    // Ensure we're working with ArrayBuffer, not SharedArrayBuffer
    const buffer = data.buffer as ArrayBuffer;
    return buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
  }

  if (typeof data === 'string') {
    try {
      // First try base64url decoding (WebAuthn standard)
      const base64 = data
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(data.length + ((4 - (data.length % 4)) % 4), '=');

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch {
      try {
        // Fallback to regular base64 decoding
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      } catch {
        // If both fail, encode as UTF-8
        return new TextEncoder().encode(data).buffer;
      }
    }
  }

  return undefined;
}

/**
 * Convert ArrayBuffer to base64 string for storage
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert ArrayBuffer to base64url string (WebAuthn standard)
 */
export function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate a cryptographically secure random challenge
 */
export function generateChallenge(): ArrayBuffer {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge.buffer;
}

/**
 * Merge user-provided WebAuthn create options with defaults
 */
export function mergeCreateOptions(
  userOptions?: WebAuthnCreateOptions,
  defaults?: Partial<PublicKeyCredentialCreationOptions>
): PublicKeyCredentialCreationOptions {
  const challenge =
    toArrayBuffer(userOptions?.challenge) || generateChallenge();

  const options: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name:
        userOptions?.rp?.name || defaults?.rp?.name || window.location.hostname,
      id: userOptions?.rp?.id || defaults?.rp?.id || window.location.hostname,
    },
    user: {
      id:
        toArrayBuffer(userOptions?.user?.id) ||
        (defaults?.user?.id instanceof ArrayBuffer ||
        defaults?.user?.id instanceof Uint8Array
          ? toArrayBuffer(defaults.user.id)
          : undefined) ||
        crypto.getRandomValues(new Uint8Array(16)).buffer,
      name:
        userOptions?.user?.name ||
        defaults?.user?.name ||
        `user@${window.location.hostname}`,
      displayName:
        userOptions?.user?.displayName || defaults?.user?.displayName || 'User',
    },
    pubKeyCredParams: userOptions?.pubKeyCredParams ||
      defaults?.pubKeyCredParams || [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
    timeout: userOptions?.timeout || defaults?.timeout || 60000,
    attestation: userOptions?.attestation || defaults?.attestation || 'none',
  };

  // Add optional properties if provided
  if (userOptions?.authenticatorSelection || defaults?.authenticatorSelection) {
    options.authenticatorSelection = {
      ...defaults?.authenticatorSelection,
      ...userOptions?.authenticatorSelection,
    };
  }

  if (userOptions?.attestationFormats) {
    (options as { attestationFormats?: string[] }).attestationFormats = userOptions.attestationFormats;
  }

  if (userOptions?.excludeCredentials) {
    options.excludeCredentials = userOptions.excludeCredentials.map((cred) => ({
      ...cred,
      id: toArrayBuffer(cred.id)!,
    }));
  }

  if (userOptions?.extensions) {
    options.extensions = userOptions.extensions;
  }

  if (userOptions?.hints) {
    (options as { hints?: string[] }).hints = userOptions.hints;
  }

  return options;
}

/**
 * Merge user-provided WebAuthn get options with defaults
 */
export function mergeGetOptions(
  userOptions?: WebAuthnGetOptions,
  defaults?: Partial<PublicKeyCredentialRequestOptions>
): PublicKeyCredentialRequestOptions {
  const challenge =
    toArrayBuffer(userOptions?.challenge) || generateChallenge();

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: userOptions?.timeout || defaults?.timeout || 60000,
  };

  // Add optional properties if provided
  if (userOptions?.rpId || defaults?.rpId) {
    options.rpId = userOptions?.rpId || defaults?.rpId;
  }

  if (userOptions?.allowCredentials || defaults?.allowCredentials) {
    const userCreds = userOptions?.allowCredentials || [];
    const defaultCreds = defaults?.allowCredentials || [];
    options.allowCredentials = [...userCreds, ...defaultCreds].map((cred) => ({
      type: 'public-key' as PublicKeyCredentialType,
      id: toArrayBuffer(cred.id as string | ArrayBuffer | Uint8Array)!,
      transports: cred.transports,
    })) as PublicKeyCredentialDescriptor[];
  }

  if (userOptions?.userVerification || defaults?.userVerification) {
    options.userVerification =
      userOptions?.userVerification || defaults?.userVerification;
  }

  if (userOptions?.extensions || defaults?.extensions) {
    options.extensions = {
      ...defaults?.extensions,
      ...userOptions?.extensions,
    };
  }

  if (userOptions?.hints) {
    (options as { hints?: string[] }).hints = userOptions.hints;
  }

  return options;
}

/**
 * Store credential ID in localStorage for future authentication
 */
export function storeCredentialId(credentialId: string, userId?: string): void {
  const key = userId
    ? `biometric_auth_cred_${userId}`
    : 'biometric_auth_cred_default';
  const existingCreds = getStoredCredentialIds(userId);
  if (!existingCreds.includes(credentialId)) {
    existingCreds.push(credentialId);
    localStorage.setItem(key, JSON.stringify(existingCreds));
  }
}

/**
 * Get stored credential IDs from localStorage
 */
export function getStoredCredentialIds(userId?: string): string[] {
  const key = userId
    ? `biometric_auth_cred_${userId}`
    : 'biometric_auth_cred_default';
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear stored credential IDs
 */
export function clearStoredCredentialIds(userId?: string): void {
  if (userId) {
    localStorage.removeItem(`biometric_auth_cred_${userId}`);
  } else {
    // Clear all credential keys
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('biometric_auth_cred_')
    );
    keys.forEach((key) => localStorage.removeItem(key));
  }
}
