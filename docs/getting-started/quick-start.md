# Quick Start Guide

This guide provides a complete walkthrough to integrate biometric authentication into your Capacitor app in under 5 minutes.

## Basic Implementation

### 1. Import the Plugin

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';
```

### 2. Check Availability

Always check if biometric authentication is available before using it:

```typescript
async function setupBiometric() {
  const { isAvailable, reason } = await BiometricAuth.isAvailable();
  
  if (!isAvailable) {
    // Handle unavailability
    switch (reason) {
      case 'NO_HARDWARE':
        console.log('Device does not have biometric hardware');
        break;
      case 'NO_ENROLLED_BIOMETRICS':
        console.log('No biometrics enrolled');
        // Prompt user to enroll biometrics in device settings
        break;
      case 'BIOMETRIC_UNAVAILABLE':
        console.log('Biometric temporarily unavailable');
        break;
    }
    return false;
  }
  
  return true;
}
```

### 3. Basic Authentication

Simple authentication with minimal configuration:

```typescript
async function loginWithBiometric() {
  try {
    const result = await BiometricAuth.authenticate({
      reason: 'Log in to your account'
    });
    
    if (result.isAuthenticated) {
      // Success! Proceed with login
      console.log('Authentication successful');
      // Navigate to protected area
    }
  } catch (error) {
    console.error('Authentication error:', error);
    // Handle error (see error handling guide)
  }
}
```

## Complete Example: Login Screen

Here's a complete example of a login screen with biometric authentication:

```typescript
import { BiometricAuth, BiometricType, BiometricErrorCode } from 'capacitor-biometric-authentication';
import { useState, useEffect } from 'react';

