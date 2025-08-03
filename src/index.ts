import { BiometricAuthCore } from './core/BiometricAuthCore';
import type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricAuthConfiguration,
  BiometricAuthAdapter,
  BiometricAuthState,
  BiometryType,
  BiometricError
} from './core/types';

// Create singleton instance
const biometricAuth = BiometricAuthCore.getInstance();

// Export the main API (provider-less, like Zustand)
const BiometricAuth = {
  // Core methods
  configure: (config: Partial<BiometricAuthConfiguration>) => biometricAuth.configure(config),
  isAvailable: () => biometricAuth.isAvailable(),
  getSupportedBiometrics: () => biometricAuth.getSupportedBiometrics(),
  authenticate: (options?: BiometricAuthOptions) => biometricAuth.authenticate(options),
  deleteCredentials: () => biometricAuth.deleteCredentials(),
  hasCredentials: () => biometricAuth.hasCredentials(),
  
  // State management
  logout: () => biometricAuth.logout(),
  getState: () => biometricAuth.getState(),
  isAuthenticated: () => biometricAuth.isAuthenticated(),
  subscribe: (callback: (state: BiometricAuthState) => void) => biometricAuth.subscribe(callback),
  
  // Utility methods
  requireAuthentication: (callback: () => void | Promise<void>, options?: BiometricAuthOptions) => 
    biometricAuth.requireAuthentication(callback, options),
  withAuthentication: <T>(callback: () => T | Promise<T>, options?: BiometricAuthOptions) => 
    biometricAuth.withAuthentication(callback, options),
  
  // Advanced usage
  registerAdapter: (name: string, adapter: BiometricAuthAdapter) => 
    biometricAuth.registerAdapter(name, adapter),
};

// Export types
export type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricAuthConfiguration,
  BiometricAuthAdapter,
  BiometricAuthState,
  BiometryType,
  BiometricError
};

export { BiometricErrorCode } from './core/types';

// Export the main API as default
export default BiometricAuth;

// Also export named for flexibility
export { BiometricAuth };

// Export core classes for advanced usage
export { BiometricAuthCore } from './core/BiometricAuthCore';
export { PlatformDetector } from './core/platform-detector';

// Export adapters for those who want to use them directly
export { WebAdapter } from './adapters/WebAdapter';
export { CapacitorAdapter } from './adapters/CapacitorAdapter';

// For backward compatibility with Capacitor plugin registration
if (typeof window !== 'undefined') {
  const { Capacitor } = (window as any);
  if (Capacitor) {
    // Register as a Capacitor plugin for backward compatibility
    const { registerPlugin } = Capacitor;
    if (registerPlugin) {
      try {
        // Create a Capacitor-compatible plugin interface
        const BiometricAuthPlugin = {
          isAvailable: async () => ({ isAvailable: await BiometricAuth.isAvailable() }),
          getSupportedBiometrics: async () => ({ 
            biometryTypes: await BiometricAuth.getSupportedBiometrics() 
          }),
          authenticate: async (options: BiometricAuthOptions) => {
            const result = await BiometricAuth.authenticate(options);
            return {
              success: result.success,
              error: result.error,
              biometryType: result.biometryType
            };
          },
          deleteCredentials: async () => {
            await BiometricAuth.deleteCredentials();
            return {};
          }
        };

        // Register the plugin
        registerPlugin('BiometricAuth', {
          web: BiometricAuthPlugin
        });
      } catch (e) {
        // Ignore registration errors - not critical
      }
    }
  }
}