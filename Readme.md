# Capacitor Biometric Auth Plugin

A comprehensive biometric authentication plugin for Capacitor that provides secure, type-safe, and framework-independent biometric authentication across Android, iOS, and Web platforms.

## Features

- 🔐 **Multi-platform Support**: Works on Android, iOS, and Web
- 📱 **Multiple Biometric Types**: Fingerprint, Face ID, Touch ID, and more
- 🌐 **Web Authentication API**: Modern WebAuthn implementation for browsers
- 🔒 **Secure Session Management**: Built-in session handling with configurable duration
- 🎨 **Customizable UI**: Configure colors, text, and appearance
- 🔧 **Framework Independent**: Use with any JavaScript framework
- 📝 **Full TypeScript Support**: Complete type definitions included
- 🔄 **Fallback Options**: Passcode, pattern, PIN alternatives

## Installation

```bash
npm install @capacitor-community/biometric-auth
npx cap sync
```

## Basic Usage

```typescript
import { BiometricAuth } from '@capacitor-community/biometric-auth';

// Check if biometric authentication is available
const checkBiometric = async () => {
  const result = await BiometricAuth.isAvailable();
  if (result.available) {
    console.log('Biometric authentication is available');
  } else {
    console.log('Not available:', result.reason);
  }
};

// Authenticate user
const authenticate = async () => {
  try {
    const result = await BiometricAuth.authenticate({
      title: 'Authenticate',
      subtitle: 'Access your account',
      description: 'Place your finger on the sensor',
      fallbackButtonTitle: 'Use Passcode',
      cancelButtonTitle: 'Cancel',
    });

    if (result.success) {
      console.log('Authentication successful!');
      console.log('Session ID:', result.sessionId);
      console.log('Token:', result.token);
    } else {
      console.error('Authentication failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## API

### `isAvailable()`

Check if biometric authentication is available on the device.

```typescript
const result = await BiometricAuth.isAvailable();
// Returns: { available: boolean, reason?: string, errorMessage?: string }
```

### `getSupportedBiometrics()`

Get the list of supported biometric authentication types.

```typescript
const result = await BiometricAuth.getSupportedBiometrics();
// Returns: { biometrics: BiometricType[] }
```

### `authenticate(options?)`

Perform biometric authentication.

```typescript
const result = await BiometricAuth.authenticate({
  title: 'Authenticate',
  subtitle: 'Access your secure data',
  description: 'Use biometric authentication',
  fallbackButtonTitle: 'Use Passcode',
  cancelButtonTitle: 'Cancel',
  disableFallback: false,
  maxAttempts: 3,
  saveCredentials: true,
});
```

### `deleteCredentials()`

Delete stored biometric credentials.

```typescript
await BiometricAuth.deleteCredentials();
```

### `configure(config)`

Set plugin configuration.

```typescript
await BiometricAuth.configure({
  sessionDuration: 3600, // 1 hour in seconds
  encryptionSecret: 'your-secret-key',
  requireAuthenticationForEveryAccess: false,
  uiConfig: {
    primaryColor: '#007AFF',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
  },
  fallbackMethods: ['passcode', 'password'],
});
```

## Configuration Options

### BiometricAuthConfig

| Option                                | Type                | Description                  | Default |
| ------------------------------------- | ------------------- | ---------------------------- | ------- |
| `sessionDuration`                     | `number`            | Session validity in seconds  | 3600    |
| `encryptionSecret`                    | `string`            | Secret key for encryption    | -       |
| `requireAuthenticationForEveryAccess` | `boolean`           | Require auth for each access | false   |
| `uiConfig`                            | `BiometricUIConfig` | UI customization options     | -       |
| `fallbackMethods`                     | `FallbackMethod[]`  | Available fallback methods   | []      |

### BiometricAuthOptions

| Option                | Type      | Description                 | Default |
| --------------------- | --------- | --------------------------- | ------- |
| `title`               | `string`  | Prompt title                | -       |
| `subtitle`            | `string`  | Prompt subtitle             | -       |
| `description`         | `string`  | Prompt description          | -       |
| `fallbackButtonTitle` | `string`  | Fallback button text        | -       |
| `cancelButtonTitle`   | `string`  | Cancel button text          | -       |
| `disableFallback`     | `boolean` | Disable fallback option     | false   |
| `maxAttempts`         | `number`  | Max failed attempts         | 3       |
| `saveCredentials`     | `boolean` | Save credentials for future | false   |

## Platform-Specific Implementation

### Android

Uses the BiometricPrompt API for secure authentication. Requires:

- Android 6.0 (API 23) or higher
- Biometric hardware (fingerprint sensor, face recognition)

### iOS

Uses the LocalAuthentication framework. Supports:

- Touch ID (iPhone 5s and later)
- Face ID (iPhone X and later)
- Requires iOS 11.0 or higher

### Web

Implements the Web Authentication API (WebAuthn) for biometric authentication in browsers. Supports:

- Platform authenticators (Windows Hello, Touch ID, etc.)
- Requires HTTPS connection
- Modern browsers with WebAuthn support

## Error Handling

The plugin provides detailed error information through the `BiometricAuthError` interface:

```typescript
interface BiometricAuthError {
  code: BiometricErrorCode;
  message: string;
  details?: any;
}
```

Error codes include:

- `authenticationFailed`: Authentication attempt failed
- `userCancelled`: User cancelled the authentication
- `systemCancelled`: System cancelled the authentication
- `notAvailable`: Biometric authentication not available
- `permissionDenied`: Permission to use biometric denied
- `lockedOut`: Too many failed attempts
- `notEnrolled`: No biometric data enrolled

## Example App

Check out the `example/` directory for a complete React application demonstrating all features of the plugin.

```bash
cd example
npm install
npm run dev
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

MIT

## Credits

Created by [Ahsan Mahmood](https://aoneahsan.com) for the Capacitor Community.
