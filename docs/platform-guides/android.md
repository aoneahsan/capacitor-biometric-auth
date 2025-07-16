# Android Platform Guide

This guide covers Android-specific implementation details, requirements, and best practices for the `capacitor-biometric-authentication` plugin.

## Requirements

### Minimum Requirements

- **Android API Level**: 23 (Android 6.0 Marshmallow)
- **Target API Level**: 34 (Android 14) or latest
- **Gradle**: 7.0+
- **Capacitor**: 6.0+

### Supported Biometric Types

| Android Version | Available Biometrics |
|----------------|---------------------|
| 6.0 - 8.1 | Fingerprint only |
| 9.0+ | Fingerprint, Face, Iris |
| 10.0+ | All biometrics + BiometricPrompt API |

## Setup and Configuration

### 1. Gradle Configuration

The plugin automatically configures necessary dependencies. Verify your `android/variables.gradle`:

```gradle
ext {
    minSdkVersion = 23
    compileSdkVersion = 34
    targetSdkVersion = 34
}
```

### 2. Permissions

The plugin automatically adds this permission to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

For Android 6.0-8.1 compatibility, it also includes:
```xml
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

### 3. ProGuard Rules

If using R8/ProGuard, the plugin includes these rules automatically:

```proguard
# BiometricPrompt
-keep class androidx.biometric.** { *; }

# Capacitor Biometric Plugin
-keep class com.aoneahsan.capacitor.biometricauth.** { *; }
```

## Android-Specific Features

### BiometricPrompt API

The plugin uses the modern BiometricPrompt API which provides:

- Unified UI across all Android devices
- Automatic fallback to device credentials
- Hardware-backed security
- Better user experience

### Customizing the Authentication Dialog

Use `androidOptions` to customize the BiometricPrompt dialog:

```typescript
const result = await BiometricAuth.authenticate({
  reason: 'Authenticate to continue',
  androidOptions: {
    promptInfo: {
      title: 'Biometric Authentication',
      subtitle: 'Use your fingerprint or face',
      description: 'Place your finger on the sensor or look at the camera',
      negativeButtonText: 'Use PIN'
    }
  }
});
```

### Dialog Customization Options

| Option | Description | Default |
|--------|-------------|---------|
| `title` | Main title of the dialog | "Biometric Authentication" |
| `subtitle` | Subtitle below the title | null |
| `description` | Additional description text | null |
| `negativeButtonText` | Text for the cancel/fallback button | "Cancel" |

### Security Features

#### 1. Encryption

Enable strong encryption for stored credentials:

```typescript
await BiometricAuth.authenticate({
  androidOptions: {
    encryptionRequired: true // Default: true
  }
});
```

#### 2. User Confirmation

Require explicit user confirmation after biometric authentication:

```typescript
await BiometricAuth.authenticate({
  androidOptions: {
    confirmationRequired: true // Default: false
  }
});
```

#### 3. Hardware-Backed Keys

Configure hardware security module usage:

```typescript
await BiometricAuth.configure({
  androidConfig: {
    strongBoxBacked: true, // Use HSM if available
    userAuthenticationRequired: true,
    invalidatedByBiometricEnrollment: true
  }
});
```

## Android Keystore Integration

The plugin uses Android Keystore for secure credential storage:

### Key Generation

```typescript
await BiometricAuth.configure({
  androidConfig: {
    keystoreAlias: 'MyAppBiometricKey', // Custom alias
    userAuthenticationRequired: true,   // Require auth to use key
    invalidatedByBiometricEnrollment: true // Invalidate on new fingerprint
  }
});
```

### Security Considerations

1. **Key Invalidation**: Keys are invalidated when new biometrics are enrolled
2. **User Authentication**: Keys require biometric authentication to use
3. **Hardware Backing**: Keys are stored in secure hardware when available

## Handling Different Android Versions

### Android 6.0 - 8.1 (API 23-27)

Uses FingerprintManager (deprecated but supported):

```typescript
// The plugin automatically handles this internally
if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
  // Uses FingerprintManager
} else {
  // Uses BiometricPrompt
}
```

### Android 9.0+ (API 28+)

Uses BiometricPrompt for all biometric types:

```typescript
// Full BiometricPrompt features available
const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
// May include: FINGERPRINT, FACE, IRIS
```

### Android 11+ (API 30+)

Additional security features:

```typescript
await BiometricAuth.configure({
  androidConfig: {
    // Biometric authentication strength
    authenticators: BiometricManager.Authenticators.BIOMETRIC_STRONG
  }
});
```

## Error Handling

### Android-Specific Error Codes

```typescript
try {
  await BiometricAuth.authenticate(options);
} catch (error) {
  switch (error.code) {
    case 'HARDWARE_NOT_PRESENT':
      // No biometric hardware
      break;
    case 'HARDWARE_UNAVAILABLE':
      // Hardware temporarily unavailable
      break;
    case 'LOCKOUT':
      // Too many attempts (30 seconds)
      break;
    case 'LOCKOUT_PERMANENT':
      // Requires device unlock
      break;
    case 'NO_SPACE':
      // Not enough storage
      break;
    case 'CANCELED':
      // Operation canceled
      break;
    case 'TIMEOUT':
      // Operation timed out
      break;
    case 'VENDOR_ERROR':
      // Vendor-specific error
      break;
  }
}
```

### Handling Lockouts

```typescript
async function handleBiometricLockout() {
  try {
    await BiometricAuth.authenticate();
  } catch (error) {
    if (error.code === 'LOCKOUT') {
      // Wait 30 seconds
      setTimeout(() => {
        // Retry authentication
      }, 30000);
    } else if (error.code === 'LOCKOUT_PERMANENT') {
      // Prompt user to unlock device
      showMessage('Please unlock your device to reset biometric');
    }
  }
}
```

## Best Practices

### 1. Check Biometric Enrollment

Always verify biometrics are enrolled:

```typescript
const { isAvailable, reason } = await BiometricAuth.isAvailable();

