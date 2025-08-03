import {
  BiometricAuthAdapter,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricError,
  BiometricErrorCode,
  BiometryType
} from '../core/types';

export class CapacitorAdapter implements BiometricAuthAdapter {
  platform = 'capacitor';
  private capacitorPlugin: unknown;

  constructor() {
    // Plugin will be loaded dynamically
  }

  private async getPlugin() {
    if (this.capacitorPlugin) {
      return this.capacitorPlugin;
    }

    try {
      // Try to get the registered Capacitor plugin
      const capacitorCore = await import('@capacitor/core');
      
      // Try using registerPlugin if available
      if (capacitorCore.registerPlugin) {
        try {
          this.capacitorPlugin = capacitorCore.registerPlugin('BiometricAuth');
          if (this.capacitorPlugin) {
            return this.capacitorPlugin;
          }
        } catch {
          // Continue to fallback
        }
      }
      
      // Legacy support for older Capacitor versions
      const legacyPlugins = (capacitorCore as unknown as { Plugins?: { BiometricAuth?: unknown } }).Plugins;
      if (legacyPlugins?.BiometricAuth) {
        this.capacitorPlugin = legacyPlugins.BiometricAuth;
        return this.capacitorPlugin;
      }

      // If not found in Plugins, try direct import
      // This allows the plugin to work even if not properly registered
      const BiometricAuthPlugin = (window as unknown as { BiometricAuthPlugin?: unknown }).BiometricAuthPlugin;
      if (BiometricAuthPlugin) {
        this.capacitorPlugin = BiometricAuthPlugin;
        return this.capacitorPlugin;
      }

      throw new Error('BiometricAuth Capacitor plugin not found');
    } catch (error) {
      throw new Error('Failed to load Capacitor plugin: ' + (error as Error).message);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const plugin = await this.getPlugin() as { isAvailable: () => Promise<{ isAvailable?: boolean }> };
      const result = await plugin.isAvailable();
      return result.isAvailable || false;
    } catch {
      return false;
    }
  }

  async getSupportedBiometrics(): Promise<BiometryType[]> {
    try {
      const plugin = await this.getPlugin() as { getSupportedBiometrics: () => Promise<{ biometryTypes?: string[] }> };
      const result = await plugin.getSupportedBiometrics();
      
      // Map Capacitor biometry types to our types
      return ((result as { biometryTypes?: string[] }).biometryTypes || []).map((type: string) => {
        switch (type.toLowerCase()) {
          case 'fingerprint':
            return BiometryType.FINGERPRINT;
          case 'faceid':
          case 'face_id':
            return BiometryType.FACE_ID;
          case 'touchid':
          case 'touch_id':
            return BiometryType.TOUCH_ID;
          case 'iris':
            return BiometryType.IRIS;
          default:
            return BiometryType.UNKNOWN;
        }
      }).filter((type: BiometryType) => type !== BiometryType.UNKNOWN);
    } catch {
      return [];
    }
  }

  async authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult> {
    try {
      const plugin = await this.getPlugin() as { authenticate: (options: unknown) => Promise<unknown> };
      
      // Map our options to Capacitor plugin options
      const capacitorOptions = {
        reason: options?.reason || 'Authenticate to continue',
        cancelTitle: options?.cancelTitle,
        fallbackTitle: options?.fallbackTitle,
        disableDeviceCredential: options?.disableDeviceCredential,
        maxAttempts: options?.maxAttempts,
        requireConfirmation: options?.requireConfirmation,
        // Include platform-specific options
        ...(options?.platform?.android || {}),
        ...(options?.platform?.ios || {})
      };

      const result = await plugin.authenticate(capacitorOptions) as { success?: boolean; biometryType?: string; error?: unknown };

      if (result.success) {
        const biometryType = this.mapBiometryType(result.biometryType);
        
        return {
          success: true,
          biometryType,
          sessionId: this.generateSessionId(),
          platform: 'capacitor'
        };
      } else {
        return {
          success: false,
          error: this.mapError(result.error)
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
      const plugin = await this.getPlugin() as { deleteCredentials: () => Promise<void> };
      await plugin.deleteCredentials();
    } catch {
      // Ignore errors when deleting credentials
    }
  }

  async hasCredentials(): Promise<boolean> {
    try {
      const plugin = await this.getPlugin() as { hasCredentials?: () => Promise<{ hasCredentials?: boolean }> };
      
      // Check if the plugin has a hasCredentials method
      if (typeof plugin.hasCredentials === 'function') {
        const result = await plugin.hasCredentials();
        return result.hasCredentials || false;
      }
      
      // Fallback: assume credentials exist if biometrics are available
      return await this.isAvailable();
    } catch {
      return false;
    }
  }

  private mapBiometryType(type?: string): BiometryType {
    if (!type) {
      return BiometryType.UNKNOWN;
    }

    switch (type.toLowerCase()) {
      case 'fingerprint':
        return BiometryType.FINGERPRINT;
      case 'faceid':
      case 'face_id':
        return BiometryType.FACE_ID;
      case 'touchid':
      case 'touch_id':
        return BiometryType.TOUCH_ID;
      case 'iris':
        return BiometryType.IRIS;
      default:
        return BiometryType.UNKNOWN;
    }
  }

  private mapError(error: unknown): BiometricError {
    let code = BiometricErrorCode.UNKNOWN_ERROR;
    let message = 'An unknown error occurred';

    const errorObj = error as { code?: string; message?: string };
    if (errorObj?.code) {
      switch (errorObj.code) {
        case 'BIOMETRIC_UNAVAILABLE':
        case 'UNAVAILABLE':
          code = BiometricErrorCode.BIOMETRIC_UNAVAILABLE;
          message = errorObj.message || 'Biometric authentication is not available';
          break;
        case 'USER_CANCELLED':
        case 'CANCELLED':
        case 'USER_CANCEL':
          code = BiometricErrorCode.USER_CANCELLED;
          message = errorObj.message || 'User cancelled authentication';
          break;
        case 'AUTHENTICATION_FAILED':
        case 'FAILED':
          code = BiometricErrorCode.AUTHENTICATION_FAILED;
          message = errorObj.message || 'Authentication failed';
          break;
        case 'TIMEOUT':
          code = BiometricErrorCode.TIMEOUT;
          message = errorObj.message || 'Authentication timed out';
          break;
        case 'LOCKOUT':
          code = BiometricErrorCode.LOCKOUT;
          message = errorObj.message || 'Too many failed attempts';
          break;
        case 'NOT_ENROLLED':
          code = BiometricErrorCode.NOT_ENROLLED;
          message = errorObj.message || 'No biometric credentials enrolled';
          break;
        default:
          message = errorObj.message || message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
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