function LoginScreen() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  useEffect(() => {
    checkBiometricAvailability();
  }, []);
  
  async function checkBiometricAvailability() {
    try {
      const { isAvailable } = await BiometricAuth.isAvailable();
      setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
        setBiometricType(supportedBiometrics);
      }
    } catch (error) {
      console.error('Error checking biometric:', error);
    }
  }
  
  async function handleBiometricLogin() {
    setIsAuthenticating(true);
    
    try {
      const result = await BiometricAuth.authenticate({
        reason: 'Log in to MyApp',
        fallbackButtonTitle: 'Use Password',
        cancelButtonTitle: 'Cancel',
        maxAttempts: 3
      });
      
      if (result.isAuthenticated) {
        // Authentication successful
        console.log('Login successful');
        
        // Optional: Store credential for future use
        if (result.credentialId) {
          await saveCredentialId(result.credentialId);
        }
        
        // Navigate to home screen
        navigateToHome();
      }
    } catch (error: any) {
      // Handle specific error codes
      switch (error.code) {
        case BiometricErrorCode.USER_CANCELLED:
          console.log('User cancelled authentication');
          break;
        case BiometricErrorCode.LOCKOUT:
          console.error('Too many failed attempts');
          showError('Biometric locked. Please try again later.');
          break;
        case BiometricErrorCode.USER_FALLBACK:
          console.log('User chose fallback');
          showPasswordLogin();
          break;
        default:
          console.error('Authentication failed:', error);
          showError('Authentication failed. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }
  
  function getBiometricIcon() {
    if (biometricType.includes(BiometricType.FACE_ID)) {
      return '👤'; // Face ID icon
    } else if (biometricType.includes(BiometricType.TOUCH_ID) || 
               biometricType.includes(BiometricType.FINGERPRINT)) {
      return '👆'; // Fingerprint icon
    }
    return '🔒'; // Generic biometric icon
  }
  
  return (
    <div className="login-screen">
      <h1>Welcome Back</h1>
      
      {/* Regular login form */}
      <form onSubmit={handlePasswordLogin}>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Log In</button>
      </form>
      
      {/* Biometric login option */}
      {biometricAvailable && (
        <div className="biometric-section">
          <div className="divider">OR</div>
          <button 
            onClick={handleBiometricLogin}
            disabled={isAuthenticating}
            className="biometric-button"
          >
            <span className="icon">{getBiometricIcon()}</span>
            {isAuthenticating ? 'Authenticating...' : 'Login with Biometric'}
          </button>
        </div>
      )}
    </div>
  );
}
```

## Session Management Example

Implement automatic session management with biometric re-authentication:

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

class AuthService {
  private sessionDuration = 30 * 60 * 1000; // 30 minutes
  private lastAuthTime: number | null = null;
  
  async authenticateIfNeeded(): Promise<boolean> {
    // Check if session is still valid
    if (this.isSessionValid()) {
      return true;
    }
    
    try {
      // Configure session duration
      await BiometricAuth.configure({
        sessionDuration: this.sessionDuration,
        enableLogging: true
      });
      
      // Authenticate
      const result = await BiometricAuth.authenticate({
        reason: 'Your session has expired. Please authenticate to continue.',
        disableBackup: true // Force biometric only
      });
      
      if (result.isAuthenticated) {
        this.lastAuthTime = Date.now();
        return true;
      }
    } catch (error) {
      console.error('Re-authentication failed:', error);
    }
    
    return false;
  }
  
  private isSessionValid(): boolean {
    if (!this.lastAuthTime) return false;
    return Date.now() - this.lastAuthTime < this.sessionDuration;
  }
  
  logout() {
    this.lastAuthTime = null;
    // Optional: Clear stored credentials
    BiometricAuth.deleteCredentials();
  }
}

// Usage in protected routes
const authService = new AuthService();

async function accessProtectedResource() {
  const isAuthenticated = await authService.authenticateIfNeeded();
  
  if (!isAuthenticated) {
    // Redirect to login
    return;
  }
  
  // Access granted - proceed with protected operation
  fetchUserData();
}
```

## Platform-Specific Features

### iOS-Specific Implementation

```typescript
async function setupiOSBiometric() {
  const result = await BiometricAuth.authenticate({
    reason: 'Unlock MyApp',
    iosOptions: {
      localizedFallbackTitle: 'Enter Passcode',
      biometryType: 'faceID' // or 'touchID'
    }
  });
}
```

### Android-Specific Implementation

```typescript
async function setupAndroidBiometric() {
  const result = await BiometricAuth.authenticate({
    reason: 'Unlock MyApp',
    androidOptions: {
      promptInfo: {
        title: 'Biometric Login',
        subtitle: 'Log in using your biometric credential',
        description: 'Place your finger on the sensor',
        negativeButtonText: 'Use Account Password'
      },
      encryptionRequired: true
    }
  });
}
```

### Web-Specific Implementation

```typescript
async function setupWebBiometric() {
  // Configure WebAuthn options
  await BiometricAuth.configure({
    webOptions: {
      rpId: 'myapp.com',
      rpName: 'MyApp',
      userVerification: 'preferred',
      timeout: 60000 // 60 seconds
    }
  });
  
  const result = await BiometricAuth.authenticate({
    reason: 'Authenticate to continue'
  });
}
```

## Best Practices

1. **Always Check Availability First**
   ```typescript
   const { isAvailable } = await BiometricAuth.isAvailable();
   if (!isAvailable) {
     // Provide alternative authentication method
   }
   ```

2. **Provide Clear Reasons**
   ```typescript
   await BiometricAuth.authenticate({
     reason: 'Authenticate to view your account balance'
     // Be specific about why authentication is needed
   });
   ```

3. **Handle All Error Cases**
   ```typescript
   try {
     await BiometricAuth.authenticate(options);
   } catch (error) {
     // Always handle errors gracefully
     handleAuthError(error);
   }
   ```

4. **Offer Fallback Options**
   ```typescript
   await BiometricAuth.authenticate({
     reason: 'Log in to MyApp',
     fallbackButtonTitle: 'Use Password',
     disableBackup: false // Allow fallback methods
   });
   ```

5. **Test on Real Devices**
   - Biometrics don't work on simulators/emulators
   - Test with enrolled and not-enrolled biometrics
   - Test error scenarios

## Next Steps

Now that you have basic biometric authentication working:

1. Explore [API Reference](../api-reference/methods.md) for all available methods
2. Learn about [Configuration Options](../configuration/options.md)
3. Implement [Error Handling](../error-handling/overview.md)
4. Check [Platform Guides](../platform-guides/overview.md) for advanced features
5. Read [Security Best Practices](../advanced-usage/security.md)