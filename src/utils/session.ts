import { Capacitor } from '@capacitor/core';

export interface SessionData {
  token: string;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'biometric_auth_session';
  private static readonly ENCRYPTION_KEY = 'biometric_auth_encryption';

  /**
   * Generate a cryptographically secure random token
   */
  static generateSecureToken(): string {
    if (Capacitor.isNativePlatform()) {
      // On native platforms, this is handled by the native implementation
      return '';
    }

    // For web, use crypto API
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  /**
   * Store session data securely
   */
  static async storeSession(session: SessionData): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Native platforms handle this internally
      return;
    }

    // For web, use sessionStorage with encryption
    const encryptedData = await this.encrypt(JSON.stringify(session));
    sessionStorage.setItem(this.SESSION_KEY, encryptedData);
  }

  /**
   * Retrieve session data
   */
  static async getSession(): Promise<SessionData | null> {
    if (Capacitor.isNativePlatform()) {
      // Native platforms handle this internally
      return null;
    }

    const encryptedData = sessionStorage.getItem(this.SESSION_KEY);
    if (!encryptedData) {
      return null;
    }

    try {
      const decryptedData = await this.decrypt(encryptedData);
      const session = JSON.parse(decryptedData) as SessionData;

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to decrypt session:', error);
      await this.clearSession();
      return null;
    }
  }

  /**
   * Clear session data
   */
  static async clearSession(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Native platforms handle this internally
      return;
    }

    sessionStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Check if session is valid
   */
  static async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null && session.expiresAt > Date.now();
  }

  /**
   * Extend session expiration
   */
  static async extendSession(durationMs: number): Promise<boolean> {
    const session = await this.getSession();
    if (!session) {
      return false;
    }

    session.expiresAt = Date.now() + durationMs;
    await this.storeSession(session);
    return true;
  }

  /**
   * Simple encryption using Web Crypto API (for demonstration)
   * In production, use a proper encryption library or service
   */
  private static async encrypt(data: string): Promise<string> {
    if (!crypto.subtle) {
      // Fallback to base64 if crypto.subtle is not available
      return btoa(data);
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate encryption key from string
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.ENCRYPTION_KEY),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('biometric-auth-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      // Fallback to base64
      return btoa(data);
    }
  }

  /**
   * Simple decryption using Web Crypto API
   */
  private static async decrypt(encryptedData: string): Promise<string> {
    if (!crypto.subtle) {
      // Fallback from base64 if crypto.subtle is not available
      return atob(encryptedData);
    }

    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), (c) =>
        c.charCodeAt(0)
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Generate decryption key
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.ENCRYPTION_KEY),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('biometric-auth-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Decrypt
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      // Try fallback from base64
      return atob(encryptedData);
    }
  }
}

/**
 * Credential storage utilities
 */
export class CredentialManager {
  private static readonly CREDENTIAL_PREFIX = 'biometric_credential_';

  /**
   * Store credential securely
   */
  static async storeCredential(
    credentialId: string,
    credentialData: unknown,
    encrypt: boolean = true
  ): Promise<void> {
    const key = `${this.CREDENTIAL_PREFIX}${credentialId}`;
    const dataStr = JSON.stringify(credentialData);

    if (encrypt && crypto.subtle) {
      const encryptedData = await SessionManager['encrypt'](dataStr);
      localStorage.setItem(key, encryptedData);
    } else {
      localStorage.setItem(key, dataStr);
    }
  }

  /**
   * Retrieve credential
   */
  static async getCredential(
    credentialId: string,
    decrypt: boolean = true
  ): Promise<unknown | null> {
    const key = `${this.CREDENTIAL_PREFIX}${credentialId}`;
    const storedData = localStorage.getItem(key);

    if (!storedData) {
      return null;
    }

    try {
      if (decrypt && crypto.subtle) {
        const decryptedData = await SessionManager['decrypt'](storedData);
        return JSON.parse(decryptedData);
      } else {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error('Failed to retrieve credential:', error);
      return null;
    }
  }

  /**
   * Delete credential
   */
  static deleteCredential(credentialId: string): void {
    const key = `${this.CREDENTIAL_PREFIX}${credentialId}`;
    localStorage.removeItem(key);
  }

  /**
   * List all credential IDs
   */
  static listCredentialIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.CREDENTIAL_PREFIX)) {
        ids.push(key.substring(this.CREDENTIAL_PREFIX.length));
      }
    }
    return ids;
  }

  /**
   * Clear all credentials
   */
  static clearAllCredentials(): void {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.CREDENTIAL_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }
}
