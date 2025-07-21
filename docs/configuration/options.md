# Configuration Options

This guide covers all configuration options available in the `capacitor-biometric-authentication` plugin. Learn how to customize behavior, security settings, and platform-specific features.

## Overview

Configuration is done through the `configure()` method:

```typescript
await BiometricAuth.configure({
  // General options
  sessionDuration: 1800000,
  enableLogging: true,

  // Platform-specific options
  androidConfig: {
    /* ... */
  },
  iosConfig: {
    /* ... */
  },
  webConfig: {
    /* ... */
  },
});
```

## General Configuration Options

### sessionDuration

Duration in milliseconds for session validity.

- **Type**: `number`
- **Default**: `1800000` (30 minutes)
- **Range**: `0` to `86400000` (24 hours)

```typescript
await BiometricAuth.configure({
  sessionDuration: 3600000, // 1 hour
});
```

**Use Cases**:

- Banking apps: 5-10 minutes
- Social apps: 30-60 minutes
- Utility apps: 24 hours

### sessionKey

Custom key for storing session data.

- **Type**: `string`
- **Default**: `"biometric_session"`

```typescript
await BiometricAuth.configure({
  sessionKey: 'myapp_biometric_session',
});
```

**Use Cases**:

- Multiple authentication contexts
- App with different user types
- Avoiding conflicts with other plugins

### encryptionKey

Custom encryption key for credential storage.

- **Type**: `string`
- **Default**: Auto-generated secure key

```typescript
await BiometricAuth.configure({
  encryptionKey: generateSecureKey(), // Your secure key
});
```

**Security Note**: If provided, ensure the key is:

- At least 32 characters long
- Cryptographically random
- Stored securely
- Unique per installation

### storagePrefix

Prefix for all storage keys.

- **Type**: `string`
- **Default**: `"biometric_"`

```typescript
await BiometricAuth.configure({
  storagePrefix: 'myapp_bio_',
});
```

**Use Cases**:

- Multi-tenant applications
- Multiple authentication providers
- Namespace isolation

### allowDeviceCredential

Allow fallback to device PIN/pattern/password.

- **Type**: `boolean`
- **Default**: `true`

```typescript
await BiometricAuth.configure({
  allowDeviceCredential: false, // Biometric only
});
```

**Considerations**:

- `true`: Better accessibility
- `false`: Stricter security

### confirmationRequired

Require explicit user confirmation after biometric.

- **Type**: `boolean`
- **Default**: `false`

```typescript
await BiometricAuth.configure({
  confirmationRequired: true, // Extra confirmation step
});
```

**Use Cases**:

- High-value transactions
- Irreversible actions
- Compliance requirements

### enableLogging

Enable debug logging.

- **Type**: `boolean`
- **Default**: `false`

```typescript
await BiometricAuth.configure({
  enableLogging: process.env.NODE_ENV === 'development',
});
```

**Important**: Disable in production to avoid exposing sensitive information.

## Android Configuration

### androidConfig.keystoreAlias

Alias for Android Keystore entry.

- **Type**: `string`
- **Default**: `"BiometricAuthKey"`

```typescript
await BiometricAuth.configure({
  androidConfig: {
    keystoreAlias: 'MyAppBiometricKey',
  },
});
```

### androidConfig.userAuthenticationRequired

Require user authentication to use the key.

- **Type**: `boolean`
- **Default**: `true`

```typescript
await BiometricAuth.configure({
  androidConfig: {
    userAuthenticationRequired: true,
  },
});
```

### androidConfig.invalidatedByBiometricEnrollment

Invalidate keys when new biometrics are enrolled.

- **Type**: `boolean`
- **Default**: `true`

```typescript
await BiometricAuth.configure({
  androidConfig: {
    invalidatedByBiometricEnrollment: true, // Recommended
  },
});
```

**Security Impact**:

- `true`: Higher security, keys invalidated on changes
- `false`: Convenience, keys persist through changes

### androidConfig.strongBoxBacked

Use hardware security module if available.

- **Type**: `boolean`
- **Default**: `false`

