# Web Platform Guide

This guide covers Web-specific implementation details using the Web Authentication API (WebAuthn) for the `capacitor-biometric-authentication` plugin.

## Overview

The web implementation uses the Web Authentication API (WebAuthn) to provide biometric authentication in browsers. WebAuthn enables passwordless authentication using platform authenticators (built-in biometric sensors) or roaming authenticators (USB security keys).

## Requirements

### Browser Support

| Browser | Minimum Version | Platform Authenticator |
|---------|----------------|----------------------|
| Chrome | 67+ | Windows Hello, Touch ID, Android |
| Firefox | 60+ | Windows Hello, Touch ID |
| Safari | 14+ | Touch ID, Face ID (macOS/iOS) |
| Edge | 18+ | Windows Hello |

### HTTPS Requirement

WebAuthn requires a secure context:
- **HTTPS** is required for production
- `localhost` is allowed for development
- Self-signed certificates work for testing

## How WebAuthn Works

### Registration Flow

1. User initiates registration
2. Browser generates a credential
3. User verifies with biometric
4. Public key stored on server
5. Private key stored in authenticator

### Authentication Flow

1. Server sends challenge
2. Browser finds matching credential
3. User verifies with biometric
4. Signed challenge sent to server
5. Server verifies signature

## Basic Implementation

### Quick Setup

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Configure WebAuthn settings
await BiometricAuth.configure({
  webConfig: {
    rpId: 'example.com',
    rpName: 'My Awesome App',
    userVerification: 'preferred'
  }
});

// Authenticate user
const result = await BiometricAuth.authenticate({
  reason: 'Sign in to your account'
});
```

### Platform Detection

```typescript
async function checkWebBiometric() {
  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    console.log('WebAuthn not supported');
    return false;
  }
  
  // Check for platform authenticator
  const hasPlatformAuth = await PublicKeyCredential
    .isUserVerifyingPlatformAuthenticatorAvailable();
    
  if (hasPlatformAuth) {
    console.log('Platform biometric available');
  } else {
    console.log('No platform biometric, USB key may work');
  }
  
  return hasPlatformAuth;
}
```

## WebAuthn Configuration

### Relying Party Configuration

Configure your website identity:

```typescript
await BiometricAuth.configure({
  webConfig: {
    // Your domain (without protocol)
    rpId: 'myapp.com',
    
    // Display name for your app
    rpName: 'My Application',
    
    // Require user verification
    userVerification: 'required',
    
    // Timeout for operations (ms)
    timeout: 60000,
    
    // Attestation preference
    attestation: 'none'
  }
});
```

### Configuration Options

| Option | Values | Description |
|--------|---------|------------|
| `rpId` | Domain string | Your website domain |
| `rpName` | String | Display name for users |
| `userVerification` | `required`, `preferred`, `discouraged` | Biometric requirement level |
| `timeout` | Number (ms) | Operation timeout |
| `attestation` | `none`, `indirect`, `direct` | Attestation conveyance |

## Registration Process

### First-Time Setup

```typescript
async function registerBiometric() {
  try {
    // Check availability first
    const { isAvailable } = await BiometricAuth.isAvailable();
    
    if (!isAvailable) {
      console.log('WebAuthn not available');
      return;
    }
    
    // Configure for registration
    await BiometricAuth.configure({
      webConfig: {
        rpId: window.location.hostname,
        rpName: 'My App',
        userVerification: 'required'
      }
    });
    
    // Perform initial authentication (creates credential)
    const result = await BiometricAuth.authenticate({
      reason: 'Register your biometric for faster sign-in'
    });
    
    if (result.isAuthenticated && result.credentialId) {
      // Save credential ID for future use
      await saveCredentialId(result.credentialId);
      console.log('Biometric registered successfully');
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
}
```

### Credential Management

```typescript
class WebAuthnManager {
  private credentialIds: string[] = [];
  
  async init() {
    // Load saved credential IDs
    this.credentialIds = await this.loadCredentialIds();
  }
  
  async authenticate() {
    const result = await BiometricAuth.authenticate({
      reason: 'Sign in to your account',
      webOptions: {
        // Provide known credential IDs for faster auth
        allowCredentials: this.credentialIds
      }
    });
    
    if (result.isAuthenticated && result.credentialId) {
      // Update credential ID if new
      if (!this.credentialIds.includes(result.credentialId)) {
        this.credentialIds.push(result.credentialId);
        await this.saveCredentialIds();
      }
    }
    
    return result;
  }
  
  private async loadCredentialIds(): Promise<string[]> {
    const stored = localStorage.getItem('webauthn_credentials');
    return stored ? JSON.parse(stored) : [];
  }
  
  private async saveCredentialIds() {
    localStorage.setItem('webauthn_credentials', 
      JSON.stringify(this.credentialIds)
    );
  }
}
```

## Platform-Specific Behaviors

### Windows Hello

```typescript
// Windows Hello integration
if (navigator.userAgent.includes('Windows')) {
  // Windows Hello available for:
  // - Fingerprint readers
  // - Face recognition (with IR camera)
  // - PIN as fallback
  
  await BiometricAuth.authenticate({
    reason: 'Sign in with Windows Hello'
  });
}
```

### macOS Touch ID

```typescript
// macOS Touch ID (Safari/Chrome)
if (navigator.userAgent.includes('Mac')) {
  // Touch ID available on:
  // - MacBook Pro with Touch Bar
  // - MacBook Air with Touch ID
  // - Magic Keyboard with Touch ID
  
  await BiometricAuth.authenticate({
    reason: 'Use Touch ID to sign in'
  });
}
```

### Mobile Browsers

```typescript
// Mobile browser detection
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
  // Platform authenticators available:
  // - iOS: Touch ID / Face ID (Safari)
  // - Android: Fingerprint / Face (Chrome)
  
  await BiometricAuth.authenticate({
    reason: 'Use your device biometric'
  });
}
```

## Error Handling

### WebAuthn-Specific Errors

```typescript
try {
  await BiometricAuth.authenticate(options);
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // User denied permission or timeout
    console.log('Authentication denied or timed out');
  } else if (error.name === 'SecurityError') {
    // Invalid domain or protocol
    console.log('Security error - check HTTPS');
  } else if (error.name === 'AbortError') {
    // Operation was aborted
    console.log('Authentication aborted');
  } else if (error.name === 'InvalidStateError') {
    // Authenticator already registered
    console.log('Credential already exists');
  } else if (error.name === 'NotSupportedError') {
    // Algorithm or option not supported
    console.log('Feature not supported');
  }
}
```

### Timeout Handling

```typescript
async function authenticateWithTimeout() {
  try {
    await BiometricAuth.configure({
      webConfig: {
        timeout: 30000 // 30 seconds
      }
    });
    
    const result = await BiometricAuth.authenticate({
      reason: 'Please authenticate within 30 seconds'
    });
    
    return result;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      // Likely timeout
      showMessage('Authentication timed out. Please try again.');
    }
  }
}
```

## Security Considerations

### Challenge Generation

The plugin automatically generates cryptographically secure challenges:

```typescript
// Internal implementation
const challenge = new Uint8Array(32);
crypto.getRandomValues(challenge);
```

### Credential Storage

```typescript
// Secure credential storage implementation
class SecureCredentialStore {
  private readonly STORAGE_KEY = 'biometric_auth_credentials';
  
