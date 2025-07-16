# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the `capacitor-biometric-authentication` plugin.

## Common Issues and Solutions

### Installation Issues

#### "Plugin not implemented" Error

**Problem**: Getting "Plugin not implemented on [platform]" error.

**Solutions**:

1. **Sync the project**:
```bash
npx cap sync
```

2. **Clean and rebuild**:
```bash
# iOS
cd ios && pod install --repo-update
rm -rf ~/Library/Developer/Xcode/DerivedData

# Android
cd android && ./gradlew clean
```

3. **Verify installation**:
```typescript
// Check if plugin is registered
console.log('Plugins:', Capacitor.Plugins);
```

#### Build Errors

**Android build errors**:

```bash
# Error: Minimum SDK version
# Solution: Update android/variables.gradle
ext {
    minSdkVersion = 23  // Required minimum
}

# Error: Duplicate classes
# Solution: Clean and rebuild
cd android && ./gradlew clean && ./gradlew build
```

**iOS build errors**:

```bash
# Error: Module not found
# Solution: Update pods
cd ios && pod deintegrate && pod install

# Error: Swift version
# Solution: Set in Xcode or Podfile
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_VERSION'] = '5.0'
    end
  end
end
```

### Runtime Issues

#### Biometric Not Available

**Problem**: `isAvailable()` returns false unexpectedly.

**Diagnostic code**:
```typescript
async function diagnoseBiometric() {
  const { isAvailable, reason } = await BiometricAuth.isAvailable();
  
  console.log('Available:', isAvailable);
  console.log('Reason:', reason);
  
  if (!isAvailable) {
    switch (reason) {
      case 'NO_HARDWARE':
        console.log('Device has no biometric hardware');
        break;
        
      case 'NO_ENROLLED_BIOMETRICS':
        console.log('User needs to enroll biometrics');
        // Guide to settings
        break;
        
      case 'BIOMETRIC_UNAVAILABLE':
        console.log('Temporarily unavailable (lockout?)');
        break;
    }
  }
  
  // Check supported types
  try {
    const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
    console.log('Supported:', supportedBiometrics);
  } catch (e) {
    console.error('Error getting supported biometrics:', e);
  }
}
```

#### Authentication Always Fails

**Common causes and solutions**:

1. **Simulator/Emulator issue**:
```typescript
// Check if running on real device
const isSimulator = Capacitor.getPlatform() === 'ios' 
  ? !window.DeviceOrientationEvent
  : navigator.userAgent.includes('sdk_gphone');

if (isSimulator) {
  console.warn('Biometrics may not work properly on simulator');
}
```

2. **Configuration issue**:
```typescript
// Reset configuration
await BiometricAuth.configure({
  sessionDuration: 1800000,
  allowDeviceCredential: true,
  enableLogging: true // Enable for debugging
});
```

3. **Credential corruption**:
```typescript
// Clear and retry
await BiometricAuth.deleteCredentials();
// Try authentication again
```

### Platform-Specific Issues

#### Android Issues

**1. Dialog not showing**:
```typescript
// Ensure activity is in foreground
document.addEventListener('resume', async () => {
  // Wait for activity to be fully resumed
  setTimeout(() => {
    BiometricAuth.authenticate();
  }, 100);
});
```

**2. Keystore errors**:
```typescript
// Handle keystore issues
try {
  await BiometricAuth.authenticate();
} catch (error) {
  if (error.message.includes('KeyStore')) {
    // Clear and regenerate keys
    await BiometricAuth.deleteCredentials();
    await BiometricAuth.configure({
      androidConfig: {
        keystoreAlias: 'NewBiometricKey'
      }
    });
  }
}
```

**3. Hardware detection issues**:
```java
// Check BiometricManager directly (native code)
BiometricManager biometricManager = BiometricManager.from(context);
int canAuthenticate = biometricManager.canAuthenticate(
  BiometricManager.Authenticators.BIOMETRIC_WEAK
);
```

#### iOS Issues

**1. Face ID not working**:
```typescript
// Check Face ID permission
async function checkFaceIDPermission() {
  // Ensure Info.plist has NSFaceIDUsageDescription
  const { isAvailable } = await BiometricAuth.isAvailable();
  
  if (!isAvailable) {
    // May need to prompt for Face ID permission
    await BiometricAuth.authenticate({
      reason: 'Enable Face ID for quick access'
    });
  }
}
```

