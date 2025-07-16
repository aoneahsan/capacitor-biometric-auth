# Security Best Practices

This guide covers security best practices for implementing biometric authentication in your application using the `capacitor-biometric-authentication` plugin.

## Overview

Biometric authentication enhances security by providing:
- **Something you are** (biometric) vs **Something you know** (password)
- Hardware-backed security on modern devices
- Protection against credential theft
- User-friendly authentication

However, proper implementation is crucial for maintaining security.

## Core Security Principles

### 1. Never Store Biometric Data

**Important**: The plugin never stores actual biometric data. It only stores:
- Encrypted credentials
- Session tokens
- Configuration settings

```typescript
// ❌ NEVER DO THIS
const fingerprintData = await scanFingerprint(); // Don't implement
localStorage.setItem('fingerprint', fingerprintData); // Never store

// ✅ CORRECT APPROACH
const result = await BiometricAuth.authenticate();
// Plugin handles biometric verification securely
```

### 2. Use Hardware Security Features

#### Android - Keystore

```typescript
await BiometricAuth.configure({
  androidConfig: {
    // Use hardware-backed keys
    strongBoxBacked: true,
    
    // Require authentication for key use
    userAuthenticationRequired: true,
    
    // Invalidate on new biometric enrollment
    invalidatedByBiometricEnrollment: true
  }
});
```

#### iOS - Secure Enclave

```typescript
await BiometricAuth.configure({
  iosConfig: {
    // Keys are automatically stored in Secure Enclave when available
    touchIDAuthenticationAllowableReuseDuration: 0 // No reuse
  }
});
```

#### Web - Platform Authenticators

```typescript
await BiometricAuth.configure({
  webConfig: {
    // Require platform authenticator (not USB keys)
    authenticatorAttachment: 'platform',
    
    // Require user verification
    userVerification: 'required'
  }
});
```

### 3. Implement Proper Session Management

```typescript
class SecureSessionManager {
  private readonly MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private lastActivity: number = 0;
  
  async validateSession(): Promise<boolean> {
    const now = Date.now();
    
    // Check session expiry
    if (now - this.lastActivity > this.MAX_SESSION_DURATION) {
      await this.endSession();
      return false;
    }
    
    // Check idle timeout
    if (now - this.lastActivity > this.IDLE_TIMEOUT) {
      // Require re-authentication
      const result = await BiometricAuth.authenticate({
        reason: 'Your session has expired. Please re-authenticate.',
        disableBackup: true // Force biometric only
      });
      
      if (result.isAuthenticated) {
        this.lastActivity = now;
        return true;
      }
      
      await this.endSession();
      return false;
    }
    
    this.lastActivity = now;
    return true;
  }
  
  private async endSession() {
    // Clear sensitive data
    await BiometricAuth.deleteCredentials();
    // Clear app session
    this.clearAppSession();
  }
}
```

### 4. Validate Biometric Changes

```typescript
class BiometricChangeDetector {
  private lastKnownBiometrics: string[] = [];
  
  async checkForChanges(): Promise<boolean> {
    const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
    const currentBiometrics = supportedBiometrics.sort().join(',');
    const lastKnown = this.lastKnownBiometrics.sort().join(',');
    
    if (currentBiometrics !== lastKnown) {
      // Biometric configuration changed
      console.warn('Biometric configuration changed');
      
      // Force re-enrollment
      await BiometricAuth.deleteCredentials();
      
      // Update known biometrics
      this.lastKnownBiometrics = supportedBiometrics;
      
      return true;
    }
    
    return false;
  }
}
```

## Secure Implementation Patterns

### High-Security Transaction Flow

