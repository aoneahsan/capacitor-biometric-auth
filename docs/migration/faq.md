# Frequently Asked Questions (FAQ)

## General Questions

### What is biometric authentication?

Biometric authentication uses unique physical characteristics (fingerprint, face, iris) to verify a user's identity. It's more secure and convenient than passwords.

### Which platforms are supported?

The plugin supports:

- **iOS**: 13.0+ (Touch ID, Face ID)
- **Android**: API 23+ / Android 6.0+ (Fingerprint, Face, Iris)
- **Web**: Modern browsers with WebAuthn support (Chrome 67+, Firefox 60+, Safari 14+)

### Do I need special hardware?

Yes, the device must have biometric hardware:

- **iOS**: Touch ID or Face ID capable device
- **Android**: Fingerprint sensor, face recognition, or iris scanner
- **Web**: Platform authenticator (Windows Hello, Touch ID, etc.)

### Is it secure?

Yes! The plugin uses platform-specific secure hardware:

- **iOS**: Secure Enclave and Keychain
- **Android**: Hardware-backed Keystore
- **Web**: WebAuthn with platform authenticators

No biometric data is ever stored or transmitted.

## Implementation Questions

### How do I check if biometric is available?

```typescript
const { isAvailable, reason } = await BiometricAuth.isAvailable();

if (isAvailable) {
  // Biometric is available
} else {
  // Check reason for unavailability
  consoleLog('Not available because:', reason);
}
```

### How do I handle different biometric types?

```typescript
const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();

// Check what's available
const hasFaceID = supportedBiometrics.includes(BiometricType.FACE_ID);
const hasFingerprint = supportedBiometrics.includes(BiometricType.FINGERPRINT);

// Customize UI accordingly
if (hasFaceID) {
  showFaceIDButton();
} else if (hasFingerprint) {
  showFingerprintButton();
}
```

### Can I customize the authentication dialog?

Yes, but customization varies by platform:

```typescript
await BiometricAuth.authenticate({
  reason: 'Sign in to your account',

  // Android customization
  androidOptions: {
    promptInfo: {
      title: 'Biometric Login',
      subtitle: 'Use your fingerprint',
      description: 'Touch the sensor',
      negativeButtonText: 'Cancel',
    },
  },

  // iOS customization (limited)
  iosOptions: {
    localizedFallbackTitle: 'Use Passcode',
  },
});
```

### How do I implement "Remember Me" functionality?

Use the session management feature:

```typescript
// Configure session duration
await BiometricAuth.configure({
  sessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Check if session is still valid
const sessionValid = await checkSession();

if (!sessionValid) {
  // Re-authenticate
  await BiometricAuth.authenticate({
    reason: 'Your session has expired',
  });
}
```

### Can I use both biometric and password?

Yes! Implement a fallback mechanism:

```typescript
try {
  const result = await BiometricAuth.authenticate({
    reason: 'Sign in',
    fallbackButtonTitle: 'Use Password',
  });

  if (result.isAuthenticated) {
    // Biometric success
  }
} catch (error) {
  if (error.code === BiometricErrorCode.USER_FALLBACK) {
    // User chose password
    showPasswordLogin();
  }
}
```

## Platform-Specific Questions

### iOS Questions

**Q: Why does Face ID require a usage description?**

A: iOS requires privacy descriptions for Face ID. Add to `Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID for secure authentication</string>
```

**Q: Can I detect if it's Touch ID or Face ID?**

A: Yes:

```typescript
const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
const isFaceID = supportedBiometrics.includes(BiometricType.FACE_ID);
const isTouchID = supportedBiometrics.includes(BiometricType.TOUCH_ID);
```

**Q: Why doesn't Touch ID work on the simulator?**

A: Use Features > Touch ID > Enrolled in the simulator, then Features > Touch ID > Matching Touch to simulate.

### Android Questions

**Q: What's the minimum Android version?**

A: Android 6.0 (API 23) for fingerprint. Face/Iris recognition requires Android 9.0+ (API 28+).

**Q: How do I test on Android emulator?**

A: Use emulator with API 29+ and configure fingerprint in Settings > Security > Fingerprint.

**Q: Can I require only strong biometrics?**

A: Yes:

```typescript
await BiometricAuth.configure({
  androidConfig: {
    authenticators: BiometricManager.Authenticators.BIOMETRIC_STRONG,
  },
});
```

### Web Questions

**Q: Does it work on all browsers?**

A: WebAuthn support varies:

- Chrome 67+
- Firefox 60+
- Safari 14+
- Edge 18+

**Q: Why does it require HTTPS?**

A: WebAuthn requires a secure context for security reasons. Use HTTPS in production and localhost for development.

**Q: Can I use USB security keys?**

A: The plugin focuses on platform authenticators (built-in biometrics), but WebAuthn supports USB keys too.

## Error Handling Questions

### What do the error codes mean?

