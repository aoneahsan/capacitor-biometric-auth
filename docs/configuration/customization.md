# UI Customization Guide

This guide covers how to customize the biometric authentication UI across different platforms, including dialog text, buttons, and visual appearance.

## Overview

Each platform provides different levels of UI customization:

- **Android**: Full dialog customization
- **iOS**: Limited system dialog customization
- **Web**: Browser-controlled with some options

## Android UI Customization

### BiometricPrompt Dialog

Android offers the most customization options through the `promptInfo` object:

```typescript
await BiometricAuth.authenticate({
  androidOptions: {
    promptInfo: {
      title: 'Secure Login',
      subtitle: 'Access your account',
      description: 'Place your finger on the sensor or look at the camera',
      negativeButtonText: 'Use PIN Instead'
    }
  }
});
```

### Complete Android Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `title` | string | Main dialog title | "Biometric Authentication" |
| `subtitle` | string | Secondary title | "Verify your identity" |
| `description` | string | Helper text | "Touch the fingerprint sensor" |
| `negativeButtonText` | string | Cancel/fallback button | "Cancel" or "Use Password" |

### Visual Examples

```typescript
// Minimal dialog
await BiometricAuth.authenticate({
  androidOptions: {
    promptInfo: {
      title: 'Unlock',
      negativeButtonText: 'Cancel'
    }
  }
});

// Detailed dialog
await BiometricAuth.authenticate({
  androidOptions: {
    promptInfo: {
      title: '🔒 Secure Access Required',
      subtitle: 'Banking App Authentication',
      description: 'Use your registered biometric to access your account securely',
      negativeButtonText: 'Use 6-Digit PIN'
    }
  }
});

// Transaction confirmation
await BiometricAuth.authenticate({
  androidOptions: {
    promptInfo: {
      title: 'Confirm Payment',
      subtitle: '$1,234.56 to John Doe',
      description: 'Authenticate to complete this transaction',
      negativeButtonText: 'Cancel Payment'
    },
    confirmationRequired: true
  }
});
```

### Dialog Behavior Customization

```typescript
// Require explicit confirmation
await BiometricAuth.authenticate({
  androidOptions: {
    confirmationRequired: true, // Shows "Confirm" button after biometric
    encryptionRequired: true    // Ensures hardware-backed security
  }
});
```

### Localization

```typescript
// Spanish localization example
const strings = {
  es: {
    title: 'Autenticación Biométrica',
    subtitle: 'Accede a tu cuenta',
    description: 'Coloca tu dedo en el sensor',
    negativeButtonText: 'Usar Contraseña'
  },
  en: {
    title: 'Biometric Authentication',
    subtitle: 'Access your account',
    description: 'Place your finger on the sensor',
    negativeButtonText: 'Use Password'
  }
};

const locale = getDeviceLocale(); // 'es' or 'en'

await BiometricAuth.authenticate({
  androidOptions: {
    promptInfo: strings[locale]
  }
});
```

## iOS UI Customization

### System Dialog Options

iOS provides limited customization for the system authentication dialog:

```typescript
await BiometricAuth.authenticate({
  reason: 'Unlock MyApp to continue', // Required, shown in dialog
  iosOptions: {
    localizedFallbackTitle: 'Enter Passcode' // Fallback button text
  }
});
```

### iOS Text Customization

| Option | Description | Default |
|--------|-------------|---------|
| `reason` | Main authentication message | Required |
| `localizedFallbackTitle` | Fallback button text | "Enter Password" |
| `cancelButtonTitle` | Cancel button text | "Cancel" |

### Face ID vs Touch ID

Customize based on biometric type:

```typescript
// Detect biometric type
const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
const isFaceID = supportedBiometrics.includes(BiometricType.FACE_ID);

// Customize message
await BiometricAuth.authenticate({
  reason: isFaceID 
    ? 'Look at your device to unlock'
    : 'Touch the Home button to unlock',
  iosOptions: {
    localizedFallbackTitle: 'Use Passcode',
    biometryType: isFaceID ? 'faceID' : 'touchID'
  }
});
```

### iOS Localization

