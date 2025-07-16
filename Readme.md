# Capacitor Biometric Auth Plugin

A comprehensive biometric authentication plugin for Capacitor that provides secure, type-safe, and framework-independent biometric authentication across Android, iOS, and Web platforms.

## 📚 Documentation

Complete documentation is available in the [`docs/`](./docs/) directory:

- **[📖 Full Documentation](./docs/README.md)** - Start here for comprehensive guides
- **[🚀 Installation Guide](./docs/getting-started/installation.md)** - Detailed setup instructions
- **[⚡ Quick Start](./docs/getting-started/quick-start.md)** - Get running in 5 minutes
- **[📱 Platform Guides](./docs/platform-guides/)** - iOS, Android, and Web specifics
- **[🔧 API Reference](./docs/api-reference/methods.md)** - All methods and types
- **[❓ FAQ](./docs/migration/faq.md)** - Frequently asked questions

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
npm install capacitor-biometric-authentication
npx cap sync
```

For detailed installation instructions, see the [Installation Guide](./docs/getting-started/installation.md).

## Basic Usage

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Check if biometric authentication is available
const checkBiometric = async () => {
  const { isAvailable, reason } = await BiometricAuth.isAvailable();
  if (isAvailable) {
    console.log('Biometric authentication is available');
  } else {
    console.log('Not available:', reason);
  }
};

// Authenticate user
const authenticate = async () => {
  try {
    const result = await BiometricAuth.authenticate({
      reason: 'Please authenticate to access your account',
      fallbackButtonTitle: 'Use Passcode',
      cancelButtonTitle: 'Cancel',
    });

    if (result.isAuthenticated) {
      console.log('Authentication successful!');
    }
  } catch (error) {
    console.error('Authentication failed:', error);
  }
};
```

## API Overview

For complete API documentation, see the [API Reference](./docs/api-reference/methods.md).

### Core Methods

- **[`isAvailable()`](./docs/api-reference/methods.md#isavailable)** - Check if biometric authentication is available
- **[`getSupportedBiometrics()`](./docs/api-reference/methods.md#getsupportedbiometrics)** - Get supported biometric types
- **[`authenticate(options?)`](./docs/api-reference/methods.md#authenticate)** - Perform biometric authentication
- **[`deleteCredentials()`](./docs/api-reference/methods.md#deletecredentials)** - Delete stored credentials
- **[`configure(config)`](./docs/api-reference/methods.md#configure)** - Configure plugin settings

### Quick Examples

```typescript
// Check availability
const { isAvailable } = await BiometricAuth.isAvailable();

// Get supported types
const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();

// Authenticate
const result = await BiometricAuth.authenticate({
  reason: 'Access your secure data',
  fallbackButtonTitle: 'Use Passcode',
});

// Configure
await BiometricAuth.configure({
  sessionDuration: 1800000, // 30 minutes
  enableLogging: true,
});
```

For detailed configuration options and examples, see the [Configuration Guide](./docs/configuration/options.md).

## Platform Support

| Platform | Minimum Version | Biometric Types |
|----------|----------------|-----------------|
| Android | 6.0 (API 23) | Fingerprint, Face, Iris |
| iOS | 13.0 | Touch ID, Face ID |
| Web | Modern browsers | Platform authenticators |

For detailed platform-specific information:
- [Android Guide](./docs/platform-guides/android.md)
- [iOS Guide](./docs/platform-guides/ios.md)
- [Web Guide](./docs/platform-guides/web.md)

## Error Handling

The plugin provides comprehensive error handling with specific error codes. See the [Error Handling Guide](./docs/error-handling/overview.md) for details.

Common error codes:
- `USER_CANCELLED` - User cancelled authentication
- `AUTHENTICATION_FAILED` - Biometric not recognized
- `LOCKOUT` - Too many failed attempts
- `BIOMETRIC_NOT_ENROLLED` - No biometrics enrolled
- `NOT_AVAILABLE` - Biometric not available

For troubleshooting, see the [Troubleshooting Guide](./docs/error-handling/troubleshooting.md).

## Example App

Check out the `example/` directory for a complete React application demonstrating all features of the plugin.

```bash
cd example
npm install
npm run dev
```

## Advanced Usage

- [Security Best Practices](./docs/advanced-usage/security.md)
- [Session Management](./docs/advanced-usage/session-management.md)
- [Framework Integration Examples](./docs/advanced-usage/integration-examples.md)
  - React & React Native
  - Vue 3
  - Angular
  - Firebase Auth
  - Auth0
  - JWT Tokens

## Migration

Migrating from another biometric plugin? See our [Migration Guide](./docs/migration/from-other-plugins.md).

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Support

- **📚 Documentation**: [Full Documentation](./docs/README.md)
- **❓ FAQ**: [Frequently Asked Questions](./docs/migration/faq.md)
- **🐛 Issues**: [GitHub Issues](https://github.com/aoneahsan/capacitor-biometric-authentication/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/aoneahsan/capacitor-biometric-authentication/discussions)
- **📧 Email**: [aoneahsan@gmail.com](mailto:aoneahsan@gmail.com)
- **🔗 LinkedIn**: [Connect on LinkedIn](https://linkedin.com/in/aoneahsan)

## License

MIT

## Credits

Created by [Ahsan Mahmood](https://aoneahsan.com) for the Capacitor Community.