```typescript
await BiometricAuth.configure({
  androidConfig: {
    strongBoxBacked: true, // Use HSM when available
  },
});
```

**Note**: Falls back to TEE if StrongBox unavailable.

### Android Authentication Options

Configure BiometricPrompt dialog:

```typescript
await BiometricAuth.authenticate({
  androidOptions: {
    promptInfo: {
      title: 'Biometric Login',
      subtitle: 'Access your secure account',
      description: 'Touch the fingerprint sensor',
      negativeButtonText: 'Use Password',
    },
    encryptionRequired: true,
    confirmationRequired: false,
  },
});
```

## iOS Configuration

### iosConfig.accessGroup

Keychain access group for sharing.

- **Type**: `string`
- **Default**: `undefined`

```typescript
await BiometricAuth.configure({
  iosConfig: {
    accessGroup: 'group.com.company.apps',
  },
});
```

**Requirements**:

- Add to entitlements file
- Use for app extensions
- Share between related apps

### iosConfig.touchIDAuthenticationAllowableReuseDuration

Duration for Touch ID reuse.

- **Type**: `number` (seconds)
- **Default**: `0` (always require)

```typescript
await BiometricAuth.configure({
  iosConfig: {
    touchIDAuthenticationAllowableReuseDuration: 10,
  },
});
```

**Note**: Only applies to Touch ID, not Face ID.

### iOS Authentication Options

Customize authentication dialog:

```typescript
await BiometricAuth.authenticate({
  iosOptions: {
    localizedFallbackTitle: 'Enter Passcode',
    biometryType: 'faceID', // or 'touchID'
  },
});
```

## Web Configuration

### webConfig.rpId

Relying Party identifier (your domain).

- **Type**: `string`
- **Default**: Current domain

```typescript
await BiometricAuth.configure({
  webConfig: {
    rpId: 'example.com', // Without protocol
  },
});
```

**Important**: Must match your domain exactly.

### webConfig.rpName

Relying Party display name.

- **Type**: `string`
- **Default**: `"Biometric Authentication"`

```typescript
await BiometricAuth.configure({
  webConfig: {
    rpName: 'My Awesome App',
  },
});
```

### webConfig.userVerification

User verification requirement.

- **Type**: `'required' | 'preferred' | 'discouraged'`
- **Default**: `'preferred'`

```typescript
await BiometricAuth.configure({
  webConfig: {
    userVerification: 'required', // Always require biometric
  },
});
```

**Options**:

- `required`: Must use biometric
- `preferred`: Use if available
- `discouraged`: Skip if possible

### webConfig.timeout

Authentication timeout in milliseconds.

- **Type**: `number`
- **Default**: `60000` (1 minute)

```typescript
await BiometricAuth.configure({
  webConfig: {
    timeout: 120000, // 2 minutes
  },
});
```

### webConfig.attestation

Attestation conveyance preference.

- **Type**: `'none' | 'indirect' | 'direct'`
- **Default**: `'none'`

```typescript
await BiometricAuth.configure({
  webConfig: {
    attestation: 'direct', // For high security
  },
});
```

**Options**:

- `none`: No attestation needed
- `indirect`: Anonymized attestation
- `direct`: Full attestation

### Web Authentication Options

Provide additional WebAuthn options:

```typescript
await BiometricAuth.authenticate({
  webOptions: {
    challenge: customChallenge,
    allowCredentials: ['credential-id-1', 'credential-id-2'],
  },
});
```

## Configuration Examples

### High Security Configuration

For banking or healthcare apps:

```typescript
await BiometricAuth.configure({
  // Short session
  sessionDuration: 300000, // 5 minutes

  // No fallback methods
  allowDeviceCredential: false,

  // Require confirmation
  confirmationRequired: true,

  // Android security
  androidConfig: {
    invalidatedByBiometricEnrollment: true,
    strongBoxBacked: true,
    userAuthenticationRequired: true,
  },

  // iOS security
  iosConfig: {
    touchIDAuthenticationAllowableReuseDuration: 0, // No reuse
  },

  // Web security
  webConfig: {
    userVerification: 'required',
    attestation: 'direct',
    timeout: 30000, // 30 seconds
  },
});
```

