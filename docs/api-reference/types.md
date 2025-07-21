# Type Definitions Reference

This document provides comprehensive type definitions for the `capacitor-biometric-authentication` plugin.

## Core Types

### BiometricAuthPlugin

The main plugin interface defining all available methods:

```typescript
interface BiometricAuthPlugin {
  isAvailable(): Promise<BiometricAvailabilityResult>;
  getSupportedBiometrics(): Promise<SupportedBiometricsResult>;
  authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult>;
  deleteCredentials(): Promise<void>;
  configure(config: BiometricAuthConfig): Promise<void>;
}
```

## Result Types

### BiometricAvailabilityResult

Result returned by `isAvailable()` method:

```typescript
interface BiometricAvailabilityResult {
  /**
   * Whether biometric authentication is available
   */
  isAvailable: boolean;

  /**
   * Reason why biometric is unavailable (only present if isAvailable is false)
   */
  reason?: BiometricUnavailableReason;
}
```

### SupportedBiometricsResult

Result returned by `getSupportedBiometrics()` method:

```typescript
interface SupportedBiometricsResult {
  /**
   * Array of supported biometric types
   */
  supportedBiometrics: BiometricType[];
}
```

### BiometricAuthResult

Result returned by `authenticate()` method:

```typescript
interface BiometricAuthResult {
  /**
   * Whether authentication was successful
   */
  isAuthenticated: boolean;

  /**
   * Credential ID for WebAuthn (Web platform only)
   */
  credentialId?: string;

  /**
   * The type of biometric used for authentication
   */
  authenticationType?: BiometricType;
}
```

## Option Types

### BiometricAuthOptions

Options for the `authenticate()` method:

```typescript
interface BiometricAuthOptions {
  /**
   * Reason for requesting authentication
   * Displayed to the user in the authentication dialog
   */
  reason?: string;

  /**
   * Custom text for the fallback button
   * Default varies by platform
   */
  fallbackButtonTitle?: string;

  /**
   * Custom text for the cancel button
   * Default: "Cancel"
   */
  cancelButtonTitle?: string;

  /**
   * Whether to disable backup authentication methods
   * (PIN, pattern, password)
   * Default: false
   */
  disableBackup?: boolean;

  /**
   * Maximum number of authentication attempts allowed
   * Default: 3
   */
  maxAttempts?: number;

  /**
   * iOS-specific authentication options
   */
  iosOptions?: IOSBiometricAuthOptions;

  /**
   * Android-specific authentication options
   */
  androidOptions?: AndroidBiometricAuthOptions;

  /**
   * Web-specific authentication options
   */
  webOptions?: WebBiometricAuthOptions;
}
```

### Platform-Specific Option Types

#### IOSBiometricAuthOptions

```typescript
interface IOSBiometricAuthOptions {
  /**
   * The localized title for the fallback button
   * iOS only - overrides fallbackButtonTitle
   */
  localizedFallbackTitle?: string;

  /**
   * Specific biometry type to use
   * If not specified, uses device default
   */
  biometryType?: 'touchID' | 'faceID';
}
```

#### AndroidBiometricAuthOptions

```typescript
interface AndroidBiometricAuthOptions {
  /**
   * Prompt dialog configuration
   */
  promptInfo?: {
    /**
     * Title of the authentication dialog
     * Default: "Biometric Authentication"
     */
    title?: string;

    /**
     * Subtitle of the authentication dialog
     */
    subtitle?: string;

    /**
     * Description text in the dialog
     */
    description?: string;

    /**
     * Text for the negative button
     * Default: "Cancel"
     */
    negativeButtonText?: string;
  };

  /**
   * Whether encryption is required
   * Default: true
   */
  encryptionRequired?: boolean;

  /**
   * Whether explicit user confirmation is required
   * after biometric authentication
   * Default: false
   */
  confirmationRequired?: boolean;
}
```

#### WebBiometricAuthOptions

