# Biometric Authentication

A framework-agnostic biometric authentication library that works with any JavaScript framework - React, Vue, Angular, or vanilla JavaScript. No providers required!

## Features

- **🚀 Zero Dependencies** - Works without requiring Capacitor, React Native, or any specific framework
- **🎯 Provider-less** - Direct API like Zustand, no Context/Providers needed
- **📱 Multi-Platform** - Web (WebAuthn), iOS, Android, Electron support
- **🔌 Framework Agnostic** - Works with React, Vue, Angular, Vanilla JS
- **🎨 TypeScript First** - Full type safety and IntelliSense support
- **🔐 Secure by Default** - Platform-specific secure storage
- **📦 Tiny Bundle** - Tree-shakeable with dynamic imports
- **🔄 Backward Compatible** - Works as a Capacitor plugin too

## Installation

```bash
npm install capacitor-biometric-authentication
# or
yarn add capacitor-biometric-authentication
```

## Quick Start

### Simple Web App (No Capacitor)

```javascript
import BiometricAuth from 'capacitor-biometric-authentication';

// Check if biometric authentication is available
const isAvailable = await BiometricAuth.isAvailable();

// Authenticate
const result = await BiometricAuth.authenticate({
  reason: 'Please authenticate to continue'
});

if (result.success) {
  console.log('Authentication successful!');
}
```

### React Example (No Providers!)

```jsx
import { useState, useEffect } from 'react';
import BiometricAuth from 'capacitor-biometric-authentication';

function SecureComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = BiometricAuth.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const result = await BiometricAuth.authenticate({
      reason: 'Access your account'
    });
    
    if (!result.success) {
      console.error('Authentication failed:', result.error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <h1>Welcome back!</h1>
      ) : (
        <button onClick={handleLogin}>Login with Biometrics</button>
      )}
    </div>
  );
}
```

### Vue Example

```vue
<template>
  <div>
    <button v-if="!isAuthenticated" @click="authenticate">
      Login with Biometrics
    </button>
    <div v-else>
      Welcome back!
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import BiometricAuth from 'capacitor-biometric-authentication';

const isAuthenticated = ref(false);
let unsubscribe;

onMounted(() => {
  unsubscribe = BiometricAuth.subscribe((state) => {
    isAuthenticated.value = state.isAuthenticated;
  });
});

onUnmounted(() => {
  unsubscribe?.();
});

const authenticate = async () => {
  await BiometricAuth.authenticate({
    reason: 'Access your account'
  });
};
</script>
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import BiometricAuth from 'https://unpkg.com/capacitor-biometric-authentication/dist/web.js';
    
    document.getElementById('auth-btn').addEventListener('click', async () => {
      const result = await BiometricAuth.authenticate({
        reason: 'Please authenticate'
      });
      
      if (result.success) {
        document.getElementById('status').textContent = 'Authenticated!';
      }
    });
  </script>
</head>
<body>
  <button id="auth-btn">Authenticate</button>
  <div id="status"></div>
</body>
</html>
```

## API Reference

### Core Methods

#### `BiometricAuth.isAvailable()`
Check if biometric authentication is available on the device.

```typescript
const isAvailable = await BiometricAuth.isAvailable();
```

#### `BiometricAuth.authenticate(options?)`
Perform biometric authentication.

```typescript
const result = await BiometricAuth.authenticate({
  reason: 'Please authenticate', // Prompt message
  cancelTitle: 'Cancel',         // iOS: Cancel button title
  fallbackTitle: 'Use Passcode', // iOS: Fallback button title
  maxAttempts: 3,                // Maximum attempts before lockout
  
  // Platform-specific options
  platform: {
    web: {
      userVerification: 'preferred'
    },
    android: {
      title: 'Authentication Required',
      subtitle: 'Log in to your account',
      confirmationRequired: true
    },
    ios: {
      localizedFallbackTitle: 'Use Device Passcode'
    }
  }
});

if (result.success) {
  console.log('Authenticated!', result.biometryType);
} else {
  console.error('Failed:', result.error);
}
```

#### `BiometricAuth.logout()`
Clear the authentication session.

```typescript
BiometricAuth.logout();
```

### State Management

#### `BiometricAuth.subscribe(callback)`
Subscribe to authentication state changes.

