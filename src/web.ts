import { WebPlugin } from '@capacitor/core';
import {
  BiometricAuthPlugin,
  BiometricAvailabilityResult,
  SupportedBiometricsResult,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricAuthConfig,
  BiometricType,
  BiometricUnavailableReason,
  BiometricErrorCode,
} from './definitions';

export class BiometricAuthWeb extends WebPlugin implements BiometricAuthPlugin {
  private config: BiometricAuthConfig = {
    sessionDuration: 3600, // 1 hour default
    requireAuthenticationForEveryAccess: false,
    fallbackMethods: [],
  };

  private sessions: Map<string, { token: string; expiresAt: number }> =
    new Map();

  async isAvailable(): Promise<BiometricAvailabilityResult> {
    // Check if Web Authentication API is available
    if (!window.PublicKeyCredential) {
      return {
        available: false,
        reason: BiometricUnavailableReason.NOT_SUPPORTED,
        errorMessage: 'Web Authentication API is not supported in this browser',
      };
    }

    try {
      // Check if platform authenticator is available
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!available) {
        return {
          available: false,
          reason: BiometricUnavailableReason.NO_HARDWARE,
          errorMessage: 'No platform authenticator available',
        };
      }

      return {
        available: true,
      };
    } catch (error) {
      return {
        available: false,
        reason: BiometricUnavailableReason.HARDWARE_UNAVAILABLE,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSupportedBiometrics(): Promise<SupportedBiometricsResult> {
    const result = await this.isAvailable();

    if (!result.available) {
      return {
        biometrics: [],
      };
    }

    // Web Authentication API doesn't specify biometric types
    // Return generic biometric authentication as supported
    return {
      biometrics: [
        BiometricType.FINGERPRINT,
        BiometricType.FACE_AUTHENTICATION,
      ],
    };
  }

  async authenticate(
    options?: BiometricAuthOptions
  ): Promise<BiometricAuthResult> {
    try {
      const availability = await this.isAvailable();
      if (!availability.available) {
        return {
          success: false,
          error: {
            code: BiometricErrorCode.NOT_AVAILABLE,
            message:
              availability.errorMessage ||
              'Biometric authentication not available',
          },
        };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential request options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
        {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        };

      // If user has saved credentials, use them
      if (options?.saveCredentials) {
        // In a real implementation, we would retrieve saved credential IDs
        // For now, we'll use WebAuthn's discoverable credentials feature
        publicKeyCredentialRequestOptions.allowCredentials = [];
      }

      // Create the credential
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: options?.title || 'Biometric Authentication',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(crypto.randomUUID()),
            name: 'user@' + window.location.hostname,
            displayName: 'User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential;

      if (credential) {
        // Generate session token
        const sessionId = crypto.randomUUID();
        const token = btoa(
          JSON.stringify({
            credentialId: credential.id,
            timestamp: Date.now(),
            sessionId,
          })
        );

        // Store session
        const expiresAt =
          Date.now() + (this.config.sessionDuration || 3600) * 1000;
        this.sessions.set(sessionId, { token, expiresAt });

        // Clean up expired sessions
        this.cleanupExpiredSessions();

        return {
          success: true,
          token,
          sessionId,
        };
      }

      return {
        success: false,
        error: {
          code: BiometricErrorCode.AUTHENTICATION_FAILED,
          message: 'Failed to create credential',
        },
      };
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return {
            success: false,
            error: {
              code: BiometricErrorCode.USER_CANCELLED,
              message: 'User cancelled the authentication',
            },
          };
        } else if (error.name === 'NotSupportedError') {
          return {
            success: false,
            error: {
              code: BiometricErrorCode.NOT_AVAILABLE,
              message: 'Biometric authentication not supported',
            },
          };
        } else if (error.name === 'InvalidStateError') {
          return {
            success: false,
            error: {
              code: BiometricErrorCode.INVALID_CONTEXT,
              message: 'Invalid authentication context',
            },
          };
        }
      }

      return {
        success: false,
        error: {
          code: BiometricErrorCode.UNKNOWN,
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  async deleteCredentials(): Promise<void> {
    // Clear all sessions
    this.sessions.clear();

    // In a real implementation, we would also:
    // 1. Clear stored credential IDs from local storage
    // 2. Potentially revoke credentials on the server
    // 3. Clear any cached authentication data

    // For WebAuthn, credentials are managed by the browser/OS
    // We can't directly delete them, but we can clear our references
    try {
      // Clear any stored credential data from localStorage
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith('biometric_auth_')
      );
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear stored credentials:', error);
    }
  }

  async configure(config: BiometricAuthConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    // Validate configuration
    if (config.sessionDuration && config.sessionDuration < 0) {
      throw new Error('Session duration must be positive');
    }

    if (config.encryptionSecret && config.encryptionSecret.length < 32) {
      console.warn(
        'Encryption secret should be at least 32 characters for security'
      );
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, id) => {
      if (session.expiresAt < now) {
        expiredSessions.push(id);
      }
    });

    expiredSessions.forEach((id) => this.sessions.delete(id));
  }
}