**2. Keychain access errors**:
```typescript
// Error -25300: Item not found
// Solution: Clear and recreate
await BiometricAuth.deleteCredentials();

// Error -34018: Missing entitlement
// Solution: Check keychain sharing in entitlements
```

**3. Context invalidation**:
```typescript
// Avoid multiple simultaneous calls
let isAuthenticating = false;

async function safeAuthenticate() {
  if (isAuthenticating) {
    console.warn('Authentication already in progress');
    return;
  }
  
  isAuthenticating = true;
  try {
    await BiometricAuth.authenticate();
  } finally {
    isAuthenticating = false;
  }
}
```

#### Web Issues

**1. WebAuthn not available**:
```typescript
// Comprehensive WebAuthn check
async function checkWebAuthnSupport() {
  const checks = {
    publicKeyCredential: 'PublicKeyCredential' in window,
    secureContext: window.isSecureContext,
    platformAuthenticator: false
  };
  
  if (checks.publicKeyCredential) {
    checks.platformAuthenticator = await PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable();
  }
  
  console.table(checks);
  
  if (!checks.secureContext) {
    console.error('HTTPS required for WebAuthn');
  }
}
```

**2. Registration failures**:
```typescript
// Clear existing credentials and retry
localStorage.removeItem('biometric_credentials');

// Ensure proper domain configuration
await BiometricAuth.configure({
  webConfig: {
    rpId: window.location.hostname, // Must match exactly
    rpName: 'My App'
  }
});
```

## Debugging Techniques

### Enable Verbose Logging

```typescript
// Enable all logging
await BiometricAuth.configure({
  enableLogging: true
});

// Platform-specific logging
if (Capacitor.getPlatform() === 'android') {
  // View in adb logcat
  // adb logcat | grep -i biometric
} else if (Capacitor.getPlatform() === 'ios') {
  // View in Xcode console
  // Or use Console.app with device connected
}
```

### Debug Helper Class

```typescript
class BiometricDebugger {
  async runDiagnostics() {
    console.group('🔍 Biometric Diagnostics');
    
    // 1. Platform info
    console.log('Platform:', Capacitor.getPlatform());
    console.log('Native app?', Capacitor.isNativePlatform());
    
    // 2. Availability check
    try {
      const availability = await BiometricAuth.isAvailable();
      console.log('Available:', availability);
    } catch (e) {
      console.error('Availability check failed:', e);
    }
    
    // 3. Supported biometrics
    try {
      const supported = await BiometricAuth.getSupportedBiometrics();
      console.log('Supported types:', supported);
    } catch (e) {
      console.error('Supported check failed:', e);
    }
    
    // 4. Configuration test
    try {
      await BiometricAuth.configure({
        enableLogging: true,
        sessionDuration: 60000
      });
      console.log('Configuration: Success');
    } catch (e) {
      console.error('Configuration failed:', e);
    }
    
    // 5. Storage check
    this.checkStorage();
    
    console.groupEnd();
  }
  
  private checkStorage() {
    if (Capacitor.getPlatform() === 'web') {
      const keys = Object.keys(localStorage)
        .filter(k => k.includes('biometric'));
      console.log('Storage keys:', keys);
    }
  }
}

// Run diagnostics
const debugger = new BiometricDebugger();
await debugger.runDiagnostics();
```

### Network Inspection (Web)

```typescript
// Monitor WebAuthn API calls
const originalCreate = navigator.credentials.create;
navigator.credentials.create = function(...args) {
  console.log('WebAuthn create:', args);
  return originalCreate.apply(this, args);
};

const originalGet = navigator.credentials.get;
navigator.credentials.get = function(...args) {
  console.log('WebAuthn get:', args);
  return originalGet.apply(this, args);
};
```

## Performance Issues

### Slow Authentication

**Optimization strategies**:

```typescript
// 1. Pre-check availability
let biometricAvailable: boolean | null = null;

async function initBiometric() {
  const { isAvailable } = await BiometricAuth.isAvailable();
  biometricAvailable = isAvailable;
}

// 2. Reduce timeout for web
await BiometricAuth.configure({
  webConfig: {
    timeout: 30000 // 30 seconds instead of 60
  }
});

// 3. Cache session state
class BiometricSession {
  private lastAuth: number = 0;
  private sessionDuration = 300000; // 5 minutes
  
  needsAuth(): boolean {
    return Date.now() - this.lastAuth > this.sessionDuration;
  }
  
  async authenticate() {
    if (!this.needsAuth()) {
      return true; // Skip if recent
    }
    
    const result = await BiometricAuth.authenticate();
    if (result.isAuthenticated) {
      this.lastAuth = Date.now();
    }
    return result.isAuthenticated;
  }
}
```

### Memory Leaks

**Prevention strategies**:

```typescript
// Clean up on component unmount
class BiometricComponent {
  private cleanup: (() => void)[] = [];
  
  async init() {
    // Store cleanup functions
    const resumeListener = App.addListener('appStateChange', () => {
      // Handle state change
    });
    
    this.cleanup.push(() => resumeListener.remove());
  }
  
  destroy() {
    // Clean up all listeners
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
  }
}
```

## Migration Issues

### From Other Biometric Plugins

```typescript
// Migration helper
class BiometricMigration {
  async migrateFromOldPlugin() {
    // 1. Check for old data
    const oldData = this.getOldPluginData();
    
    if (oldData) {
      // 2. Clear old plugin data
      this.clearOldPlugin();
      
      // 3. Re-enroll with new plugin
      console.log('Please re-authenticate to complete migration');
      
      const result = await BiometricAuth.authenticate({
        reason: 'Re-authenticate to complete setup'
      });
      
      if (result.isAuthenticated) {
        console.log('Migration completed successfully');
      }
    }
  }
  
  private getOldPluginData() {
    // Check for old plugin's storage keys
    return localStorage.getItem('old_biometric_plugin_data');
  }
  
  private clearOldPlugin() {
    // Remove old plugin data
    const keysToRemove = [
      'old_biometric_plugin_data',
      'old_biometric_credentials'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }
}
```

## Emergency Recovery

### Reset Everything

```typescript
async function emergencyReset() {
  console.warn('Performing emergency reset...');
  
  try {
    // 1. Delete all credentials
    await BiometricAuth.deleteCredentials();
    console.log('✓ Credentials deleted');
  } catch (e) {
    console.error('Failed to delete credentials:', e);
  }
  
  // 2. Clear web storage (if web platform)
  if (Capacitor.getPlatform() === 'web') {
    const keysToRemove = Object.keys(localStorage)
      .filter(k => k.includes('biometric'));
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('✓ Web storage cleared');
  }
  
  // 3. Reset configuration
  try {
    await BiometricAuth.configure({
      sessionDuration: 1800000,
      enableLogging: false,
      allowDeviceCredential: true
    });
    console.log('✓ Configuration reset');
  } catch (e) {
    console.error('Failed to reset config:', e);
  }
  
  console.log('Emergency reset completed');
}
```

## Getting Help

### Diagnostic Information to Collect

When reporting issues, include:

```typescript
async function collectDiagnosticInfo() {
  const info = {
    plugin_version: '1.0.1', // Your plugin version
    capacitor_version: Capacitor.VERSION,
    platform: Capacitor.getPlatform(),
    platform_version: Capacitor.getPlatformVersion?.() || 'unknown',
    
    // Availability info
    availability: await BiometricAuth.isAvailable()
      .catch(e => ({ error: e.message })),
    
    // Supported biometrics
    supported: await BiometricAuth.getSupportedBiometrics()
      .catch(e => ({ error: e.message })),
    
    // Device info
    device: {
      model: (await Device.getInfo()).model,
      osVersion: (await Device.getInfo()).osVersion,
      platform: (await Device.getInfo()).platform
    }
  };
  
  console.log('Diagnostic Info:', JSON.stringify(info, null, 2));
  return info;
}
```

### Reporting Issues

1. **Check existing issues**: [GitHub Issues](https://github.com/aoneahsan/capacitor-biometric-authentication/issues)
2. **Include diagnostic info**: Run `collectDiagnosticInfo()`
3. **Provide minimal reproduction**: Share code that reproduces the issue
4. **Specify device details**: Model, OS version, biometric type
5. **Include error messages**: Full error stack traces