```typescript
const unsubscribe = BiometricAuth.subscribe((state) => {
  console.log('Is authenticated:', state.isAuthenticated);
  console.log('Biometry type:', state.biometryType);
});

// Later: unsubscribe();
```

#### `BiometricAuth.getState()`
Get current authentication state.

```typescript
const state = BiometricAuth.getState();
console.log(state);
// {
//   isAuthenticated: boolean,
//   sessionId?: string,
//   biometryType?: 'faceId' | 'touchId' | 'fingerprint',
//   lastAuthTime?: number
// }
```

### Utility Methods

#### `BiometricAuth.requireAuthentication(callback, options?)`
Execute a callback only after successful authentication.

```typescript
await BiometricAuth.requireAuthentication(async () => {
  // This code runs only after successful authentication
  await fetchSensitiveData();
}, {
  reason: 'Access sensitive data'
});
```

#### `BiometricAuth.withAuthentication(callback, options?)`
Wrap any operation with authentication.

```typescript
const data = await BiometricAuth.withAuthentication(
  () => fetchUserProfile(),
  { reason: 'Access your profile' }
);
```

## Platform Support

| Platform | Technology | Supported |
|----------|------------|-----------|
| Web | WebAuthn API | ✅ |
| iOS | Touch ID / Face ID | ✅ |
| Android | BiometricPrompt | ✅ |
| Electron | Touch ID (macOS) | ✅ |
| React Native | With react-native-biometrics | ✅ |

## Advanced Usage

### Custom Configuration

```typescript
BiometricAuth.configure({
  sessionDuration: 300000,  // 5 minutes
  debug: true,              // Enable debug logs
  adapter: 'auto'           // 'auto' | 'web' | 'capacitor' | custom
});
```

### Custom Adapters

Create your own adapter for unsupported platforms:

```typescript
class MyCustomAdapter {
  platform = 'my-platform';
  
  async isAvailable() {
    // Your implementation
  }
  
  async authenticate(options) {
    // Your implementation
  }
  
  // ... other required methods
}

BiometricAuth.registerAdapter('my-platform', new MyCustomAdapter());
```

### Using with Capacitor (Optional)

If you're already using Capacitor, the library works seamlessly:

```typescript
// Automatically uses Capacitor's native bridge when available
import BiometricAuth from 'capacitor-biometric-authentication';

// Same API, no changes needed!
await BiometricAuth.authenticate();
```

### Web-Only Bundle

For web-only projects, use the smaller web bundle:

```javascript
import BiometricAuth from 'capacitor-biometric-authentication/web';
```

## Error Handling

```typescript
const result = await BiometricAuth.authenticate();

if (!result.success) {
  switch (result.error.code) {
    case 'USER_CANCELLED':
      // User cancelled the authentication
      break;
    case 'AUTHENTICATION_FAILED':
      // Biometric not recognized
      break;
    case 'BIOMETRIC_UNAVAILABLE':
      // Biometric not available or not enrolled
      break;
    case 'LOCKOUT':
      // Too many failed attempts
      break;
  }
}
```

## Migration from v1.x

If you're using the old Capacitor-only version:

```typescript
// Old way (Capacitor only)
import { BiometricAuth } from 'capacitor-biometric-authentication';
await BiometricAuth.authenticate();

// New way (works everywhere)
import BiometricAuth from 'capacitor-biometric-authentication';
await BiometricAuth.authenticate(); // Same API!
```

## Browser Support

- Chrome/Edge 67+ (Windows Hello, Touch ID)
- Safari 14+ (Touch ID, Face ID)
- Firefox 60+ (Windows Hello)

## 📚 Full Documentation

Complete documentation is available in the [`docs/`](./docs/) directory:

- **[🚀 Installation Guide](./docs/getting-started/installation.md)** - Detailed setup instructions
- **[⚡ Quick Start](./docs/getting-started/quick-start.md)** - Get running in 5 minutes
- **[📱 Platform Guides](./docs/platform-guides/)** - iOS, Android, and Web specifics
- **[🔧 API Reference](./docs/api-reference/methods.md)** - All methods and types
- **[❓ FAQ](./docs/migration/faq.md)** - Frequently asked questions

## Example App

Check out the `example/` directory for a complete React application demonstrating all features of the plugin.

```bash
cd example
npm install
npm run dev
```

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

MIT © [Ahsan Mahmood](https://github.com/aoneahsan)