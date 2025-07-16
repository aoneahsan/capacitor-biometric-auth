# iOS Platform Guide

This guide covers iOS-specific implementation details, requirements, and best practices for the `capacitor-biometric-authentication` plugin.

## Requirements

### Minimum Requirements

- **iOS Version**: 13.0+
- **Xcode**: 15.0+
- **Swift**: 5.0+
- **Capacitor**: 6.0+

### Supported Biometric Types

| Device | Biometric Type | iOS Version |
|--------|----------------|-------------|
| iPhone 5S - iPhone 8 | Touch ID | iOS 8.0+ |
| iPhone X and later | Face ID | iOS 11.0+ |
| iPad Air 2 and later | Touch ID | iOS 8.0+ |
| iPad Pro 2018 and later | Face ID | iOS 12.0+ |

## Setup and Configuration

### 1. Info.plist Configuration

Add Face ID usage description to `ios/App/App/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID for secure authentication</string>
```

This is **required** for Face ID. Without it, your app will crash when attempting to use Face ID.

### 2. Capabilities

No special capabilities or entitlements are required. The LocalAuthentication framework is available by default.

### 3. Pod Installation

The plugin is automatically installed via CocoaPods:

```bash
cd ios && pod install
```

If you encounter issues:
```bash
cd ios
pod repo update
pod install --repo-update
```

## iOS-Specific Features

### LocalAuthentication Framework

The plugin uses Apple's LocalAuthentication framework which provides:

- Unified API for Touch ID and Face ID
- Secure enclave integration
- Keychain Services integration
- Privacy-preserving authentication

### Biometry Type Detection

Detect whether the device uses Touch ID or Face ID:

```typescript
const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();

if (supportedBiometrics.includes(BiometricType.FACE_ID)) {
  console.log('Device uses Face ID');
} else if (supportedBiometrics.includes(BiometricType.TOUCH_ID)) {
  console.log('Device uses Touch ID');
}
```

### Customizing Authentication

Use `iosOptions` for iOS-specific customization:

```typescript
const result = await BiometricAuth.authenticate({
  reason: 'Unlock your account',
  iosOptions: {
    localizedFallbackTitle: 'Enter Passcode',
    biometryType: 'faceID' // or 'touchID'
  }
});
```

## Keychain Integration

### Secure Storage

The plugin uses iOS Keychain for secure credential storage:

```typescript
await BiometricAuth.configure({
  iosConfig: {
    accessGroup: 'group.com.yourcompany.yourapp', // For app extensions
    touchIDAuthenticationAllowableReuseDuration: 10 // Seconds
  }
});
```

### Access Groups

Share credentials between your app and extensions:

```typescript
// Configure shared keychain access
await BiometricAuth.configure({
  iosConfig: {
    accessGroup: 'group.com.yourcompany.sharedkeychain'
  }
});
```

Ensure your app's entitlements include the keychain access group:

```xml
<!-- App.entitlements -->
<key>keychain-access-groups</key>
<array>
  <string>$(AppIdentifierPrefix)group.com.yourcompany.sharedkeychain</string>
</array>
```

## Face ID vs Touch ID

### UI Differences

Customize UI based on biometric type:

```typescript
async function setupBiometricUI() {
  const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
  
  if (supportedBiometrics.includes(BiometricType.FACE_ID)) {
    // Face ID specific UI
    setBiometricIcon('face-id-icon.png');
    setBiometricText('Sign in with Face ID');
  } else if (supportedBiometrics.includes(BiometricType.TOUCH_ID)) {
    // Touch ID specific UI
    setBiometricIcon('touch-id-icon.png');
    setBiometricText('Sign in with Touch ID');
  }
}
```

### Authentication Duration

Configure Touch ID authentication reuse:

```typescript
await BiometricAuth.configure({
  iosConfig: {
    // Allow Touch ID authentication to be reused for 30 seconds
    touchIDAuthenticationAllowableReuseDuration: 30
  }
});
```

**Note**: This setting only applies to Touch ID. Face ID always requires fresh authentication.

## Error Handling

### iOS-Specific Error Codes

