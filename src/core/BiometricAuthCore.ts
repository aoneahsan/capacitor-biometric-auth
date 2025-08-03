import {
  BiometricAuthAdapter,
  BiometricAuthConfiguration,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricAuthState,
  BiometricErrorCode,
  BiometryType
} from './types';
import { PlatformDetector } from './platform-detector';

export class BiometricAuthCore {
  private static instance: BiometricAuthCore;
  private config: BiometricAuthConfiguration = {
    adapter: 'auto',
    debug: false,
    sessionDuration: 300000, // 5 minutes
  };
  private adapters = new Map<string, BiometricAuthAdapter>();
  private currentAdapter: BiometricAuthAdapter | null = null;
  private state: BiometricAuthState = {
    isAuthenticated: false
  };
  private platformDetector = PlatformDetector.getInstance();
  private subscribers = new Set<(state: BiometricAuthState) => void>();

  private constructor() {
    this.initialize();
  }

  static getInstance(): BiometricAuthCore {
    if (!BiometricAuthCore.instance) {
      BiometricAuthCore.instance = new BiometricAuthCore();
    }
    return BiometricAuthCore.instance;
  }

  private async initialize() {
    // Detect platform and load appropriate adapter
    const platformInfo = this.platformDetector.detect();
    
    if (this.config.debug) {
      console.log('[BiometricAuth] Platform detected:', platformInfo);
    }

    // Load adapter based on platform
    await this.loadAdapter(platformInfo.name);
  }

  private async loadAdapter(platform: string) {
    try {
      // Try custom adapters first
      if (this.config.customAdapters?.[platform]) {
        this.currentAdapter = this.config.customAdapters[platform];
        return;
      }

      // Try to load from registered adapters
      if (this.adapters.has(platform)) {
        this.currentAdapter = this.adapters.get(platform)!;
        return;
      }

      // Dynamic import based on platform
      switch (platform) {
        case 'web':
          const { WebAdapter } = await import('../adapters/WebAdapter');
          this.currentAdapter = new WebAdapter();
          break;

        case 'ios':
        case 'android':
          // Check if Capacitor is available
          if (this.platformDetector.detect().isCapacitor) {
            const { CapacitorAdapter } = await import('../adapters/CapacitorAdapter');
            this.currentAdapter = new CapacitorAdapter();
          } else if (this.platformDetector.detect().isReactNative) {
            // Dynamic import for React Native
            try {
              const { ReactNativeAdapter } = await import('../adapters/ReactNativeAdapter');
              this.currentAdapter = new ReactNativeAdapter();
            } catch (e) {
              throw new Error('React Native biometric module not installed. Please install react-native-biometrics');
            }
          }
          break;

        case 'electron':
          const { ElectronAdapter } = await import('../adapters/ElectronAdapter');
          this.currentAdapter = new ElectronAdapter();
          break;

        default:
          throw new Error(`Platform ${platform} not supported`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[BiometricAuth] Failed to load adapter:', error);
      }
      
      // Fallback to web adapter if available
      if (platform !== 'web' && this.platformDetector.detect().isWeb) {
        const { WebAdapter } = await import('../adapters/WebAdapter');
        this.currentAdapter = new WebAdapter();
      }
    }
  }

  configure(config: Partial<BiometricAuthConfiguration>) {
    this.config = { ...this.config, ...config };
    
    // Re-initialize if adapter changed
    if (config.adapter && config.adapter !== 'auto') {
      this.loadAdapter(config.adapter);
    }
  }

  registerAdapter(name: string, adapter: BiometricAuthAdapter) {
    this.adapters.set(name, adapter);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.currentAdapter) {
      return false;
    }
    
    try {
      return await this.currentAdapter.isAvailable();
    } catch (error) {
      if (this.config.debug) {
        console.error('[BiometricAuth] isAvailable error:', error);
      }
      return false;
    }
  }

  async getSupportedBiometrics(): Promise<BiometryType[]> {
    if (!this.currentAdapter) {
      return [];
    }
    
    try {
      return await this.currentAdapter.getSupportedBiometrics();
    } catch (error) {
      if (this.config.debug) {
        console.error('[BiometricAuth] getSupportedBiometrics error:', error);
      }
      return [];
    }
  }

  async authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult> {
    if (!this.currentAdapter) {
      return {
        success: false,
        error: {
          code: BiometricErrorCode.PLATFORM_NOT_SUPPORTED,
          message: 'No biometric adapter available for this platform'
        }
      };
    }

    try {
      const result = await this.currentAdapter.authenticate(options);
      
      if (result.success) {
        this.updateState({
          isAuthenticated: true,
          sessionId: result.sessionId,
          lastAuthTime: Date.now(),
          biometryType: result.biometryType,
          error: undefined
        });

        // Set up session timeout
        if (this.config.sessionDuration && this.config.sessionDuration > 0) {
          setTimeout(() => {
            this.logout();
          }, this.config.sessionDuration);
        }
      } else {
        this.updateState({
          isAuthenticated: false,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      const errorResult: BiometricAuthResult = {
        success: false,
        error: {
          code: BiometricErrorCode.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        }
      };

      this.updateState({
        isAuthenticated: false,
        error: errorResult.error
      });

      return errorResult;
    }
  }

  async deleteCredentials(): Promise<void> {
    if (!this.currentAdapter) {
      throw new Error('No biometric adapter available');
    }

    await this.currentAdapter.deleteCredentials();
    this.logout();
  }

  async hasCredentials(): Promise<boolean> {
    if (!this.currentAdapter) {
      return false;
    }

    try {
      return await this.currentAdapter.hasCredentials();
    } catch (error) {
      if (this.config.debug) {
        console.error('[BiometricAuth] hasCredentials error:', error);
      }
      return false;
    }
  }

  logout() {
    this.updateState({
      isAuthenticated: false,
      sessionId: undefined,
      lastAuthTime: undefined,
      biometryType: undefined,
      error: undefined
    });
  }

  getState(): BiometricAuthState {
    return { ...this.state };
  }

  isAuthenticated(): boolean {
    if (!this.state.isAuthenticated || !this.state.lastAuthTime) {
      return false;
    }

    // Check if session is still valid
    if (this.config.sessionDuration && this.config.sessionDuration > 0) {
      const elapsed = Date.now() - this.state.lastAuthTime;
      if (this.config.sessionDuration && elapsed > this.config.sessionDuration) {
        this.logout();
        return false;
      }
    }

    return true;
  }

  subscribe(callback: (state: BiometricAuthState) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private updateState(newState: Partial<BiometricAuthState>) {
    this.state = { ...this.state, ...newState };
    
    // Notify subscribers
    this.subscribers.forEach(callback => {
      callback(this.getState());
    });
  }

  // Utility methods for common use cases
  async requireAuthentication(callback: () => void | Promise<void>, options?: BiometricAuthOptions) {
    if (!this.isAuthenticated()) {
      const result = await this.authenticate(options);
      if (!result.success) {
        throw new Error(result.error?.message || 'Authentication failed');
      }
    }
    
    return callback();
  }

  async withAuthentication<T>(callback: () => T | Promise<T>, options?: BiometricAuthOptions): Promise<T> {
    if (!this.isAuthenticated()) {
      const result = await this.authenticate(options);
      if (!result.success) {
        throw new Error(result.error?.message || 'Authentication failed');
      }
    }
    
    return callback();
  }
}