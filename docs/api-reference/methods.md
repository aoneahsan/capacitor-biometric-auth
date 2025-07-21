# API Methods Reference

This document provides detailed information about all methods available in the `capacitor-biometric-authentication` plugin.

## Overview

The BiometricAuth plugin provides the following methods:

- [`isAvailable()`](#isavailable) - Check if biometric authentication is available
- [`getSupportedBiometrics()`](#getsupportedbiometrics) - Get list of supported biometric types
- [`authenticate()`](#authenticate) - Perform biometric authentication
- [`deleteCredentials()`](#deletecredentials) - Delete stored credentials
- [`configure()`](#configure) - Configure plugin settings

## Method Details

### `isAvailable()`

Checks whether biometric authentication is available on the device.

#### Signature

```typescript
isAvailable(): Promise<BiometricAvailabilityResult>
```

#### Returns

```typescript
interface BiometricAvailabilityResult {
  isAvailable: boolean;
  reason?: BiometricUnavailableReason;
}

enum BiometricUnavailableReason {
  NO_HARDWARE = 'NO_HARDWARE',
  NO_ENROLLED_BIOMETRICS = 'NO_ENROLLED_BIOMETRICS',
  BIOMETRIC_UNAVAILABLE = 'BIOMETRIC_UNAVAILABLE',
}
```

#### Example

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

async function checkAvailability() {
  try {
    const result = await BiometricAuth.isAvailable();

    if (result.isAvailable) {
      consoleLog('Biometric authentication is available');
    } else {
      consoleLog('Not available. Reason:', result.reason);

      // Handle specific reasons
      switch (result.reason) {
        case 'NO_HARDWARE':
          // Device doesn't support biometrics
          break;
        case 'NO_ENROLLED_BIOMETRICS':
          // User needs to enroll biometrics in device settings
          promptUserToEnrollBiometrics();
          break;
        case 'BIOMETRIC_UNAVAILABLE':
          // Temporarily unavailable (e.g., too many failed attempts)
          break;
      }
    }
  } catch (error) {
    console.error('Error checking availability:', error);
  }
}
```

#### Platform Notes

- **Android**: Checks for BiometricManager availability and enrolled biometrics
- **iOS**: Checks LAContext canEvaluatePolicy
- **Web**: Checks for WebAuthn API support and stored credentials

---

### `getSupportedBiometrics()`

Returns a list of biometric authentication types supported by the device.

#### Signature

```typescript
getSupportedBiometrics(): Promise<SupportedBiometricsResult>
```

#### Returns

```typescript
interface SupportedBiometricsResult {
  supportedBiometrics: BiometricType[];
}

enum BiometricType {
  TOUCH_ID = 'TOUCH_ID',
  FACE_ID = 'FACE_ID',
  FINGERPRINT = 'FINGERPRINT',
  FACE = 'FACE',
  IRIS = 'IRIS',
  DEVICE_CREDENTIAL = 'DEVICE_CREDENTIAL',
}
```

#### Example

```typescript
async function checkSupportedTypes() {
  try {
    const { supportedBiometrics } =
      await BiometricAuth.getSupportedBiometrics();

    consoleLog('Supported types:', supportedBiometrics);

    // Check for specific types
    const hasFaceID = supportedBiometrics.includes(BiometricType.FACE_ID);
    const hasFingerprint =
      supportedBiometrics.includes(BiometricType.FINGERPRINT) ||
      supportedBiometrics.includes(BiometricType.TOUCH_ID);

    // Update UI based on available types
    if (hasFaceID) {
      showFaceIDButton();
    } else if (hasFingerprint) {
      showFingerprintButton();
    }
  } catch (error) {
    console.error('Error getting supported biometrics:', error);
  }
}
```

#### Platform-Specific Types

| Platform | Possible Types                                     |
| -------- | -------------------------------------------------- |
| iOS      | `TOUCH_ID`, `FACE_ID`                              |
| Android  | `FINGERPRINT`, `FACE`, `IRIS`, `DEVICE_CREDENTIAL` |
| Web      | `FINGERPRINT`, `FACE` (depends on authenticator)   |

---

### `authenticate()`

Performs biometric authentication with optional configuration.

#### Signature

```typescript
authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult>
```

#### Parameters

```typescript
interface BiometricAuthOptions {
  // Common options
  reason?: string; // Reason for authentication
  fallbackButtonTitle?: string; // Custom fallback button text
  cancelButtonTitle?: string; // Custom cancel button text
  disableBackup?: boolean; // Disable fallback methods
  maxAttempts?: number; // Maximum authentication attempts

  // iOS-specific options
  iosOptions?: {
    localizedFallbackTitle?: string; // iOS fallback button text
    biometryType?: 'touchID' | 'faceID';
  };

  // Android-specific options
  androidOptions?: {
    promptInfo?: {
      title?: string; // Dialog title
      subtitle?: string; // Dialog subtitle
      description?: string; // Dialog description
      negativeButtonText?: string; // Negative button text
    };
    encryptionRequired?: boolean; // Require encryption
    confirmationRequired?: boolean; // Require user confirmation
  };

  // Web-specific options
  webOptions?: {
    challenge?: string; // WebAuthn challenge
    allowCredentials?: string[]; // Allowed credential IDs
  };
}
```

#### Returns

```typescript
interface BiometricAuthResult {
  isAuthenticated: boolean;
  credentialId?: string; // Credential ID (Web only)
  authenticationType?: BiometricType; // Type used for authentication
}
```

#### Examples

##### Basic Authentication

```typescript
async function basicAuth() {
  try {
    const result = await BiometricAuth.authenticate({
      reason: 'Please authenticate to continue',
    });

    if (result.isAuthenticated) {
      consoleLog('Authentication successful');
      consoleLog('Used:', result.authenticationType);
    }
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

##### Custom UI Options

```typescript
async function customUIAuth() {
  const result = await BiometricAuth.authenticate({
    reason: 'Verify your identity',
    fallbackButtonTitle: 'Use PIN',
    cancelButtonTitle: 'Not Now',
    androidOptions: {
      promptInfo: {
        title: 'Biometric Login',
        subtitle: 'Use your fingerprint or face',
        description: 'Quick and secure authentication',
        negativeButtonText: 'Use Password',
      },
    },
    iosOptions: {
      localizedFallbackTitle: 'Enter Passcode',
    },
  });
}
```

##### Strict Biometric Only

```typescript
async function strictBiometricAuth() {
  const result = await BiometricAuth.authenticate({
    reason: 'Biometric required for this action',
    disableBackup: true, // No fallback allowed
    maxAttempts: 1, // Single attempt only
    androidOptions: {
      encryptionRequired: true,
      confirmationRequired: true,
    },
  });
}
```

#### Error Handling

The method throws errors with specific error codes:

```typescript
try {
  await BiometricAuth.authenticate(options);
} catch (error: any) {
  switch (error.code) {
    case BiometricErrorCode.USER_CANCELLED:
      // User cancelled the dialog
      break;
    case BiometricErrorCode.AUTHENTICATION_FAILED:
      // Authentication failed (wrong biometric)
      break;
    case BiometricErrorCode.LOCKOUT:
      // Too many failed attempts
      break;
    case BiometricErrorCode.LOCKOUT_PERMANENT:
      // Permanently locked out
      break;
    case BiometricErrorCode.USER_FALLBACK:
      // User selected fallback option
      break;
    case BiometricErrorCode.SYSTEM_CANCELLED:
      // System cancelled (e.g., app went to background)
      break;
    case BiometricErrorCode.NOT_AVAILABLE:
      // Biometric not available
      break;
    case BiometricErrorCode.PERMISSION_DENIED:
      // Permission denied
      break;
    case BiometricErrorCode.BIOMETRIC_NOT_ENROLLED:
      // No biometrics enrolled
      break;
    default:
      // Generic error
      console.error('Unknown error:', error);
  }
}
```

---

### `deleteCredentials()`

Deletes stored biometric credentials from secure storage.

#### Signature

```typescript
deleteCredentials(): Promise<void>
```

#### Example

```typescript
async function logout() {
  try {
    // Clear stored credentials
    await BiometricAuth.deleteCredentials();
    consoleLog('Credentials deleted successfully');

    // Clear other app data
    clearUserSession();
    navigateToLogin();
  } catch (error) {
    console.error('Error deleting credentials:', error);
  }
}
```

#### Platform Behavior

- **Android**: Clears SharedPreferences and Keystore entries
- **iOS**: Removes Keychain items
- **Web**: Clears stored WebAuthn credentials from localStorage

#### Use Cases

1. User logout
2. Account switching
3. Privacy settings (user requests data deletion)
4. Troubleshooting authentication issues

---

### `configure()`

Configures global plugin settings.

#### Signature

```typescript
configure(config: BiometricAuthConfig): Promise<void>
```

#### Parameters

```typescript
interface BiometricAuthConfig {
  // Session configuration
  sessionDuration?: number; // Session duration in milliseconds
  sessionKey?: string; // Custom session storage key

  // Security options
  encryptionKey?: string; // Custom encryption key
  storagePrefix?: string; // Storage key prefix

  // Behavior options
  allowDeviceCredential?: boolean; // Allow device PIN/pattern/password
  confirmationRequired?: boolean; // Require explicit confirmation
  enableLogging?: boolean; // Enable debug logging

  // Platform-specific
  androidConfig?: {
    keystoreAlias?: string; // Android Keystore alias
    userAuthenticationRequired?: boolean;
    invalidatedByBiometricEnrollment?: boolean;
    strongBoxBacked?: boolean;
  };

  iosConfig?: {
    accessGroup?: string; // iOS Keychain access group
    touchIDAuthenticationAllowableReuseDuration?: number;
  };

  webConfig?: {
    rpId?: string; // Relying party ID
    rpName?: string; // Relying party name
    userVerification?: 'required' | 'preferred' | 'discouraged';
    timeout?: number; // Authentication timeout
    attestation?: 'none' | 'indirect' | 'direct';
  };
}
```

#### Examples

##### Basic Configuration

```typescript
async function setupPlugin() {
  await BiometricAuth.configure({
    sessionDuration: 30 * 60 * 1000, // 30 minutes
    enableLogging: true,
    allowDeviceCredential: true,
  });
}
```

##### Platform-Specific Configuration

```typescript
async function configurePlatforms() {
  await BiometricAuth.configure({
    androidConfig: {
      keystoreAlias: 'MyAppBiometric',
      userAuthenticationRequired: true,
      strongBoxBacked: true, // Use hardware security module if available
    },
    iosConfig: {
      accessGroup: 'group.com.mycompany.myapp',
      touchIDAuthenticationAllowableReuseDuration: 10, // 10 seconds
    },
    webConfig: {
      rpId: 'myapp.com',
      rpName: 'My Awesome App',
      userVerification: 'preferred',
      timeout: 60000, // 60 seconds
    },
  });
}
```

##### Security-Focused Configuration

```typescript
async function highSecurityConfig() {
  await BiometricAuth.configure({
    sessionDuration: 5 * 60 * 1000, // 5 minutes only
    allowDeviceCredential: false, // Biometric only
    confirmationRequired: true, // Always require confirmation
    encryptionKey: generateSecureKey(), // Custom encryption
    androidConfig: {
      invalidatedByBiometricEnrollment: true, // Invalidate on new fingerprint
      strongBoxBacked: true,
    },
  });
}
```

#### Configuration Persistence

Configuration is stored persistently and survives app restarts. Call `configure()` only when you need to change settings.

## Type Definitions

### Error Codes

```typescript
enum BiometricErrorCode {
  USER_CANCELLED = 'USER_CANCELLED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  LOCKOUT = 'LOCKOUT',
  LOCKOUT_PERMANENT = 'LOCKOUT_PERMANENT',
  USER_FALLBACK = 'USER_FALLBACK',
  SYSTEM_CANCELLED = 'SYSTEM_CANCELLED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  BIOMETRIC_NOT_ENROLLED = 'BIOMETRIC_NOT_ENROLLED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

### Complete Type Reference

For complete type definitions, see [Type Definitions](./types.md).

## Method Availability by Platform

| Method                     | Android | iOS | Web |
| -------------------------- | ------- | --- | --- |
| `isAvailable()`            | ✅      | ✅  | ✅  |
| `getSupportedBiometrics()` | ✅      | ✅  | ✅  |
| `authenticate()`           | ✅      | ✅  | ✅  |
| `deleteCredentials()`      | ✅      | ✅  | ✅  |
| `configure()`              | ✅      | ✅  | ✅  |

## Best Practices

1. **Always check availability first** before calling other methods
2. **Handle all error cases** appropriately
3. **Provide clear authentication reasons** for better UX
4. **Configure once** at app initialization
5. **Test on real devices** - biometrics don't work on simulators
6. **Respect user privacy** - don't store biometric data
7. **Offer fallback options** for better accessibility
