# Capacitor Biometric Authentication - Documentation

Welcome to the comprehensive documentation for the `capacitor-biometric-authentication` plugin. This plugin provides secure biometric authentication across iOS, Android, and Web platforms using a unified API.

## 📚 Documentation Structure

### 🚀 Getting Started

- **[Installation Guide](./getting-started/installation.md)** - Step-by-step installation and setup
- **[Quick Start Guide](./getting-started/quick-start.md)** - Get up and running in 5 minutes

### 📖 API Reference

- **[Methods Reference](./api-reference/methods.md)** - Detailed documentation of all available methods
- **[Type Definitions](./api-reference/types.md)** - Complete TypeScript type definitions

### 📱 Platform Guides

- **[Android Guide](./platform-guides/android.md)** - Android-specific features and setup
- **[iOS Guide](./platform-guides/ios.md)** - iOS-specific features and setup
- **[Web Guide](./platform-guides/web.md)** - WebAuthn implementation details

### ⚙️ Configuration

- **[Configuration Options](./configuration/options.md)** - All available configuration settings
- **[UI Customization](./configuration/customization.md)** - Customize authentication dialogs

### 🚨 Error Handling

- **[Error Handling Overview](./error-handling/overview.md)** - Understanding and handling errors
- **[Troubleshooting Guide](./error-handling/troubleshooting.md)** - Common issues and solutions

### 🔧 Advanced Usage

- **[Security Best Practices](./advanced-usage/security.md)** - Security guidelines and recommendations
- **[Session Management](./advanced-usage/session-management.md)** - Advanced session handling
- **[Integration Examples](./advanced-usage/integration-examples.md)** - Framework and authentication system integrations

### 🔄 Migration & Support

- **[Migration Guide](./migration/from-other-plugins.md)** - Migrate from other biometric plugins
- **[FAQ](./migration/faq.md)** - Frequently asked questions

## 🎯 Quick Links

### By Use Case

**I want to...**

- [Add biometric login to my app](./getting-started/quick-start.md#basic-implementation)
- [Check if biometric is available](./api-reference/methods.md#isavailable)
- [Customize the authentication dialog](./configuration/customization.md)
- [Handle authentication errors](./error-handling/overview.md#error-handling-patterns)
- [Implement session management](./advanced-usage/session-management.md)
- [Secure sensitive operations](./advanced-usage/security.md#high-security-transaction-flow)

### By Platform

**Platform-specific information:**

- [Android setup and features](./platform-guides/android.md)
- [iOS setup and features](./platform-guides/ios.md)
- [Web/WebAuthn setup](./platform-guides/web.md)

### By Framework

**Integration guides:**

- [React/React Native](./advanced-usage/integration-examples.md#react-integration)
- [Vue 3](./advanced-usage/integration-examples.md#vue-3-integration)
- [Angular](./advanced-usage/integration-examples.md#angular-integration)

## 📋 Feature Overview

### Core Features

- ✅ **Cross-platform support** - iOS, Android, and Web
- ✅ **Multiple biometric types** - Fingerprint, Face ID, Touch ID, Face, Iris
- ✅ **WebAuthn support** - Modern web biometric authentication
- ✅ **Session management** - Built-in session handling with configurable duration
- ✅ **Secure storage** - Hardware-backed credential storage
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Customizable UI** - Platform-specific dialog customization
- ✅ **Comprehensive error handling** - Detailed error codes and messages

### Security Features

- 🔒 **No biometric data storage** - Biometric matching happens in secure hardware
- 🔒 **Hardware-backed keys** - Android Keystore, iOS Keychain, WebAuthn
- 🔒 **Session encryption** - Encrypted session management
- 🔒 **Invalidation on changes** - Keys invalidated when biometrics change

## 🏁 Getting Started

### Prerequisites

- Capacitor 6.0+
- iOS 13.0+ / Android 6.0+ (API 23+)
- Node.js 18+

### Quick Installation

```bash
npm install capacitor-biometric-authentication
npx cap sync
```

### Basic Usage

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Check availability
const { isAvailable } = await BiometricAuth.isAvailable();

if (isAvailable) {
  // Authenticate
  const result = await BiometricAuth.authenticate({
    reason: 'Please authenticate to continue',
  });

  if (result.isAuthenticated) {
    consoleLog('Authentication successful!');
  }
}
```

For detailed setup instructions, see the [Installation Guide](./getting-started/installation.md).

## 📊 Platform Compatibility

| Feature            | iOS               | Android     | Web         |
| ------------------ | ----------------- | ----------- | ----------- |
| Fingerprint        | ✅ Touch ID       | ✅          | ✅\*        |
| Face Recognition   | ✅ Face ID        | ✅          | ✅\*        |
| Iris Recognition   | ❌                | ✅          | ❌          |
| Session Management | ✅                | ✅          | ✅          |
| UI Customization   | Limited           | ✅ Full     | Limited     |
| Hardware Security  | ✅ Secure Enclave | ✅ Keystore | ✅ Platform |

\*Web biometric type depends on platform authenticator

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

- 📖 **Documentation**: You're here!
- 💬 **Discussions**: [GitHub Discussions](https://github.com/aoneahsan/capacitor-biometric-authentication/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/aoneahsan/capacitor-biometric-authentication/issues)
- 📧 **Contact**: [Email Support](mailto:support@example.com)

## 🏷️ Version

Current Version: 1.0.1

See [CHANGELOG](../CHANGELOG.md) for version history.

---

Made with ❤️ by [Ahsan Mahmood](https://github.com/aoneahsan)