### User-Friendly Configuration

For social or utility apps:

```typescript
await BiometricAuth.configure({
  // Long session
  sessionDuration: 86400000, // 24 hours

  // Allow fallbacks
  allowDeviceCredential: true,

  // No extra confirmation
  confirmationRequired: false,

  // Android convenience
  androidConfig: {
    invalidatedByBiometricEnrollment: false,
  },

  // iOS convenience
  iosConfig: {
    touchIDAuthenticationAllowableReuseDuration: 60, // 1 minute
  },

  // Web convenience
  webConfig: {
    userVerification: 'preferred',
    timeout: 120000, // 2 minutes
  },
});
```

### Development Configuration

For testing and debugging:

```typescript
await BiometricAuth.configure({
  enableLogging: true,
  sessionDuration: 60000, // 1 minute for testing

  // Test different scenarios
  allowDeviceCredential: true,
  confirmationRequired: false,

  webConfig: {
    userVerification: 'preferred',
    timeout: 300000, // 5 minutes for debugging
  },
});
```

## Platform-Specific Behavior

### Configuration Persistence

Configurations are stored persistently:

| Platform | Storage Location  |
| -------- | ----------------- |
| Android  | SharedPreferences |
| iOS      | UserDefaults      |
| Web      | localStorage      |

### Default Values by Platform

Some defaults vary by platform:

```typescript
// Platform detection
import { Capacitor } from '@capacitor/core';

const platform = Capacitor.getPlatform();

const config = {
  // Platform-specific defaults
  ...(platform === 'android' && {
    androidConfig: {
      encryptionRequired: true,
    },
  }),
  ...(platform === 'ios' && {
    iosConfig: {
      touchIDAuthenticationAllowableReuseDuration: 0,
    },
  }),
  ...(platform === 'web' && {
    webConfig: {
      userVerification: 'preferred',
    },
  }),
};

await BiometricAuth.configure(config);
```

## Configuration Validation

The plugin validates configuration:

```typescript
try {
  await BiometricAuth.configure({
    sessionDuration: -1, // Invalid
  });
} catch (error) {
  // Error: sessionDuration must be positive
}
```

### Validation Rules

1. **sessionDuration**: Must be 0-86400000
2. **encryptionKey**: Minimum 32 characters if provided
3. **rpId**: Valid domain format
4. **timeout**: Must be positive
5. **accessGroup**: Valid iOS format

## Dynamic Configuration

Change configuration based on context:

```typescript
class DynamicConfig {
  async configureForContext(context: 'login' | 'transaction' | 'settings') {
    const configs = {
      login: {
        sessionDuration: 1800000,
        confirmationRequired: false,
      },
      transaction: {
        sessionDuration: 300000,
        confirmationRequired: true,
        allowDeviceCredential: false,
      },
      settings: {
        sessionDuration: 600000,
        confirmationRequired: true,
      },
    };

    await BiometricAuth.configure(configs[context]);
  }
}
```

## Best Practices

1. **Configure Once**: Set configuration early in app lifecycle
2. **Environment-Based**: Use different configs for dev/prod
3. **User Preferences**: Allow users to adjust security level
4. **Platform Awareness**: Configure based on platform capabilities
5. **Security First**: Default to secure options
6. **Test Thoroughly**: Test all configuration combinations

## Troubleshooting Configuration

### Common Issues

1. **Configuration not persisting**
   - Check storage permissions
   - Verify storage availability

2. **Platform-specific options ignored**
   - Ensure correct platform detection
   - Check option compatibility

3. **Validation errors**
   - Review error messages
   - Check value ranges

### Debug Configuration

```typescript
// Helper to debug current configuration
async function debugConfig() {
  await BiometricAuth.configure({
    enableLogging: true,
  });

  // Attempt authentication to see config in logs
  try {
    await BiometricAuth.authenticate();
  } catch (e) {
    consoleLog('Config debug:', e);
  }
}
```
