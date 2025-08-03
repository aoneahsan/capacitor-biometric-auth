import {
  BiometricAuthAdapter,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricError,
  BiometricErrorCode,
  BiometryType
} from '../core/types';

export class ReactNativeAdapter implements BiometricAuthAdapter {
  platform = 'react-native';
  private biometrics: any;

  constructor() {
    // Biometrics module will be loaded dynamically
  }

  private async getBiometrics() {
    if (this.biometrics) {
      return this.biometrics;
    }

    try {
      // Dynamic import for React Native biometrics
      const ReactNativeBiometrics = require('react-native-biometrics').default;
      this.biometrics = new ReactNativeBiometrics();
      return this.biometrics;
    } catch (error) {
      throw new Error(
        'React Native Biometrics not installed. Please run: npm install react-native-biometrics'
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const biometrics = await this.getBiometrics();
      const { available } = await biometrics.isSensorAvailable();
      return available;
    } catch (error) {
      return false;
    }
  }

  async getSupportedBiometrics(): Promise<BiometryType[]> {
    try {
      const biometrics = await this.getBiometrics();
      const { available, biometryType } = await biometrics.isSensorAvailable();
      
      if (!available) {
        return [];
      }

      // Map React Native biometry types to our types
      switch (biometryType) {
        case 'TouchID':
          return [BiometryType.TOUCH_ID];
        case 'FaceID':
          return [BiometryType.FACE_ID];
        case 'Biometrics':
        case 'Fingerprint':
          return [BiometryType.FINGERPRINT];
        default:
          return [BiometryType.UNKNOWN];
      }
    } catch (error) {
      return [];
    }
  }

  async authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult> {
    try {
      const biometrics = await this.getBiometrics();
      
      // Check if biometrics are available
      const { available, biometryType, error } = await biometrics.isSensorAvailable();
      
      if (!available) {
        return {
          success: false,
          error: {
            code: BiometricErrorCode.BIOMETRIC_UNAVAILABLE,
            message: error || 'Biometric authentication is not available'
          }
        };
      }

      // Create signature for authentication
      const { success, signature, error: authError } = await biometrics.createSignature({
        promptMessage: options?.reason || 'Authenticate',
        cancelButtonText: options?.cancelTitle || 'Cancel',
        payload: 'biometric-auth-payload'
      });

      if (success && signature) {
        return {
          success: true,
          biometryType: this.mapBiometryType(biometryType),
          sessionId: this.generateSessionId(),
          platform: 'react-native'
        };
      } else {
        return {
          success: false,
          error: this.mapError(authError)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: this.mapError(error)
      };
    }
  }

  async deleteCredentials(): Promise<void> {
    try {
      const biometrics = await this.getBiometrics();
      await biometrics.deleteKeys();
    } catch (error) {
      // Ignore errors when deleting credentials
    }
  }

  async hasCredentials(): Promise<boolean> {
    try {
      const biometrics = await this.getBiometrics();
      const { keysExist } = await biometrics.biometricKeysExist();
      return keysExist;
    } catch (error) {
      return false;
    }
  }

  private mapBiometryType(type?: string): BiometryType {
    if (!type) {
      return BiometryType.UNKNOWN;
    }

    switch (type) {
      case 'TouchID':
        return BiometryType.TOUCH_ID;
      case 'FaceID':
        return BiometryType.FACE_ID;
      case 'Biometrics':
      case 'Fingerprint':
        return BiometryType.FINGERPRINT;
      default:
        return BiometryType.UNKNOWN;
    }
  }

  private mapError(error: any): BiometricError {
    let code = BiometricErrorCode.UNKNOWN_ERROR;
    let message = 'An unknown error occurred';

    if (typeof error === 'string') {
      message = error;
      
      // Map common error messages to error codes
      if (error.includes('cancelled') || error.includes('canceled')) {
        code = BiometricErrorCode.USER_CANCELLED;
      } else if (error.includes('failed') || error.includes('not recognized')) {
        code = BiometricErrorCode.AUTHENTICATION_FAILED;
      } else if (error.includes('locked')) {
        code = BiometricErrorCode.LOCKOUT;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      code,
      message,
      details: error
    };
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}