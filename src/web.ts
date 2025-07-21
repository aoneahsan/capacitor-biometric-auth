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
import {
  mergeCreateOptions,
  mergeGetOptions,
  arrayBufferToBase64,
  storeCredentialId,
  getStoredCredentialIds,
  clearStoredCredentialIds,
} from './utils/webauthn';

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
      // Check availability first
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

      // If WebAuthn options are provided, use them directly
      if (options?.webAuthnOptions?.get) {
        return this.authenticateWithWebAuthnOptions(options);
      }

      // Get stored credentials for the user
      const userId =
        options?.webAuthnOptions?.get?.rpId ||
        options?.webAuthnOptions?.create?.user?.name;
      const storedCredentialIds = getStoredCredentialIds(userId);

      // If no stored credentials and user wants to save credentials, register instead
      if (storedCredentialIds.length === 0 && options?.saveCredentials) {
        return this.register(options);
      }

      // If we have stored credentials, try to authenticate with them
      if (storedCredentialIds.length > 0) {
        return this.authenticateWithCredentials(options);
      }

      // No credentials found, register new ones
      return this.register(options);
    } catch (error) {
      return this.handleWebAuthnError(error);
    }
  }

  private async authenticateWithWebAuthnOptions(
    options: BiometricAuthOptions
  ): Promise<BiometricAuthResult> {
    try {
      // Use the provided WebAuthn options directly
      const getOptions = mergeGetOptions(options.webAuthnOptions?.get);

      // Get the credential
      const credential = (await navigator.credentials.get({
        publicKey: getOptions,
      })) as PublicKeyCredential;

      if (
        credential &&
        credential.response instanceof AuthenticatorAssertionResponse
      ) {
        // Generate session token and include credential data
        const sessionId = crypto.randomUUID();
        const credentialId = arrayBufferToBase64(credential.rawId);

        // Create enhanced token with credential data for backend verification
        const credentialData = {
          id: credential.id,
          rawId: arrayBufferToBase64(credential.rawId),
          response: {
            authenticatorData: arrayBufferToBase64(
              credential.response.authenticatorData
            ),
            clientDataJSON: arrayBufferToBase64(
              credential.response.clientDataJSON
            ),
            signature: arrayBufferToBase64(credential.response.signature),
            userHandle: credential.response.userHandle
              ? arrayBufferToBase64(credential.response.userHandle)
              : undefined,
          },
          type: credential.type,
          clientExtensionResults: JSON.stringify(
            credential.getClientExtensionResults?.() || {}
          ),
          authenticatorAttachment: (credential as any).authenticatorAttachment,
        };

        const token = btoa(
          JSON.stringify({
            credentialId,
            timestamp: Date.now(),
            sessionId,
            type: 'authentication',
            credentialData, // Include full credential data
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
          message: 'Failed to authenticate with credential',
        },
      };
    } catch (error) {
      return this.handleWebAuthnError(error);
    }
  }

  private async authenticateWithCredentials(
    options?: BiometricAuthOptions
  ): Promise<BiometricAuthResult> {
    try {
      // Get stored credential IDs
      const userId =
        options?.webAuthnOptions?.get?.rpId ||
        options?.webAuthnOptions?.create?.user?.name;
      const storedCredentialIds = getStoredCredentialIds(userId);

      // Prepare allowed credentials
      const allowCredentials = storedCredentialIds.map((id) => ({
        id: Uint8Array.from(atob(id), (c) => c.charCodeAt(0)),
        type: 'public-key' as PublicKeyCredentialType,
        transports: ['internal'] as AuthenticatorTransport[],
      }));

      // Merge user options with defaults
      const getOptions = mergeGetOptions(options?.webAuthnOptions?.get, {
        rpId: window.location.hostname,
        userVerification: 'required',
        allowCredentials:
          allowCredentials.length > 0 ? allowCredentials : undefined,
      });

      // Get the credential
      const credential = (await navigator.credentials.get({
        publicKey: getOptions,
      })) as PublicKeyCredential;

      if (
        credential &&
        credential.response instanceof AuthenticatorAssertionResponse
      ) {
        // Generate session token
        const sessionId = crypto.randomUUID();
        const credentialId = arrayBufferToBase64(credential.rawId);
        const token = btoa(
          JSON.stringify({
            credentialId,
            timestamp: Date.now(),
            sessionId,
            type: 'authentication',
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
          message: 'Failed to authenticate with credential',
        },
      };
    } catch (error) {
      return this.handleWebAuthnError(error);
    }
  }

  async register(options?: BiometricAuthOptions): Promise<BiometricAuthResult> {
    try {
      // Check availability first
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

      // If WebAuthn options are provided, use them directly
      if (options?.webAuthnOptions?.create) {
        return this.registerWithWebAuthnOptions(options);
      }

      // Merge user options with defaults for fallback
      const createOptions = mergeCreateOptions(
        options?.webAuthnOptions?.create,
        {
          rp: {
            name: options?.title || 'Biometric Authentication',
          },
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
        }
      );

      // Create the credential
      const credential = (await navigator.credentials.create({
        publicKey: createOptions,
      })) as PublicKeyCredential;

      if (
        credential &&
        credential.response instanceof AuthenticatorAttestationResponse
      ) {
        // Store credential ID for future authentication
        const credentialId = arrayBufferToBase64(credential.rawId);
        const userId = options?.webAuthnOptions?.create?.user?.name;
        storeCredentialId(credentialId, userId);

        // Generate session token
        const sessionId = crypto.randomUUID();
        const token = btoa(
          JSON.stringify({
            credentialId,
            timestamp: Date.now(),
            sessionId,
            type: 'registration',
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
      return this.handleWebAuthnError(error);
    }
  }

  private async registerWithWebAuthnOptions(
    options: BiometricAuthOptions
  ): Promise<BiometricAuthResult> {
    try {
      // Use the provided WebAuthn options directly
      const createOptions = mergeCreateOptions(options.webAuthnOptions?.create);

      // Create the credential
      const credential = (await navigator.credentials.create({
        publicKey: createOptions,
      })) as PublicKeyCredential;

      if (
        credential &&
        credential.response instanceof AuthenticatorAttestationResponse
      ) {
        // Store credential ID for future authentication
        const credentialId = arrayBufferToBase64(credential.rawId);
        const userId = options?.webAuthnOptions?.create?.user?.name;
        storeCredentialId(credentialId, userId);

        // Create enhanced token with credential data for backend verification
        const credentialData = {
          id: credential.id,
          rawId: arrayBufferToBase64(credential.rawId),
          response: {
            attestationObject: arrayBufferToBase64(
              credential.response.attestationObject
            ),
            clientDataJSON: arrayBufferToBase64(
              credential.response.clientDataJSON
            ),
            transports: credential.response.getTransports?.() || [],
          },
          type: credential.type,
          clientExtensionResults: JSON.stringify(
            credential.getClientExtensionResults?.() || {}
          ),
          authenticatorAttachment: (credential as any).authenticatorAttachment,
        };

        // Generate session token
        const sessionId = crypto.randomUUID();
        const token = btoa(
          JSON.stringify({
            credentialId,
            timestamp: Date.now(),
            sessionId,
            type: 'registration',
            credentialData, // Include full credential data
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
      return this.handleWebAuthnError(error);
    }
  }

  async deleteCredentials(): Promise<void> {
    // Clear all sessions
    this.sessions.clear();

    // Clear stored credential IDs
    clearStoredCredentialIds();

    // Clear any other stored data
    try {
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

  private handleWebAuthnError(error: unknown): BiometricAuthResult {
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
      } else if (error.name === 'SecurityError') {
        return {
          success: false,
          error: {
            code: BiometricErrorCode.INVALID_CONTEXT,
            message: 'Security requirements not met',
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