```typescript
// Localized strings
const iosStrings = {
  'en': {
    reason: 'Authenticate to access your account',
    fallback: 'Enter Passcode'
  },
  'es': {
    reason: 'Autentícate para acceder a tu cuenta',
    fallback: 'Ingresar Código'
  },
  'fr': {
    reason: 'Authentifiez-vous pour accéder à votre compte',
    fallback: 'Entrer le code'
  }
};

const lang = getCurrentLanguage();

await BiometricAuth.authenticate({
  reason: iosStrings[lang].reason,
  iosOptions: {
    localizedFallbackTitle: iosStrings[lang].fallback
  }
});
```

## Web UI Customization

### WebAuthn Dialog

Web browsers control the authentication dialog, but you can influence the experience:

```typescript
await BiometricAuth.configure({
  webConfig: {
    rpName: 'My Awesome App', // Shown in browser dialog
    userVerification: 'required' // Affects dialog behavior
  }
});
```

### Custom Pre-Authentication UI

Since browser dialogs can't be customized, create your own pre-authentication UI:

```typescript
// Custom UI component
function BiometricButton() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const handleAuth = async () => {
    setIsAuthenticating(true);
    
    // Show custom UI before browser dialog
    showCustomDialog({
      title: 'Biometric Authentication',
      message: 'Your browser will now request biometric authentication',
      icon: '🔐'
    });
    
    try {
      await BiometricAuth.authenticate({
        reason: 'Sign in to your account'
      });
      
      // Success UI
      showSuccessDialog();
    } catch (error) {
      // Error UI
      showErrorDialog(error);
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  return (
    <button onClick={handleAuth} disabled={isAuthenticating}>
      {isAuthenticating ? (
        <>🔄 Authenticating...</>
      ) : (
        <>🔐 Sign in with Biometric</>
      )}
    </button>
  );
}
```

### Platform-Specific Icons

Show appropriate icons based on platform and biometric type:

```typescript
function getBiometricIcon() {
  const platform = Capacitor.getPlatform();
  const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
  
  if (platform === 'web') {
    // Web icons
    return '🔐'; // Generic security icon
  } else if (platform === 'ios') {
    // iOS icons
    if (supportedBiometrics.includes(BiometricType.FACE_ID)) {
      return '👤'; // Face ID
    } else {
      return '👆'; // Touch ID
    }
  } else if (platform === 'android') {
    // Android icons
    if (supportedBiometrics.includes(BiometricType.FACE)) {
      return '😊'; // Face unlock
    } else {
      return '👆'; // Fingerprint
    }
  }
}
```

## Cross-Platform UI Consistency

### Unified Configuration

Create consistent UI across platforms:

```typescript
class BiometricUI {
  private readonly themes = {
    default: {
      title: 'Biometric Authentication',
      subtitle: 'Verify your identity',
      description: 'Use your biometric to continue',
      fallbackText: 'Use Alternative Method',
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    },
    banking: {
      title: '🏦 Secure Banking Access',
      subtitle: 'Protected by biometric security',
      description: 'Authenticate to access your accounts',
      fallbackText: 'Use 6-Digit PIN',
      confirmText: 'Authorize',
      cancelText: 'Cancel'
    },
    medical: {
      title: '🏥 Medical Records Access',
      subtitle: 'HIPAA-Compliant Authentication',
      description: 'Verify identity to view health information',
      fallbackText: 'Use Password',
      confirmText: 'Grant Access',
      cancelText: 'Deny'
    }
  };
  
  async authenticate(theme: keyof typeof this.themes = 'default') {
    const config = this.themes[theme];
    const platform = Capacitor.getPlatform();
    
    const options: BiometricAuthOptions = {
      reason: config.title,
      fallbackButtonTitle: config.fallbackText,
      cancelButtonTitle: config.cancelText
    };
    
    // Platform-specific customization
    if (platform === 'android') {
      options.androidOptions = {
        promptInfo: {
          title: config.title,
          subtitle: config.subtitle,
          description: config.description,
          negativeButtonText: config.fallbackText
        }
      };
    } else if (platform === 'ios') {
      options.iosOptions = {
        localizedFallbackTitle: config.fallbackText
      };
    }
    
    return await BiometricAuth.authenticate(options);
  }
}
```

## Custom Authentication Flow UI

### Complete Custom Flow