  async storeCredential(credentialId: string, metadata: any) {
    // Encrypt sensitive data
    const encrypted = await this.encrypt({
      credentialId,
      metadata,
      timestamp: Date.now()
    });
    
    localStorage.setItem(this.STORAGE_KEY, encrypted);
  }
  
  async getCredentials(): Promise<string[]> {
    const encrypted = localStorage.getItem(this.STORAGE_KEY);
    if (!encrypted) return [];
    
    const decrypted = await this.decrypt(encrypted);
    return decrypted.credentialId;
  }
  
  private async encrypt(data: any): Promise<string> {
    // Use Web Crypto API for encryption
    const key = await this.deriveKey();
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
  
  private async decrypt(encrypted: string): Promise<any> {
    // Decrypt using Web Crypto API
    // Implementation details...
  }
}
```

### Cross-Origin Considerations

```typescript
// Ensure proper origin validation
await BiometricAuth.configure({
  webConfig: {
    // Must match your domain exactly
    rpId: 'app.example.com',
    
    // For subdomains, use parent domain
    // rpId: 'example.com' // Works for *.example.com
  }
});
```

## Advanced Features

### Conditional UI

Show biometric option only when available:

```typescript
async function setupConditionalUI() {
  // Check for autofill UI support
  if ('PasswordCredential' in window || 'FederatedCredential' in window) {
    const { isAvailable } = await BiometricAuth.isAvailable();
    
    if (isAvailable) {
      // Add autocomplete attribute
      const input = document.getElementById('username');
      input.setAttribute('autocomplete', 'username webauthn');
      
      // Browser will show biometric option in autofill
    }
  }
}
```

### Multiple Credentials

Handle multiple registered devices:

```typescript
class MultiDeviceAuth {
  async authenticateWithDevice(deviceName?: string) {
    const credentials = await this.getStoredCredentials();
    
    // Filter by device if specified
    const allowList = deviceName
      ? credentials.filter(c => c.device === deviceName)
      : credentials;
    
    const result = await BiometricAuth.authenticate({
      reason: `Sign in${deviceName ? ` with ${deviceName}` : ''}`,
      webOptions: {
        allowCredentials: allowList.map(c => c.id)
      }
    });
    
    return result;
  }
  
