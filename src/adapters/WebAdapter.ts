import {
  BiometricAuthAdapter,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricErrorCode,
  BiometryType,
  WebAuthOptions
} from '../core/types';

export class WebAdapter implements BiometricAuthAdapter {
  platform = 'web';
  private credentials = new Map<string, PublicKeyCredential>();
  private rpId: string;
  private rpName: string;

  constructor() {
    // Set default Relying Party info
    this.rpId = window.location.hostname;
    this.rpName = document.title || 'Biometric Authentication';
  }

  async isAvailable(): Promise<boolean> {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      return false;
    }

    // Check if platform authenticator is available
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  async getSupportedBiometrics(): Promise<BiometryType[]> {
    if (!(await this.isAvailable())) {
      return [];
    }

    // WebAuthn doesn't provide specific biometry types
    // Return generic "multiple" as modern devices support various methods
    return [BiometryType.MULTIPLE];
  }

  async authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult> {
    try {
      // Check if WebAuthn is available
      if (!(await this.isAvailable())) {
        return {
          success: false,
          error: {
            code: BiometricErrorCode.BIOMETRIC_UNAVAILABLE,
            message: 'WebAuthn is not available on this device'
          }
        };
      }

      const webOptions = options?.platform?.web || {};
      
      // Try to get existing credential first
      const existingCredential = await this.getExistingCredential(webOptions);
      if (existingCredential) {
        return {
          success: true,
          biometryType: BiometryType.MULTIPLE,
          sessionId: this.generateSessionId(),
          platform: 'web'
        };
      }

      // If no existing credential, create a new one
      const credential = await this.createCredential(options?.reason || 'Authentication required', webOptions);
      
      if (credential) {
        // Store credential for future use
        const credentialId = this.arrayBufferToBase64(credential.rawId);
        this.credentials.set(credentialId, credential);
        this.saveCredentialId(credentialId);

        return {
          success: true,
          biometryType: BiometryType.MULTIPLE,
          sessionId: this.generateSessionId(),
          platform: 'web'
        };
      }

      return {
        success: false,
        error: {
          code: BiometricErrorCode.AUTHENTICATION_FAILED,
          message: 'Failed to authenticate'
        }
      };

    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteCredentials(): Promise<void> {
    this.credentials.clear();
    localStorage.removeItem('biometric_credential_ids');
  }

  async hasCredentials(): Promise<boolean> {
    const storedIds = this.getStoredCredentialIds();
    return storedIds.length > 0;
  }

  private async getExistingCredential(options: WebAuthOptions): Promise<PublicKeyCredential | null> {
    const storedIds = this.getStoredCredentialIds();
    if (storedIds.length === 0) {
      return null;
    }

    try {
      const challenge = options.challenge || crypto.getRandomValues(new Uint8Array(32));
      
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: options.rpId || this.rpId,
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'preferred',
        allowCredentials: storedIds.map(id => ({
          id: this.base64ToArrayBuffer(id),
          type: 'public-key'
        }))
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      return credential;
    } catch {
      return null;
    }
  }

  private async createCredential(_reason: string, options: WebAuthOptions): Promise<PublicKeyCredential | null> {
    try {
      const challenge = options.challenge || crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(32));

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          id: options.rpId || this.rpId,
          name: options.rpName || this.rpName
        },
        user: {
          id: userId,
          name: 'user@' + this.rpId,
          displayName: 'User'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: options.authenticatorSelection || {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          requireResidentKey: false,
          residentKey: 'discouraged'
        },
        timeout: options.timeout || 60000,
        attestation: options.attestation || 'none'
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      return credential;
    } catch {
      return null;
    }
  }

  private handleError(error: unknown): BiometricAuthResult {
    let code = BiometricErrorCode.UNKNOWN_ERROR;
    let message = 'An unknown error occurred';

    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          code = BiometricErrorCode.USER_CANCELLED;
          message = 'User cancelled the authentication';
          break;
        case 'AbortError':
          code = BiometricErrorCode.USER_CANCELLED;
          message = 'Authentication was aborted';
          break;
        case 'SecurityError':
          code = BiometricErrorCode.AUTHENTICATION_FAILED;
          message = 'Security error during authentication';
          break;
        case 'InvalidStateError':
          code = BiometricErrorCode.AUTHENTICATION_FAILED;
          message = 'Invalid state for authentication';
          break;
        case 'NotSupportedError':
          code = BiometricErrorCode.BIOMETRIC_UNAVAILABLE;
          message = 'WebAuthn is not supported';
          break;
        default:
          message = error.message || message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      success: false,
      error: {
        code,
        message,
        details: error
      }
    };
  }

  private generateSessionId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private getStoredCredentialIds(): string[] {
    const stored = localStorage.getItem('biometric_credential_ids');
    if (!stored) {
      return [];
    }
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private saveCredentialId(id: string) {
    const existing = this.getStoredCredentialIds();
    if (!existing.includes(id)) {
      existing.push(id);
      localStorage.setItem('biometric_credential_ids', JSON.stringify(existing));
    }
  }
}