```typescript
class CustomBiometricFlow {
  async showAuthenticationFlow() {
    // 1. Check availability with custom UI
    const availability = await this.checkWithUI();
    if (!availability) return;
    
    // 2. Show pre-authentication screen
    await this.showPreAuthScreen();
    
    // 3. Perform authentication
    const result = await this.authenticateWithUI();
    
    // 4. Show result
    await this.showResultScreen(result);
  }
  
  private async checkWithUI() {
    const { isAvailable, reason } = await BiometricAuth.isAvailable();
    
    if (!isAvailable) {
      // Show custom unavailable UI
      this.showUnavailableDialog({
        title: 'Biometric Not Available',
        message: this.getReasonMessage(reason),
        actions: [
          {
            text: 'Go to Settings',
            handler: () => this.openDeviceSettings()
          },
          {
            text: 'Use Password',
            handler: () => this.showPasswordLogin()
          }
        ]
      });
      return false;
    }
    
    return true;
  }
  
  private async showPreAuthScreen() {
    // Show instruction screen
    const { supportedBiometrics } = await BiometricAuth.getSupportedBiometrics();
    
    this.showInstructionDialog({
      title: 'Ready to Authenticate',
      icon: this.getBiometricIcon(supportedBiometrics),
      message: this.getInstructionText(supportedBiometrics),
      continueButton: 'Authenticate Now'
    });
  }
  
  private getInstructionText(types: BiometricType[]): string {
    if (types.includes(BiometricType.FACE_ID)) {
      return 'Look at your device when prompted';
    } else if (types.includes(BiometricType.FINGERPRINT)) {
      return 'Place your finger on the sensor when prompted';
    }
    return 'Follow the on-screen instructions';
  }
}
```

## Accessibility Considerations

### Voice Over / TalkBack Support

```typescript
// Provide accessible descriptions
await BiometricAuth.authenticate({
  reason: 'Double tap to authenticate with your fingerprint',
  androidOptions: {
    promptInfo: {
      title: 'Fingerprint Authentication',
      description: 'Place and hold your finger on the sensor until you feel a vibration'
    }
  }
});
```

### High Contrast Mode

```typescript
// Detect high contrast mode
const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

// Adjust UI accordingly
const buttonStyle = isHighContrast ? {
  backgroundColor: '#000',
  color: '#FFF',
  border: '2px solid #FFF'
} : {
  backgroundColor: '#007AFF',
  color: '#FFF',
  border: 'none'
};
```

## Animation and Feedback

### Success/Failure Animations

```typescript
class BiometricFeedback {
  async showSuccess() {
    // Haptic feedback (if available)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Visual feedback
    this.showAnimation({
      type: 'success',
      icon: '✓',
      color: '#4CAF50',
      duration: 1000
    });
  }
  
  async showFailure(error: any) {
    // Different feedback for different errors
    const feedback = this.getErrorFeedback(error.code);
    
    // Haptic pattern for errors
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]); // Three short vibrations
    }
    
    this.showAnimation({
      type: 'error',
      icon: feedback.icon,
      color: '#F44336',
      message: feedback.message,
      duration: 2000
    });
  }
  
  private getErrorFeedback(code: string) {
    const feedback = {
      'USER_CANCELLED': {
        icon: '✕',
        message: 'Authentication cancelled'
      },
      'LOCKOUT': {
        icon: '🔒',
        message: 'Too many attempts. Try again later'
      },
      'NOT_ENROLLED': {
        icon: '⚠️',
        message: 'No biometrics enrolled'
      }
    };
    
    return feedback[code] || {
      icon: '⚠️',
      message: 'Authentication failed'
    };
  }
}
```

## Testing UI Customization

### Multi-Language Testing

```typescript
const testLanguages = ['en', 'es', 'fr', 'de', 'ja'];

for (const lang of testLanguages) {
  console.log(`Testing ${lang} localization...`);
  
  await BiometricAuth.authenticate({
    reason: getLocalizedString(lang, 'authReason'),
    fallbackButtonTitle: getLocalizedString(lang, 'fallback')
  });
}
```

### Theme Testing

```typescript
// Test different visual themes
const themes = ['light', 'dark', 'highContrast'];

for (const theme of themes) {
  document.body.className = `theme-${theme}`;
  
  await BiometricAuth.authenticate({
    reason: `Testing ${theme} theme`
  });
}
```

## Best Practices

1. **Keep text concise** - Dialog space is limited
2. **Use clear CTAs** - Make button purposes obvious
3. **Provide context** - Explain why authentication is needed
4. **Be consistent** - Use similar language across platforms
5. **Support localization** - Prepare for international users
6. **Test accessibility** - Ensure screen readers work properly
7. **Handle errors gracefully** - Provide helpful error messages