```typescript
interface WebBiometricAuthOptions {
  /**
   * WebAuthn challenge string
   * If not provided, a random challenge is generated
   */
  challenge?: string;

  /**
   * List of credential IDs that can be used
   * If not provided, any stored credential can be used
   */
  allowCredentials?: string[];
}
```

### BiometricAuthConfig

Configuration options for the `configure()` method:

```typescript
interface BiometricAuthConfig {
  /**
   * Session duration in milliseconds
   * Default: 1800000 (30 minutes)
   */
  sessionDuration?: number;

  /**
   * Custom key for session storage
   * Default: "biometric_session"
   */
  sessionKey?: string;

  /**
   * Custom encryption key for credential storage
   * If not provided, a default key is used
   */
  encryptionKey?: string;

  /**
   * Prefix for storage keys
   * Useful for multi-account scenarios
   * Default: "biometric_"
   */
  storagePrefix?: string;

  /**
   * Whether to allow device credential as fallback
   * Default: true
   */
  allowDeviceCredential?: boolean;

  /**
   * Whether confirmation is required after authentication
   * Default: false
   */
  confirmationRequired?: boolean;

  /**
   * Enable debug logging
   * Default: false
   */
  enableLogging?: boolean;

  /**
   * Android-specific configuration
   */
  androidConfig?: AndroidConfig;

  /**
   * iOS-specific configuration
   */
  iosConfig?: IOSConfig;

  /**
   * Web-specific configuration
   */
  webConfig?: WebConfig;
}
```

### Platform-Specific Config Types

#### AndroidConfig

```typescript
interface AndroidConfig {
  /**
   * Alias for the Android Keystore entry
   * Default: "BiometricAuthKey"
   */
  keystoreAlias?: string;

  /**
   * Whether user authentication is required to use the key
   * Default: true
   */
  userAuthenticationRequired?: boolean;

  /**
   * Whether the key is invalidated when biometrics are enrolled
   * Default: true
   */
  invalidatedByBiometricEnrollment?: boolean;

  /**
   * Whether to use StrongBox-backed keys if available
   * Default: false
   */
  strongBoxBacked?: boolean;
}
```

#### IOSConfig

```typescript
interface IOSConfig {
  /**
   * Keychain access group for sharing credentials
   * between app extensions
   */
  accessGroup?: string;

  /**
   * Duration in seconds for which Touch ID authentication
   * can be reused
   * Default: 0 (always require authentication)
   */
  touchIDAuthenticationAllowableReuseDuration?: number;
}
```

#### WebConfig

```typescript
interface WebConfig {
  /**
   * Relying Party ID (usually the domain)
   * Default: current domain
   */
  rpId?: string;

  /**
   * Relying Party name shown to users
   * Default: "Biometric Authentication"
   */
  rpName?: string;

  /**
   * User verification requirement level
   * Default: "preferred"
   */
  userVerification?: 'required' | 'preferred' | 'discouraged';

  /**
   * Timeout for authentication in milliseconds
   * Default: 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Attestation conveyance preference
   * Default: "none"
   */
  attestation?: 'none' | 'indirect' | 'direct';
}
```

## Enum Types

### BiometricType

Types of biometric authentication available:

```typescript
enum BiometricType {
  /**
   * Touch ID (iOS)
   */
  TOUCH_ID = 'TOUCH_ID',

  /**
   * Face ID (iOS)
   */
  FACE_ID = 'FACE_ID',

  /**
   * Fingerprint (Android)
   */
  FINGERPRINT = 'FINGERPRINT',

  /**
   * Face recognition (Android)
   */
  FACE = 'FACE',

  /**
   * Iris recognition (Android)
   */
  IRIS = 'IRIS',

  /**
   * Device credential (PIN/Pattern/Password)
   */
  DEVICE_CREDENTIAL = 'DEVICE_CREDENTIAL',
}
```

### BiometricUnavailableReason

Reasons why biometric authentication might be unavailable:

```typescript
enum BiometricUnavailableReason {
  /**
   * Device doesn't have biometric hardware
   */
  NO_HARDWARE = 'NO_HARDWARE',

  /**
   * No biometrics are enrolled on the device
   */
  NO_ENROLLED_BIOMETRICS = 'NO_ENROLLED_BIOMETRICS',

  /**
   * Biometric is temporarily unavailable
   * (e.g., too many failed attempts)
   */
  BIOMETRIC_UNAVAILABLE = 'BIOMETRIC_UNAVAILABLE',
}
```

### BiometricErrorCode

Error codes that can be thrown during authentication:

```typescript
enum BiometricErrorCode {
  /**
   * User cancelled the authentication dialog
   */
  USER_CANCELLED = 'USER_CANCELLED',

  /**
   * Authentication failed (biometric not recognized)
   */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  /**
   * Too many failed attempts, temporary lockout
   */
  LOCKOUT = 'LOCKOUT',

  /**
   * Too many failed attempts, permanent lockout
   */
  LOCKOUT_PERMANENT = 'LOCKOUT_PERMANENT',

  /**
   * User pressed the fallback button
   */
  USER_FALLBACK = 'USER_FALLBACK',

  /**
   * System cancelled authentication
   * (e.g., app went to background)
   */
  SYSTEM_CANCELLED = 'SYSTEM_CANCELLED',

  /**
   * Biometric authentication not available
   */
  NOT_AVAILABLE = 'NOT_AVAILABLE',

  /**
   * Permission denied by user or system
   */
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  /**
   * No biometrics enrolled on device
   */
  BIOMETRIC_NOT_ENROLLED = 'BIOMETRIC_NOT_ENROLLED',

  /**
   * Unknown error occurred
   */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

## Error Types

### BiometricError

Error object thrown by the plugin:

```typescript
interface BiometricError extends Error {
  /**
   * Error code from BiometricErrorCode enum
   */
  code: BiometricErrorCode;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Additional error details (platform-specific)
   */
  details?: any;
}
```

## Usage Examples

### Type-Safe Error Handling

```typescript
import {
  BiometricAuth,
  BiometricError,
  BiometricErrorCode,
} from 'capacitor-biometric-authentication';

try {
  const result = await BiometricAuth.authenticate({
    reason: 'Authenticate to continue',
  });
} catch (error: unknown) {
  if (isBiometricError(error)) {
    switch (error.code) {
      case BiometricErrorCode.USER_CANCELLED:
        consoleLog('User cancelled');
        break;
      case BiometricErrorCode.LOCKOUT:
        consoleLog('Too many attempts');
        break;
      // Handle other cases...
    }
  }
}

function isBiometricError(error: unknown): error is BiometricError {
  return (error as BiometricError).code !== undefined;
}
```

### Working with Platform-Specific Options

```typescript
import { Capacitor } from '@capacitor/core';
import {
  BiometricAuth,
  BiometricAuthOptions,
} from 'capacitor-biometric-authentication';

async function authenticateWithPlatformOptions() {
  const options: BiometricAuthOptions = {
    reason: 'Please authenticate',
  };

  // Add platform-specific options
  if (Capacitor.getPlatform() === 'ios') {
    options.iosOptions = {
      localizedFallbackTitle: 'Use Passcode',
      biometryType: 'faceID',
    };
  } else if (Capacitor.getPlatform() === 'android') {
    options.androidOptions = {
      promptInfo: {
        title: 'Biometric Login',
        subtitle: 'Log in to MyApp',
        negativeButtonText: 'Use Password',
      },
      encryptionRequired: true,
    };
  } else if (Capacitor.getPlatform() === 'web') {
    options.webOptions = {
      challenge: generateChallenge(),
    };
  }

  const result = await BiometricAuth.authenticate(options);
}
```

### Type Guards

```typescript
// Type guard for BiometricType
function isFaceAuthentication(type?: BiometricType): boolean {
  return type === BiometricType.FACE_ID || type === BiometricType.FACE;
}

// Type guard for platform-specific config
function hasAndroidConfig(
  config: BiometricAuthConfig
): config is BiometricAuthConfig & { androidConfig: AndroidConfig } {
  return config.androidConfig !== undefined;
}
```

## TypeScript Configuration

For best type safety, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```