| Error Code               | Meaning                  | Solution                           |
| ------------------------ | ------------------------ | ---------------------------------- |
| `USER_CANCELLED`         | User cancelled dialog    | Normal behavior, handle gracefully |
| `AUTHENTICATION_FAILED`  | Biometric not recognized | Allow retry                        |
| `LOCKOUT`                | Too many failed attempts | Wait 30 seconds                    |
| `LOCKOUT_PERMANENT`      | Permanent lockout        | User must unlock device            |
| `BIOMETRIC_NOT_ENROLLED` | No biometrics set up     | Guide to device settings           |
| `NOT_AVAILABLE`          | Hardware not available   | Offer alternative auth             |

### How do I handle lockouts?

```typescript
try {
  await BiometricAuth.authenticate();
} catch (error) {
  if (error.code === BiometricErrorCode.LOCKOUT) {
    // Temporary lockout (30 seconds)
    showMessage('Too many attempts. Please wait 30 seconds.');
    startCountdownTimer(30);
  } else if (error.code === BiometricErrorCode.LOCKOUT_PERMANENT) {
    // Permanent lockout
    showMessage('Biometric locked. Please unlock your device.');
  }
}
```

### What if biometric hardware becomes unavailable?

Handle gracefully with fallbacks:

```typescript
const { isAvailable, reason } = await BiometricAuth.isAvailable();

if (!isAvailable) {
  switch (reason) {
    case 'NO_HARDWARE':
      // No biometric hardware
      usePasswordOnly();
      break;
    case 'BIOMETRIC_UNAVAILABLE':
      // Temporarily unavailable
      showTemporaryMessage();
      break;
  }
}
```

## Security Questions

### Is biometric data stored anywhere?

**No!** The plugin never stores biometric data. It only stores:

- Encrypted credentials (optional)
- Session tokens
- Configuration settings

Biometric matching happens in secure hardware.

### Can someone bypass biometric authentication?

The plugin uses platform security features:

- iOS: Secure Enclave
- Android: Hardware-backed Keystore
- Web: WebAuthn security model

However, always implement additional security for sensitive operations.

### Should I use biometric for payments?

Yes, but with additional security:

```typescript
// High-security transaction
await BiometricAuth.authenticate({
  reason: 'Confirm payment of $100',
  disableBackup: true, // No fallback
  androidOptions: {
    confirmationRequired: true, // Require explicit confirmation
  },
});
```

### How do I handle biometric enrollment changes?

Configure to invalidate on changes:

```typescript
await BiometricAuth.configure({
  androidConfig: {
    invalidatedByBiometricEnrollment: true,
  },
});
```

## Troubleshooting Questions

### Why am I getting "Plugin not implemented"?

1. Run `npx cap sync`
2. Rebuild the native project
3. Check the plugin is properly installed

### Why does authentication always fail?

Common causes:

1. Testing on simulator/emulator (use real device)
2. No biometrics enrolled
3. Corrupted credentials (call `deleteCredentials()`)

### Why is the dialog not showing?

Check:

1. App is in foreground
2. Biometric is available
3. No other authentication in progress

### How do I debug issues?

Enable logging:

```typescript
await BiometricAuth.configure({
  enableLogging: true,
});

// Check platform-specific logs:
// iOS: Xcode console
// Android: adb logcat | grep BiometricAuth
// Web: Browser console
```

## Performance Questions

### Is biometric authentication fast?

Yes! Typical authentication takes:

- Touch ID: ~500ms
- Face ID: ~1000ms
- Android Fingerprint: ~500ms
- WebAuthn: 1-3 seconds

### How can I improve performance?

1. **Cache availability checks**:

```typescript
let cachedAvailability = null;

async function checkAvailability() {
  if (cachedAvailability === null) {
    const result = await BiometricAuth.isAvailable();
    cachedAvailability = result.isAvailable;
  }
  return cachedAvailability;
}
```

2. **Use session management** to reduce authentication frequency

3. **Preload configuration** on app start

### Does it affect app size?

Minimal impact:

- iOS: ~100KB (uses system frameworks)
- Android: ~200KB (includes AndroidX Biometric)
- Web: ~50KB (uses browser APIs)

## Best Practices Questions

### When should I use biometric authentication?

Good use cases:

- App login
- Authorizing transactions
- Accessing sensitive data
- Quick re-authentication

Not recommended for:

- First-time registration
- Password recovery
- Shared devices

### How often should users re-authenticate?

Depends on security requirements:

- Banking: 5-10 minutes
- Shopping: 30-60 minutes
- Social: 1-7 days

### Should I force biometric authentication?

No! Always provide alternatives:

```typescript
await BiometricAuth.authenticate({
  reason: 'Sign in',
  fallbackButtonTitle: 'Use Password',
  disableBackup: false, // Allow fallback
});
```

### How do I handle user privacy concerns?

1. Explain that no biometric data is stored
2. Make biometric optional
3. Provide clear privacy information
4. Allow users to disable biometric anytime

## Need More Help?

- 📖 Read the [complete documentation](../README.md)
- 💬 Open a [GitHub discussion](https://github.com/aoneahsan/capacitor-biometric-authentication/discussions)
- 🐛 Report [issues](https://github.com/aoneahsan/capacitor-biometric-authentication/issues)
- 📧 Contact support (if available)