```typescript
class SecureTransactionManager {
  async authorizeTransaction(transaction: Transaction): Promise<boolean> {
    // 1. Validate session
    const sessionValid = await this.validateSession();
    if (!sessionValid) {
      throw new Error('Invalid session');
    }
    
    // 2. Require fresh biometric authentication
    try {
      const result = await BiometricAuth.authenticate({
        reason: `Authorize payment of ${transaction.amount}`,
        disableBackup: true, // No fallback for high-value
        androidOptions: {
          confirmationRequired: true, // Explicit confirmation
          encryptionRequired: true
        },
        iosOptions: {
          // No Touch ID reuse
          localizedFallbackTitle: '' // Hide fallback
        }
      });
      
      if (!result.isAuthenticated) {
        return false;
      }
      
      // 3. Verify transaction integrity
      const transactionHash = await this.hashTransaction(transaction);
      
      // 4. Log security event
      await this.logSecurityEvent({
        type: 'transaction_authorized',
        transactionId: transaction.id,
        hash: transactionHash,
        timestamp: Date.now(),
        biometricType: result.authenticationType
      });
      
      return true;
      
    } catch (error) {
      // Log failed attempt
      await this.logSecurityEvent({
        type: 'transaction_failed',
        transactionId: transaction.id,
        error: error.code,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }
  
  private async hashTransaction(transaction: Transaction): Promise<string> {
    const data = JSON.stringify({
      id: transaction.id,
      amount: transaction.amount,
      recipient: transaction.recipient,
      timestamp: transaction.timestamp
    });
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

### Secure Credential Storage

```typescript
class SecureCredentialManager {
  private readonly ENCRYPTION_ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  
  async storeCredential(credential: any): Promise<void> {
    // 1. Generate encryption key
    const key = await this.generateKey();
    
    // 2. Encrypt credential
    const encrypted = await this.encrypt(credential, key);
    
    // 3. Store encrypted data
    await BiometricAuth.configure({
      encryptionKey: key,
      androidConfig: {
        // Store in hardware-backed keystore
        strongBoxBacked: true,
        userAuthenticationRequired: true
      }
    });
    
    // 4. Clear plaintext from memory
    this.secureDelete(credential);
  }
  
  private async generateKey(): Promise<string> {
    const keyData = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...keyData));
  }
  
  private async encrypt(data: any, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const keyBuffer = Uint8Array.from(atob(key), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: this.ENCRYPTION_ALGORITHM },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ENCRYPTION_ALGORITHM, iv },
      cryptoKey,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  private secureDelete(obj: any): void {
    // Overwrite memory
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = crypto.getRandomValues(new Uint8Array(obj[key].length));
      }
      delete obj[key];
    });
  }
}
```

## Platform-Specific Security

### Android Security Hardening

```typescript
// Maximum security configuration for Android
await BiometricAuth.configure({
  androidConfig: {
    // Use StrongBox-backed keys if available
    strongBoxBacked: true,
    
    // Require user authentication
    userAuthenticationRequired: true,
    
    // Invalidate on biometric changes
    invalidatedByBiometricEnrollment: true,
    
    // Custom keystore alias per user
    keystoreAlias: `BiometricKey_${userId}`,
    
    // Use strong authenticators only
    authenticators: BiometricManager.Authenticators.BIOMETRIC_STRONG
  }
});

// Require confirmation for sensitive operations
await BiometricAuth.authenticate({
  androidOptions: {
    confirmationRequired: true,
    encryptionRequired: true,
    promptInfo: {
      title: 'Confirm Sensitive Operation',
      description: 'This action requires your explicit confirmation'
    }
  }
});
```

### iOS Security Hardening

```typescript
// Maximum security configuration for iOS
await BiometricAuth.configure({
  iosConfig: {
    // No Touch ID reuse
    touchIDAuthenticationAllowableReuseDuration: 0,
    
    // Use app-specific keychain access group
    accessGroup: 'group.com.company.app.biometric'
  }
});

// Force biometric only (no passcode fallback)
await BiometricAuth.authenticate({
  reason: 'Biometric authentication required',
  fallbackButtonTitle: '', // Hide fallback button
  disableBackup: true
});
```

### Web Security Hardening

```typescript
// Maximum security configuration for Web
await BiometricAuth.configure({
  webConfig: {
    // Your verified domain
    rpId: 'secure.example.com',
    
    // Require user verification
    userVerification: 'required',
    
    // Request attestation for high security
    attestation: 'direct',
    
    // Short timeout
    timeout: 30000,
    
    // Platform authenticator only
    authenticatorAttachment: 'platform'
  }
});