if (reason === 'NO_ENROLLED_BIOMETRICS') {
  // Guide user to Settings
  const intent = new Intent(Settings.ACTION_BIOMETRIC_ENROLL);
  startActivity(intent);
}
```

### 2. Provide Clear UI Feedback

```typescript
// Show appropriate icons based on available biometrics
const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();

if (supportedBiometrics.includes('FINGERPRINT')) {
  showFingerprintIcon();
} else if (supportedBiometrics.includes('FACE')) {
  showFaceIcon();
}
```

### 3. Handle Background/Foreground Transitions

```typescript
// Authentication is automatically cancelled when app goes to background
document.addEventListener('resume', async () => {
  // Re-authenticate if needed
  if (needsAuthentication()) {
    await BiometricAuth.authenticate();
  }
});
```

### 4. Test on Multiple Devices

Test on devices with different biometric hardware:

- Fingerprint-only devices
- Face unlock devices
- Devices with in-display fingerprint sensors
- Devices with ultrasonic fingerprint sensors

## Storage and Persistence

### SharedPreferences

The plugin stores encrypted data in SharedPreferences:

```kotlin
// Internal implementation
val prefs = context.getSharedPreferences(
  "BiometricAuthPrefs", 
  Context.MODE_PRIVATE
)
```

### Clearing Data

```typescript
// Clear all stored credentials
await BiometricAuth.deleteCredentials();

// This removes:
// - Keystore entries
// - SharedPreferences data
// - Session information
```

## Advanced Configuration

### Custom Authenticators

```typescript
await BiometricAuth.configure({
  androidConfig: {
    // Use only strong biometrics
    authenticators: BiometricManager.Authenticators.BIOMETRIC_STRONG,
    
    // Or allow device credential fallback
    authenticators: BiometricManager.Authenticators.BIOMETRIC_WEAK | 
                   BiometricManager.Authenticators.DEVICE_CREDENTIAL
  }
});
```

### Crypto Object Usage

For advanced security, the plugin uses CryptoObject:

```typescript
// The plugin handles this internally
// Creates a cipher for encryption/decryption
const cipher = Cipher.getInstance(
  KeyProperties.KEY_ALGORITHM_AES + "/" +
  KeyProperties.BLOCK_MODE_CBC + "/" +
  KeyProperties.ENCRYPTION_PADDING_PKCS7
);
```

## Testing

### Emulator Testing

BiometricPrompt can be tested on emulators (API 29+):

1. Open emulator settings
2. Navigate to Security > Fingerprint
3. Enroll a fingerprint
4. Use extended controls to simulate fingerprint

### Real Device Testing

Always test on real devices for:

- Different biometric types
- Hardware variations
- Performance characteristics
- Error scenarios

### Test Scenarios

1. **Happy Path**
   - Enrolled biometrics
   - Successful authentication

2. **Error Cases**
   - No enrolled biometrics
   - Failed authentication attempts
   - Lockout scenarios
   - Hardware unavailable

3. **Edge Cases**
   - App backgrounding during auth
   - Device rotation during dialog
   - Low memory conditions

## Migration from FingerprintManager

If migrating from older implementations:

```typescript
// Old (FingerprintManager)
fingerprintManager.authenticate(cryptoObject, cancellationSignal, 0, callback, null);

// New (BiometricPrompt) - handled automatically by the plugin
await BiometricAuth.authenticate({
  reason: 'Authenticate to continue'
});
```

## Performance Optimization

### 1. Minimize Keystore Operations

```typescript
// Cache authentication state
let isAuthenticated = false;
let authTime = Date.now();

async function checkAuth() {
  // Reuse recent authentication
  if (isAuthenticated && Date.now() - authTime < 300000) {
    return true;
  }
  
  // Re-authenticate
  const result = await BiometricAuth.authenticate();
  isAuthenticated = result.isAuthenticated;
  authTime = Date.now();
  return isAuthenticated;
}
```

### 2. Preload Biometric Availability

```typescript
// Check availability on app start
let biometricStatus = null;

async function initializeBiometric() {
  biometricStatus = await BiometricAuth.isAvailable();
}

// Use cached status
function showLoginOptions() {
  if (biometricStatus?.isAvailable) {
    showBiometricButton();
  }
}
```

## Troubleshooting

### Common Issues

1. **"Biometric not recognized" repeatedly**
   - Clean the sensor
   - Re-enroll biometrics
   - Check for hardware issues

2. **Dialog not showing**
   - Verify biometrics are enrolled
   - Check Android version
   - Ensure app is in foreground

3. **Keystore errors**
   - Clear app data
   - Re-install app
   - Check available storage

### Debug Logging

Enable logging for troubleshooting:

```typescript
await BiometricAuth.configure({
  enableLogging: true
});

// Check logcat:
// adb logcat | grep BiometricAuth
```

## Resources

- [Android BiometricPrompt Documentation](https://developer.android.com/reference/androidx/biometric/BiometricPrompt)
- [Android Keystore Documentation](https://developer.android.com/training/articles/keystore)
- [Biometric Security Best Practices](https://developer.android.com/training/sign-in/biometric-auth)