  async listRegisteredDevices() {
    const credentials = await this.getStoredCredentials();
    return credentials.map(c => ({
      name: c.device,
      id: c.id,
      registered: c.timestamp
    }));
  }
}
```

### Attestation Verification

For high-security applications:

```typescript
await BiometricAuth.configure({
  webConfig: {
    // Request attestation from authenticator
    attestation: 'direct',
    
    // Verify authenticator certificates
    // (Requires server-side verification)
  }
});

// Server-side verification needed for:
// - Authenticator model verification
// - Certificate chain validation
// - FIDO certification checking
```

## Testing

### Local Development

1. **Using localhost**:
```bash
# Serves on https://localhost:3000
npm run dev -- --https
```

2. **Using ngrok for mobile testing**:
```bash
# Expose local server
ngrok http 3000

# Use the HTTPS URL provided
```

### Browser DevTools

Chrome DevTools WebAuthn tab:
1. Open DevTools (F12)
2. Go to "WebAuthn" tab
3. Enable virtual authenticator
4. Configure authenticator options
5. Test registration/authentication

### Test Scenarios

```typescript
// Test different scenarios
async function runWebAuthnTests() {
  // Test 1: Platform authenticator available
  const hasPlatform = await PublicKeyCredential
    .isUserVerifyingPlatformAuthenticatorAvailable();
  console.log('Platform auth:', hasPlatform);
  
  // Test 2: User verification levels
  for (const level of ['required', 'preferred', 'discouraged']) {
    await BiometricAuth.configure({
      webConfig: { userVerification: level }
    });
    
    try {
      await BiometricAuth.authenticate();
      console.log(`${level} verification: SUCCESS`);
    } catch (e) {
      console.log(`${level} verification: FAILED`);
    }
  }
  
  // Test 3: Timeout behavior
  await BiometricAuth.configure({
    webConfig: { timeout: 5000 } // 5 seconds
  });
  
  // Test 4: Multiple credentials
  // Register multiple times and test selection
}
```

## Browser-Specific Issues

### Safari Quirks

```typescript
// Safari-specific handling
if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
  // Safari requires user activation
  button.addEventListener('click', async () => {
    // Must be called directly in event handler
    await BiometricAuth.authenticate();
  });
  
  // Cannot call authenticate() in async callback
  // This will fail in Safari:
  setTimeout(async () => {
    await BiometricAuth.authenticate(); // ❌ Fails
  }, 1000);
}
```

### Firefox Considerations

```typescript
// Firefox-specific behavior
if (navigator.userAgent.includes('Firefox')) {
  // Firefox may not support platform authenticators
  // on some systems. Always check:
  const available = await PublicKeyCredential
    .isUserVerifyingPlatformAuthenticatorAvailable();
    
  if (!available) {
    console.log('Firefox: USB security key required');
  }
}
```

## Performance Optimization

### Credential Caching

```typescript
class CredentialCache {
  private cache: Map<string, any> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  async getCredential(id: string) {
    const cached = this.cache.get(id);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.credential;
    }
    
    // Fetch fresh credential
    const credential = await this.fetchCredential(id);
    
    this.cache.set(id, {
      credential,
      timestamp: Date.now()
    });
    
    return credential;
  }
}
```

### Parallel Operations

```typescript
// Check multiple things in parallel
async function initializeBiometric() {
  const [
    isAvailable,
    hasPlatformAuth,
    storedCredentials
  ] = await Promise.all([
    BiometricAuth.isAvailable(),
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
    loadStoredCredentials()
  ]);
  
  return {
    isAvailable: isAvailable.isAvailable,
    hasPlatformAuth,
    hasStoredCredentials: storedCredentials.length > 0
  };
}
```

## Debugging

### Enable Logging

```typescript
await BiometricAuth.configure({
  enableLogging: true,
  webConfig: {
    // Your config
  }
});

// View in browser console
```

### Common Issues

1. **"SecurityError: The operation is insecure"**
   - Not using HTTPS
   - Invalid rpId configuration

2. **"NotAllowedError: The operation was not allowed"**
   - User cancelled
   - Timeout occurred
   - No user activation (Safari)

3. **"InvalidStateError: The authenticator already exists"**
   - Credential already registered
   - Clear and re-register

### WebAuthn Debugger

```typescript
// Debug helper
class WebAuthnDebugger {
  static async diagnose() {
    const report = {
      webAuthnSupported: 'PublicKeyCredential' in window,
      platformAuthAvailable: false,
      secureContext: window.isSecureContext,
      origin: window.location.origin,
      userAgent: navigator.userAgent
    };
    
    if (report.webAuthnSupported) {
      report.platformAuthAvailable = await PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable();
    }
    
    console.table(report);
    return report;
  }
}

// Run diagnosis
await WebAuthnDebugger.diagnose();
```

## Best Practices

1. **Always use HTTPS** in production
2. **Check availability** before showing UI
3. **Provide clear instructions** for users
4. **Handle all error cases** gracefully
5. **Store credential IDs** securely
6. **Test across browsers** and devices
7. **Implement fallback** authentication methods

## Resources

- [WebAuthn Specification](https://www.w3.org/TR/webauthn/)
- [MDN WebAuthn Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [FIDO Alliance](https://fidoalliance.org/)
- [WebAuthn.io Demo](https://webauthn.io/)
- [WebAuthn Browser Support](https://caniuse.com/webauthn)