```typescript
try {
  await BiometricAuth.authenticate(options);
} catch (error) {
  switch (error.code) {
    case LAError.authenticationFailed:
      // Biometric didn't match
      console.log('Authentication failed');
      break;
      
    case LAError.userCancel:
      // User tapped Cancel
      console.log('User cancelled');
      break;
      
    case LAError.userFallback:
      // User tapped fallback button
      console.log('User selected fallback');
      showPasswordLogin();
      break;
      
    case LAError.biometryNotAvailable:
      // Biometric temporarily unavailable
      console.log('Biometry not available');
      break;
      
    case LAError.biometryNotEnrolled:
      // No biometrics enrolled
      promptToEnrollBiometrics();
      break;
      
    case LAError.biometryLockout:
      // Too many failed attempts
      console.log('Biometry locked out');
      showPasscodeOption();
      break;
      
    case LAError.appCancel:
      // App cancelled authentication
      console.log('App cancelled');
      break;
      
    case LAError.invalidContext:
      // LAContext was invalid
      console.log('Invalid context');
      break;
  }
}
```

### Handling Lockouts

iOS implements biometric lockouts after failed attempts:

```typescript
async function handleiOSLockout() {
  try {
    await BiometricAuth.authenticate();
  } catch (error) {
    if (error.code === LAError.biometryLockout) {
      // Biometry is locked
      // User must unlock device with passcode
      showMessage('Too many failed attempts. Please use your passcode.');
      
      // Offer passcode authentication
      await BiometricAuth.authenticate({
        disableBackup: false,
        fallbackButtonTitle: 'Use Passcode'
      });
    }
  }
}
```

## Best Practices

### 1. Check for Face ID Permission

Always check Face ID availability and permissions:

```typescript
async function checkFaceIDPermission() {
  const { isAvailable, reason } = await BiometricAuth.isAvailable();
  
  if (!isAvailable && reason === 'NO_ENROLLED_BIOMETRICS') {
    // Guide user to Settings
    showMessage('Please enroll Face ID in Settings > Face ID & Passcode');
  }
}
```

### 2. Handle App Lifecycle

React to app lifecycle events:

```typescript
// Handle app becoming active
App.addListener('appStateChange', async ({ isActive }) => {
  if (isActive && requiresAuthentication) {
    // Re-authenticate when app becomes active
    await BiometricAuth.authenticate({
      reason: 'Please authenticate to continue'
    });
  }
});
```

### 3. Localization

Provide localized strings for better user experience:

```typescript
const localizedStrings = {
  'en': {
    reason: 'Authenticate to access your account',
    fallback: 'Use Passcode'
  },
  'es': {
    reason: 'Autentícate para acceder a tu cuenta',
    fallback: 'Usar código'
  },
  'fr': {
    reason: 'Authentifiez-vous pour accéder à votre compte',
    fallback: 'Utiliser le code'
  }
};

await BiometricAuth.authenticate({
  reason: localizedStrings[currentLanguage].reason,
  fallbackButtonTitle: localizedStrings[currentLanguage].fallback
});
```

### 4. Privacy Considerations

- Never store biometric data
- Use generic error messages
- Clear authentication state on logout

```typescript
async function logout() {
  // Clear all biometric data
  await BiometricAuth.deleteCredentials();
  
  // Clear session
  clearUserSession();
  
  // Navigate to login
  navigateToLogin();
}
```

## Advanced Features

### Policy Evaluation

Check if biometric authentication can be used:

```typescript
// Internal implementation
let context = LAContext()
var error: NSError?

let canEvaluate = context.canEvaluatePolicy(
  .deviceOwnerAuthenticationWithBiometrics,
  error: &error
)

if canEvaluate {
  // Biometrics available
} else {
  // Check error for reason
}
```

### Custom Authentication Context

The plugin manages LAContext internally for security:

```swift
// Internal implementation
let context = LAContext()
context.localizedFallbackTitle = options.fallbackButtonTitle
context.localizedCancelTitle = options.cancelButtonTitle

// Evaluate policy
context.evaluatePolicy(
  .deviceOwnerAuthenticationWithBiometrics,
  localizedReason: options.reason
) { success, error in
  // Handle result
}
```

