import {
  BiometricAuthAdapter,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricError,
  BiometricErrorCode,
  BiometryType
} from '../core/types';

export class ElectronAdapter implements BiometricAuthAdapter {
  platform = 'electron';
  
  constructor() {
    // Electron-specific initialization
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in Electron main or renderer process
      if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
        // In Electron, we can use TouchID on macOS
        if (process.platform === 'darwin') {
          const { systemPreferences } = require('electron').remote || require('electron');
          return systemPreferences.canPromptTouchID();
        }
        // Windows Hello support could be added here
        return false;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async getSupportedBiometrics(): Promise<BiometryType[]> {
    if (!(await this.isAvailable())) {
      return [];
    }

    // On macOS, we support Touch ID
    if (process.platform === 'darwin') {
      return [BiometryType.TOUCH_ID];
    }

    return [];
  }

  async authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult> {
    try {
      if (!(await this.isAvailable())) {
        return {
          success: false,
          error: {
            code: BiometricErrorCode.BIOMETRIC_UNAVAILABLE,
            message: 'Biometric authentication is not available'
          }
        };
      }

      if (process.platform === 'darwin') {
        const { systemPreferences } = require('electron').remote || require('electron');
        
        try {
          await systemPreferences.promptTouchID(
            options?.reason || 'authenticate with Touch ID'
          );
          
          return {
            success: true,
            biometryType: BiometryType.TOUCH_ID,
            sessionId: this.generateSessionId(),
            platform: 'electron'
          };
        } catch (error) {
          return {
            success: false,
            error: {
              code: BiometricErrorCode.AUTHENTICATION_FAILED,
              message: 'Touch ID authentication failed'
            }
          };
        }
      }

      return {
        success: false,
        error: {
          code: BiometricErrorCode.PLATFORM_NOT_SUPPORTED,
          message: 'Platform not supported'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapError(error)
      };
    }
  }

  async deleteCredentials(): Promise<void> {
    // Electron doesn't store biometric credentials
    // This is a no-op
  }

  async hasCredentials(): Promise<boolean> {
    // In Electron, we don't store credentials
    // Return true if biometrics are available
    return await this.isAvailable();
  }

  private mapError(error: any): BiometricError {
    let code = BiometricErrorCode.UNKNOWN_ERROR;
    let message = 'An unknown error occurred';

    if (error instanceof Error) {
      message = error.message;
      
      if (message.includes('cancelled') || message.includes('canceled')) {
        code = BiometricErrorCode.USER_CANCELLED;
      } else if (message.includes('failed')) {
        code = BiometricErrorCode.AUTHENTICATION_FAILED;
      }
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