// Validate WebAuthn response
class WebAuthnValidator {
  async validateCredential(credential: any): Promise<boolean> {
    // 1. Verify origin
    if (credential.response.clientDataJSON) {
      const clientData = JSON.parse(
        atob(credential.response.clientDataJSON)
      );
      
      if (clientData.origin !== window.location.origin) {
        throw new Error('Origin mismatch');
      }
    }
    
    // 2. Verify challenge
    // 3. Verify signature (server-side)
    
    return true;
  }
}
```

## Security Monitoring

### Audit Logging

```typescript
class BiometricAuditLogger {
  private readonly events: SecurityEvent[] = [];
  
  async logEvent(event: Partial<SecurityEvent>) {
    const fullEvent: SecurityEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      platform: Capacitor.getPlatform(),
      ...event
    };
    
    this.events.push(fullEvent);
    
    // Send to secure logging service
    await this.sendToSecureLogger(fullEvent);
  }
  
  async detectAnomalies() {
    const recentEvents = this.getRecentEvents(5 * 60 * 1000); // 5 minutes
    
    // Check for suspicious patterns
    const failedAttempts = recentEvents.filter(
      e => e.type === 'authentication_failed'
    );
    
    if (failedAttempts.length > 5) {
      await this.triggerSecurityAlert({
        type: 'excessive_failed_attempts',
        count: failedAttempts.length
      });
    }
    
    // Check for rapid authentications
    const successfulAuths = recentEvents.filter(
      e => e.type === 'authentication_success'
    );
    
    if (successfulAuths.length > 10) {
      await this.triggerSecurityAlert({
        type: 'unusual_authentication_pattern',
        count: successfulAuths.length
      });
    }
  }
}
```

### Rate Limiting

```typescript
class BiometricRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  
  async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    
    // Remove old attempts
    const recentAttempts = userAttempts.filter(
      time => now - time < this.WINDOW_MS
    );
    
    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      throw new Error('Rate limit exceeded. Try again later.');
    }
    
    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(userId, recentAttempts);
    
    return true;
  }
  
  resetUserLimit(userId: string) {
    this.attempts.delete(userId);
  }
}
```

## Security Checklist

### Implementation Checklist

- [ ] Never store biometric data
- [ ] Use hardware-backed security features
- [ ] Implement session timeouts
- [ ] Validate biometric configuration changes
- [ ] Use encryption for sensitive data
- [ ] Implement audit logging
- [ ] Add rate limiting
- [ ] Handle errors securely
- [ ] Clear sensitive data from memory
- [ ] Test on real devices

### Configuration Checklist

- [ ] Disable fallback for high-security operations
- [ ] Require user confirmation for transactions
- [ ] Use strong biometric authenticators only
- [ ] Set appropriate session durations
- [ ] Enable encryption requirements
- [ ] Configure platform-specific security options

### Testing Checklist

- [ ] Test with enrolled/unenrolled biometrics
- [ ] Test lockout scenarios
- [ ] Test configuration changes
- [ ] Test session expiry
- [ ] Test error handling
- [ ] Test on multiple devices
- [ ] Perform security audit

## Common Security Mistakes

### 1. Storing Sensitive Data

```typescript
// ❌ WRONG
localStorage.setItem('userPassword', password);
localStorage.setItem('biometricData', data);

// ✅ CORRECT
// Let the plugin handle secure storage
await BiometricAuth.authenticate();
```

### 2. Long Session Durations

```typescript
// ❌ WRONG
await BiometricAuth.configure({
  sessionDuration: 24 * 60 * 60 * 1000 // 24 hours
});

// ✅ CORRECT
await BiometricAuth.configure({
  sessionDuration: 30 * 60 * 1000 // 30 minutes max
});
```

### 3. Allowing Weak Authentication

```typescript
// ❌ WRONG
await BiometricAuth.configure({
  allowDeviceCredential: true, // Allows PIN/Pattern
  androidConfig: {
    authenticators: BiometricManager.Authenticators.BIOMETRIC_WEAK
  }
});

// ✅ CORRECT
await BiometricAuth.configure({
  allowDeviceCredential: false,
  androidConfig: {
    authenticators: BiometricManager.Authenticators.BIOMETRIC_STRONG
  }
});
```

## Resources

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [Android Biometric Security](https://source.android.com/security/biometric)
- [Apple Platform Security](https://support.apple.com/guide/security/welcome/web)
- [WebAuthn Security Considerations](https://www.w3.org/TR/webauthn/#security-considerations)