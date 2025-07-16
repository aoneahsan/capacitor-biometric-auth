# Installation Guide

This guide will walk you through installing and setting up the `capacitor-biometric-authentication` plugin in your Capacitor project.

## Prerequisites

Before installing this plugin, ensure you have:

- A Capacitor project (version 6.0+ recommended)
- Node.js 18+ installed
- For iOS development: Xcode 15+ with iOS 13.0+ SDK
- For Android development: Android Studio with Android SDK 23+ (Android 6.0)

## Installation

Install the plugin using your preferred package manager:

```bash
# Using npm
npm install capacitor-biometric-authentication

# Using yarn
yarn add capacitor-biometric-authentication

# Using pnpm
pnpm add capacitor-biometric-authentication
```

## Sync Native Projects

After installation, sync your native projects:

```bash
npx cap sync
```

This command will:
- Copy the web assets to native projects
- Update native project dependencies
- Install the plugin's native code

## Platform-Specific Setup

### Android Setup

1. **Minimum SDK Version**
   
   Ensure your `android/variables.gradle` file has:
   ```gradle
   ext {
       minSdkVersion = 23  // Required minimum
       compileSdkVersion = 34
       targetSdkVersion = 34
   }
   ```

2. **Permissions**
   
   The plugin automatically adds the required permission to your `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.USE_BIOMETRIC" />
   ```

3. **ProGuard Rules** (if using R8/ProGuard)
   
   The plugin includes ProGuard rules automatically. No additional configuration needed.

### iOS Setup

1. **Minimum iOS Version**
   
   In your `ios/App/Podfile`, ensure:
   ```ruby
   platform :ios, '13.0'
   ```

2. **Info.plist Configuration**
   
   Add Face ID usage description to `ios/App/App/Info.plist`:
   ```xml
   <key>NSFaceIDUsageDescription</key>
   <string>This app uses Face ID for secure authentication</string>
   ```

3. **Capabilities**
   
   No additional capabilities need to be enabled. The plugin uses LocalAuthentication framework which doesn't require special entitlements.

### Web Setup

The web implementation uses the Web Authentication API (WebAuthn). No additional setup is required, but note:

- WebAuthn requires HTTPS (except for localhost)
- Browser support varies (Chrome 67+, Firefox 60+, Safari 14+)
- Some browsers may require user interaction to initiate authentication

## Quick Start Example

Here's a minimal example to get you started:

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Check if biometric authentication is available
async function checkBiometric() {
  try {
    const { isAvailable, reason } = await BiometricAuth.isAvailable();
    
    if (isAvailable) {
      console.log('Biometric authentication is available');
      
      // Get supported biometric types
      const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
      console.log('Supported types:', supportedBiometrics);
    } else {
      console.log('Biometric not available:', reason);
    }
  } catch (error) {
    console.error('Error checking biometric availability:', error);
  }
}

// Authenticate user
async function authenticate() {
  try {
    const result = await BiometricAuth.authenticate({
      reason: 'Please authenticate to access your account',
      fallbackButtonTitle: 'Use Passcode',
      maxAttempts: 3
    });
    
    if (result.isAuthenticated) {
      console.log('Authentication successful');
      // User is authenticated
    }
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

## TypeScript Support

The plugin is written in TypeScript and provides full type definitions. Import types as needed:

```typescript
import { 
  BiometricAuth,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricType,
  BiometricErrorCode 
} from 'capacitor-biometric-authentication';
```

## Verification

To verify the installation:

1. Run your app on a device (biometrics don't work on simulators/emulators)
2. Call `BiometricAuth.isAvailable()` to check availability
3. Try a simple authentication flow

## Next Steps

- Read the [API Reference](../api-reference/methods.md) for detailed method documentation
- Check [Platform Guides](../platform-guides/overview.md) for platform-specific features
- See [Configuration Guide](../configuration/options.md) for customization options

## Troubleshooting Installation

### Common Issues

1. **"Plugin not implemented" error**
   - Run `npx cap sync` again
   - Ensure you've rebuilt your native project
   - Check that the plugin is listed in `capacitor.config.ts`

2. **Build errors on Android**
   - Verify minimum SDK version is 23
   - Clean and rebuild: `cd android && ./gradlew clean`

3. **Build errors on iOS**
   - Update pods: `cd ios && pod install --repo-update`
   - Clean build folder in Xcode

4. **TypeScript errors**
   - Ensure TypeScript 4.0+ is installed
   - Try deleting `node_modules` and reinstalling

### Getting Help

If you encounter issues:
1. Check the [Error Handling Guide](../error-handling/overview.md)
2. Search existing [GitHub Issues](https://github.com/aoneahsan/capacitor-biometric-authentication/issues)
3. Create a new issue with:
   - Plugin version
   - Capacitor version
   - Platform (iOS/Android/Web)
   - Error messages
   - Minimal reproduction code