# Migration Guide

This guide helps you migrate from other biometric authentication plugins to `capacitor-biometric-authentication`.

## Migration Overview

The `capacitor-biometric-authentication` plugin provides a unified API across all platforms with enhanced features:

- ✅ Full TypeScript support
- ✅ Web platform support (WebAuthn)
- ✅ Session management
- ✅ Enhanced error handling
- ✅ Customizable UI options
- ✅ Secure credential storage

## Migration from Popular Plugins

### From `capacitor-native-biometric`

#### API Differences

```typescript
// Old: capacitor-native-biometric
import { NativeBiometric } from 'capacitor-native-biometric';

// Check availability
const result = await NativeBiometric.isAvailable();
if (result.isAvailable) {
  // Authenticate
  await NativeBiometric.verifyIdentity({
    reason: 'For easy log in',
    title: 'Log in',
    subtitle: 'Maybe add subtitle here?',
    description: 'Maybe a description too?',
  });
}

// New: capacitor-biometric-authentication
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Check availability
const { isAvailable } = await BiometricAuth.isAvailable();
if (isAvailable) {
  // Authenticate
  await BiometricAuth.authenticate({
    reason: 'For easy log in',
    androidOptions: {
      promptInfo: {
        title: 'Log in',
        subtitle: 'Maybe add subtitle here?',
        description: 'Maybe a description too?',
      },
    },
  });
}
```

#### Migration Steps

1. **Update imports**:

```typescript
// Replace
import { NativeBiometric } from 'capacitor-native-biometric';

// With
import { BiometricAuth } from 'capacitor-biometric-authentication';
```

2. **Update method calls**:

```typescript
// Old
await NativeBiometric.verifyIdentity(options);

// New
await BiometricAuth.authenticate(options);
```

3. **Update error handling**:

```typescript
// Old
try {
  await NativeBiometric.verifyIdentity(options);
} catch (e) {
  // Generic error handling
}

// New
try {
  await BiometricAuth.authenticate(options);
} catch (error: any) {
  switch (error.code) {
    case BiometricErrorCode.USER_CANCELLED:
      // Specific handling
      break;
    // More cases...
  }
}
```

### From `@aparajita/capacitor-biometric-auth`

#### API Mapping

| Old Method            | New Method            | Notes                        |
| --------------------- | --------------------- | ---------------------------- |
| `checkBiometry()`     | `isAvailable()`       | Returns structured result    |
| `authenticate()`      | `authenticate()`      | Similar but enhanced options |
| `setBiometryType()`   | Auto-detected         | No manual setting needed     |
| `deleteCredentials()` | `deleteCredentials()` | Same functionality           |

#### Code Migration Example

```typescript
// Old implementation
import { BiometricAuth as OldBiometric } from '@aparajita/capacitor-biometric-auth';

class OldAuthService {
  async login() {
    const check = await OldBiometric.checkBiometry();

    if (check.isAvailable) {
      try {
        await OldBiometric.authenticate({
          reason: 'Please authenticate',
          cancelTitle: 'Cancel',
          fallbackTitle: 'Use Passcode',
          iosFallbackTitle: 'Use Passcode',
        });

        // Success
      } catch (error) {
        if (error.code === BiometryErrorType.userCancel) {
          // Cancelled
        }
      }
    }
  }
}

// New implementation
import { BiometricAuth } from 'capacitor-biometric-authentication';

class NewAuthService {
  async login() {
    const { isAvailable } = await BiometricAuth.isAvailable();

    if (isAvailable) {
      try {
        await BiometricAuth.authenticate({
          reason: 'Please authenticate',
          cancelButtonTitle: 'Cancel',
          fallbackButtonTitle: 'Use Passcode',
          iosOptions: {
            localizedFallbackTitle: 'Use Passcode',
          },
        });

        // Success
      } catch (error: any) {
        if (error.code === BiometricErrorCode.USER_CANCELLED) {
          // Cancelled
        }
      }
    }
  }
}
```

### From `cordova-plugin-fingerprint-aio`

#### For Capacitor Migration

If migrating from Cordova to Capacitor:

```typescript
// Old: Cordova plugin
declare var Fingerprint: any;

Fingerprint.isAvailable(
  (result) => {
    if (result.isAvailable) {
      Fingerprint.show(
        {
          title: 'Biometric Authentication',
          subtitle: 'Authenticate to continue',
          description: 'Place your finger on the sensor',
          fallbackButtonTitle: 'Use Backup',
          disableBackup: false,
        },
        successCallback,
        errorCallback
      );
    }
  },
  (error) => console.error(error)
);

// New: Capacitor plugin
import { BiometricAuth } from 'capacitor-biometric-authentication';

async function authenticate() {
  const { isAvailable } = await BiometricAuth.isAvailable();

  if (isAvailable) {
    try {
      const result = await BiometricAuth.authenticate({
        reason: 'Authenticate to continue',
        fallbackButtonTitle: 'Use Backup',
        disableBackup: false,
        androidOptions: {
          promptInfo: {
            title: 'Biometric Authentication',
            subtitle: 'Authenticate to continue',
            description: 'Place your finger on the sensor',
          },
        },
      });

      if (result.isAuthenticated) {
        // Success
      }
    } catch (error) {
      // Error handling
    }
  }
}
```

## Feature Comparison

### Core Features

| Feature            | capacitor-native-biometric | @aparajita/capacitor-biometric-auth | capacitor-biometric-authentication |
| ------------------ | -------------------------- | ----------------------------------- | ---------------------------------- |
| iOS Support        | ✅                         | ✅                                  | ✅                                 |
| Android Support    | ✅                         | ✅                                  | ✅                                 |
| Web Support        | ❌                         | ❌                                  | ✅                                 |
| TypeScript         | ✅                         | ✅                                  | ✅                                 |
| Session Management | ❌                         | ❌                                  | ✅                                 |
| Error Codes        | Limited                    | ✅                                  | ✅ Enhanced                        |
| UI Customization   | Basic                      | ✅                                  | ✅ Enhanced                        |
| Credential Storage | ✅                         | ✅                                  | ✅ Enhanced                        |

### Platform Features

| Feature                  | Other Plugins | capacitor-biometric-authentication |
| ------------------------ | ------------- | ---------------------------------- |
| WebAuthn Support         | ❌            | ✅                                 |
| Android StrongBox        | ❌            | ✅                                 |
| iOS Keychain Groups      | Limited       | ✅                                 |
| Platform-specific Config | Limited       | ✅ Full                            |

## Migration Strategies

### 1. Gradual Migration

Implement a wrapper to support both plugins during migration:

```typescript
// BiometricWrapper.ts
import { BiometricAuth as NewBiometric } from 'capacitor-biometric-authentication';
import { NativeBiometric as OldBiometric } from 'capacitor-native-biometric';

export class BiometricWrapper {
  private useNewPlugin = true; // Feature flag

  async isAvailable(): Promise<boolean> {
    if (this.useNewPlugin) {
      const result = await NewBiometric.isAvailable();
      return result.isAvailable;
    } else {
      const result = await OldBiometric.isAvailable();
      return result.isAvailable;
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    if (this.useNewPlugin) {
      try {
        const result = await NewBiometric.authenticate({ reason });
        return result.isAuthenticated;
      } catch (error) {
        return false;
      }
    } else {
      try {
        await OldBiometric.verifyIdentity({ reason });
        return true;
      } catch (error) {
        return false;
      }
    }
  }
}
```

### 2. Direct Migration

For smaller apps, migrate all at once:

```typescript
// 1. Uninstall old plugin
npm uninstall capacitor-native-biometric

// 2. Install new plugin
npm install capacitor-biometric-authentication

// 3. Update all imports
// Find and replace across your codebase

// 4. Update method calls
// Use the mappings provided above

// 5. Sync and test
npx cap sync
```

### 3. Feature-by-Feature Migration

Migrate features incrementally:

```typescript
class MigrationService {
  // Phase 1: Basic authentication
  async migrateBasicAuth() {
    // Replace isAvailable checks
    const { isAvailable } = await BiometricAuth.isAvailable();

    // Replace authenticate calls
    if (isAvailable) {
      await BiometricAuth.authenticate({
        reason: 'Authenticate to continue',
      });
    }
  }

  // Phase 2: Add enhanced features
  async addEnhancedFeatures() {
    // Add session management
    await BiometricAuth.configure({
      sessionDuration: 1800000,
      enableLogging: true,
    });

    // Add platform-specific options
    await BiometricAuth.authenticate({
      reason: 'Sign in',
      androidOptions: {
        promptInfo: {
          title: 'Biometric Login',
          subtitle: 'Use your fingerprint',
        },
      },
    });
  }

  // Phase 3: Add web support
  async addWebSupport() {
    if (Capacitor.getPlatform() === 'web') {
      await BiometricAuth.configure({
        webConfig: {
          rpId: 'example.com',
          rpName: 'My App',
        },
      });
    }
  }
}
```

## Data Migration

### Credential Migration

When migrating, users may need to re-enroll biometrics:

```typescript
class CredentialMigration {
  async migrateCredentials() {
    try {
      // 1. Check if old credentials exist
      const hasOldCredentials = await this.checkOldCredentials();

      if (hasOldCredentials) {
        // 2. Prompt user to re-authenticate
        const migrated = await this.promptMigration();

        if (migrated) {
          // 3. Clear old credentials
          await this.clearOldCredentials();
        }
      }
    } catch (error) {
      console.error('Credential migration failed:', error);
    }
  }

  private async promptMigration(): Promise<boolean> {
    // Show migration dialog
    const proceed = await this.showMigrationDialog({
      title: 'Security Update',
      message: 'Please re-authenticate to complete the security update.',
      confirmText: 'Continue',
      cancelText: 'Later',
    });

    if (!proceed) return false;

    // Authenticate with new plugin
    try {
      const result = await BiometricAuth.authenticate({
        reason: 'Complete security update',
      });

      return result.isAuthenticated;
    } catch (error) {
      return false;
    }
  }

  private async clearOldCredentials() {
    // Clear old plugin's storage
    localStorage.removeItem('old_biometric_data');
    // Clear other storage as needed
  }
}
```

## Testing Migration

### Migration Test Checklist

```typescript
class MigrationTester {
  async runMigrationTests() {
    const tests = [
      this.testAvailabilityCheck,
      this.testBasicAuthentication,
      this.testErrorHandling,
      this.testUICustomization,
      this.testCredentialStorage,
      this.testSessionManagement,
      this.testPlatformSpecific,
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        consoleLog(`✅ ${test.name} passed`);
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error);
      }
    }
  }

  private async testAvailabilityCheck() {
    const { isAvailable } = await BiometricAuth.isAvailable();
    console.assert(typeof isAvailable === 'boolean');
  }

  private async testBasicAuthentication() {
    const result = await BiometricAuth.authenticate({
      reason: 'Test authentication',
    });
    console.assert('isAuthenticated' in result);
  }

  private async testErrorHandling() {
    try {
      // Force an error by not providing reason
      await BiometricAuth.authenticate({} as any);
    } catch (error: any) {
      console.assert(error.code !== undefined);
    }
  }

  // More test methods...
}
```

## Common Migration Issues

### Issue 1: Different Error Codes

**Problem**: Error codes don't match between plugins.

**Solution**: Create an error mapper:

```typescript
function mapErrorCode(oldError: any): BiometricErrorCode {
  const errorMap: Record<string, BiometricErrorCode> = {
    UserCancel: BiometricErrorCode.USER_CANCELLED,
    UserFallback: BiometricErrorCode.USER_FALLBACK,
    BiometryNotAvailable: BiometricErrorCode.NOT_AVAILABLE,
    BiometryNotEnrolled: BiometricErrorCode.BIOMETRIC_NOT_ENROLLED,
    BiometryLockout: BiometricErrorCode.LOCKOUT,
  };

  return errorMap[oldError] || BiometricErrorCode.UNKNOWN_ERROR;
}
```

### Issue 2: Platform-Specific Code

**Problem**: Old plugin had different APIs per platform.

**Solution**: Use unified API with platform options:

```typescript
// Old: Platform-specific
if (platform === 'ios') {
  await OldPlugin.authenticateIOS(iosOptions);
} else {
  await OldPlugin.authenticateAndroid(androidOptions);
}

// New: Unified with platform options
await BiometricAuth.authenticate({
  reason: 'Authenticate',
  iosOptions: {
    /* iOS specific */
  },
  androidOptions: {
    /* Android specific */
  },
});
```

### Issue 3: Missing Web Support

**Problem**: Old plugin doesn't support web.

**Solution**: Add web-specific handling:

```typescript
if (Capacitor.getPlatform() === 'web') {
  // Use new plugin's web support
  await BiometricAuth.configure({
    webConfig: {
      rpId: window.location.hostname,
      rpName: 'My App',
    },
  });
} else {
  // Native platforms
  await BiometricAuth.authenticate({
    reason: 'Sign in',
  });
}
```

## Post-Migration Checklist

- [ ] All imports updated
- [ ] All method calls migrated
- [ ] Error handling updated
- [ ] Platform-specific code consolidated
- [ ] Web support added (if needed)
- [ ] Session management implemented
- [ ] UI customizations migrated
- [ ] Tests updated and passing
- [ ] Documentation updated
- [ ] Old plugin uninstalled

## Getting Help

If you encounter issues during migration:

1. Check the [API Reference](../api-reference/methods.md)
2. Review [Platform Guides](../platform-guides/overview.md)
3. See [Troubleshooting](../error-handling/troubleshooting.md)
4. Open an issue on [GitHub](https://github.com/aoneahsan/capacitor-biometric-authentication/issues)