## Testing

### Simulator Testing

Face ID can be tested in the iOS Simulator:

1. Open Simulator
2. Go to Features > Face ID > Enrolled
3. Use Features > Face ID > Matching/Non-matching Face

Touch ID testing in Simulator:
1. Features > Touch ID > Enrolled
2. Features > Touch ID > Matching/Non-matching Touch

### Real Device Testing

Always test on real devices for:

- Actual biometric performance
- Hardware-specific behaviors
- Real-world error scenarios
- Performance characteristics

### Test Scenarios

1. **Enrollment States**
   - No biometrics enrolled
   - Single biometric enrolled
   - Multiple biometrics enrolled

2. **Authentication Scenarios**
   - Successful authentication
   - Failed authentication
   - Cancelled authentication
   - Fallback selection

3. **Edge Cases**
   - App backgrounding during authentication
   - Device rotation (iPad)
   - Low battery conditions
   - Accessibility features enabled

## Performance Optimization

### 1. Context Reuse

The plugin optimizes LAContext usage:

```typescript
// Check availability once and cache
let biometricAvailable = false;

async function initBiometric() {
  const { isAvailable } = await BiometricAuth.isAvailable();
  biometricAvailable = isAvailable;
}

// Use cached value
function showLoginOptions() {
  if (biometricAvailable) {
    showBiometricOption();
  }
}
```

### 2. Keychain Access Optimization

```typescript
// Configure for optimal performance
await BiometricAuth.configure({
  iosConfig: {
    // Reuse authentication for 60 seconds (Touch ID only)
    touchIDAuthenticationAllowableReuseDuration: 60
  }
});
```

## Troubleshooting

### Common Issues

1. **"Face ID is not available"**
   - Check Info.plist for NSFaceIDUsageDescription
   - Verify Face ID is enrolled
   - Check if app has Face ID permission

2. **Keychain errors (-25300)**
   - Check keychain access groups
   - Verify entitlements
   - Clear keychain data and retry

3. **Context errors**
   - Ensure authentication happens on main thread
   - Don't reuse LAContext after cancellation

### Debug Tips

Enable verbose logging:

```typescript
await BiometricAuth.configure({
  enableLogging: true
});

// View logs in Xcode console
```

Check system logs:
```bash
# View device logs
xcrun simctl spawn booted log stream --level debug | grep BiometricAuth
```

## Migration Guide

### From Touch ID to Biometric

If migrating from Touch ID-only implementation:

```typescript
// Old Touch ID only
let context = LAContext()
context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, ...)

// New unified biometric (handled by plugin)
await BiometricAuth.authenticate({
  reason: 'Authenticate to continue'
});
```

### Supporting Older iOS Versions

For iOS < 13.0 support:

```swift
if #available(iOS 13.0, *) {
  // Use full features
} else {
  // Fallback for older versions
  // Plugin handles this automatically
}
```

## Security Best Practices

### 1. Secure Enclave Usage

The plugin leverages Secure Enclave when available:

```typescript
// Automatically uses Secure Enclave for key operations
await BiometricAuth.configure({
  encryptionKey: 'auto' // Uses Secure Enclave-backed key
});
```

### 2. Keychain Security

Configure keychain item security:

```swift
// Internal implementation
let query: [String: Any] = [
  kSecClass: kSecClassGenericPassword,
  kSecAttrAccount: account,
  kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
  kSecUseAuthenticationContext: context
]
```

### 3. Data Protection

Ensure proper data protection:

```typescript
// Data is automatically protected with these attributes:
// - kSecAttrAccessibleWhenUnlockedThisDeviceOnly
// - Requires user authentication
// - Invalidated on biometric changes
```

## Resources

- [LocalAuthentication Framework](https://developer.apple.com/documentation/localauthentication)
- [Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Face ID Best Practices](https://developer.apple.com/design/human-interface-guidelines/face-id)
- [Touch ID Best Practices](https://developer.apple.com/design/human-interface-guidelines/touch-id)