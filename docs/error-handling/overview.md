# Error Handling Overview

This guide provides comprehensive information about error handling in the `capacitor-biometric-authentication` plugin, including error types, codes, and recovery strategies.

## Error Structure

All errors thrown by the plugin follow this structure:

```typescript
interface BiometricError {
  code: BiometricErrorCode;    // Standardized error code
  message: string;              // Human-readable message
  details?: any;                // Platform-specific details
}
```

## Error Codes

### Complete Error Code Reference

```typescript
enum BiometricErrorCode {
  // User Actions
  USER_CANCELLED = 'USER_CANCELLED',
  USER_FALLBACK = 'USER_FALLBACK',
  
  // Authentication Failures
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  LOCKOUT = 'LOCKOUT',
  LOCKOUT_PERMANENT = 'LOCKOUT_PERMANENT',
  
  // System Issues
  SYSTEM_CANCELLED = 'SYSTEM_CANCELLED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Configuration Issues
  BIOMETRIC_NOT_ENROLLED = 'BIOMETRIC_NOT_ENROLLED',
  
  // General
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## Error Handling Patterns

### Basic Error Handling

```typescript
try {
  const result = await BiometricAuth.authenticate({
    reason: 'Please authenticate'
  });
  
  if (result.isAuthenticated) {
    // Success flow
  }
} catch (error: any) {
  // Handle error based on code
  switch (error.code) {
    case BiometricErrorCode.USER_CANCELLED:
      // User cancelled - no action needed
      break;
      
    case BiometricErrorCode.AUTHENTICATION_FAILED:
      // Wrong biometric - allow retry
      showError('Authentication failed. Please try again.');
      break;
      
    case BiometricErrorCode.LOCKOUT:
      // Too many attempts - wait
      showError('Too many attempts. Please wait 30 seconds.');
      break;
      
    default:
      // Generic error handling
      showError('An error occurred. Please try again.');
  }
}
```

### Advanced Error Handling

```typescript
class BiometricErrorHandler {
  private retryCount = 0;
  private readonly maxRetries = 3;
  
  async authenticateWithRetry(): Promise<boolean> {
    try {
      const result = await BiometricAuth.authenticate({
        reason: 'Authenticate to continue'
      });
      
      this.retryCount = 0; // Reset on success
      return result.isAuthenticated;
      
    } catch (error: any) {
      return this.handleError(error);
    }
  }
  
  private async handleError(error: BiometricError): Promise<boolean> {
    console.error('Biometric error:', error);
    
    switch (error.code) {
      case BiometricErrorCode.USER_CANCELLED:
        // User explicitly cancelled
        this.showMessage('Authentication cancelled');
        return false;
        
      case BiometricErrorCode.USER_FALLBACK:
        // User chose fallback option
        return this.handleFallback();
        
      case BiometricErrorCode.AUTHENTICATION_FAILED:
        // Biometric not recognized
        return this.handleFailedAttempt();
        
      case BiometricErrorCode.LOCKOUT:
        // Temporary lockout
        return this.handleLockout(false);
        
      case BiometricErrorCode.LOCKOUT_PERMANENT:
        // Permanent lockout
        return this.handleLockout(true);
        
      case BiometricErrorCode.SYSTEM_CANCELLED:
        // System interrupted (e.g., app backgrounded)
        return this.handleSystemInterruption();
        
      case BiometricErrorCode.NOT_AVAILABLE:
        // Biometric not available
        return this.handleNotAvailable();
        
      case BiometricErrorCode.PERMISSION_DENIED:
        // Permission issue
        return this.handlePermissionDenied();
        
      case BiometricErrorCode.BIOMETRIC_NOT_ENROLLED:
        // No biometrics enrolled
        return this.handleNotEnrolled();
        
      default:
        // Unknown error
        return this.handleUnknownError(error);
    }
  }
  
  private async handleFailedAttempt(): Promise<boolean> {
    this.retryCount++;
    
    if (this.retryCount >= this.maxRetries) {
      this.showMessage('Maximum attempts exceeded. Please use password.');
      return false;
    }
    
    this.showMessage(
      `Authentication failed. ${this.maxRetries - this.retryCount} attempts remaining.`
    );
    
    // Allow retry after delay
    await this.delay(1000);
    return this.authenticateWithRetry();
  }
  
  private async handleLockout(isPermanent: boolean): Promise<boolean> {
    if (isPermanent) {
      this.showMessage(
        'Biometric locked. Please unlock your device with PIN/Password to reset.'
      );
      // Guide to device unlock
      this.showDeviceUnlockGuide();
    } else {
      this.showMessage(
        'Too many failed attempts. Please wait 30 seconds and try again.'
      );
      // Start countdown timer
      this.startLockoutTimer(30);
    }
    
    return false;
  }
  
  private handleNotEnrolled(): boolean {
    this.showMessage(
      'No biometrics enrolled. Please set up biometrics in device settings.'
    );
    
    // Offer to open settings
    this.showAction('Open Settings', () => {
      this.openBiometricSettings();
    });
    
    return false;
  }
  
  private handleSystemInterruption(): Promise<boolean> {
    this.showMessage('Authentication interrupted. Please try again.');
    
    // Retry automatically after short delay
    return new Promise(resolve => {
      setTimeout(() => {
        this.authenticateWithRetry().then(resolve);
      }, 500);
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Platform-Specific Error Handling

### Android Error Mapping

```typescript
// Android BiometricPrompt error codes to plugin error codes
const androidErrorMap = {
  ERROR_CANCELED: BiometricErrorCode.USER_CANCELLED,
  ERROR_LOCKOUT: BiometricErrorCode.LOCKOUT,
  ERROR_LOCKOUT_PERMANENT: BiometricErrorCode.LOCKOUT_PERMANENT,
  ERROR_USER_CANCELED: BiometricErrorCode.USER_CANCELLED,
  ERROR_NEGATIVE_BUTTON: BiometricErrorCode.USER_FALLBACK,
  ERROR_NO_BIOMETRICS: BiometricErrorCode.BIOMETRIC_NOT_ENROLLED,
  ERROR_HW_NOT_PRESENT: BiometricErrorCode.NOT_AVAILABLE,
  ERROR_HW_UNAVAILABLE: BiometricErrorCode.NOT_AVAILABLE,
  ERROR_UNABLE_TO_PROCESS: BiometricErrorCode.AUTHENTICATION_FAILED,
  ERROR_TIMEOUT: BiometricErrorCode.SYSTEM_CANCELLED,
  ERROR_NO_SPACE: BiometricErrorCode.UNKNOWN_ERROR,
  ERROR_VENDOR: BiometricErrorCode.UNKNOWN_ERROR
};
```

### iOS Error Mapping

```typescript
// iOS LAError codes to plugin error codes
const iosErrorMap = {
  LAErrorAuthenticationFailed: BiometricErrorCode.AUTHENTICATION_FAILED,
  LAErrorUserCancel: BiometricErrorCode.USER_CANCELLED,
  LAErrorUserFallback: BiometricErrorCode.USER_FALLBACK,
  LAErrorSystemCancel: BiometricErrorCode.SYSTEM_CANCELLED,
  LAErrorBiometryNotAvailable: BiometricErrorCode.NOT_AVAILABLE,
  LAErrorBiometryNotEnrolled: BiometricErrorCode.BIOMETRIC_NOT_ENROLLED,
  LAErrorBiometryLockout: BiometricErrorCode.LOCKOUT,
  LAErrorAppCancel: BiometricErrorCode.SYSTEM_CANCELLED,
  LAErrorInvalidContext: BiometricErrorCode.UNKNOWN_ERROR,
  LAErrorNotInteractive: BiometricErrorCode.UNKNOWN_ERROR
};
```

### Web Error Mapping

```typescript
// WebAuthn error names to plugin error codes
const webErrorMap = {
  'NotAllowedError': BiometricErrorCode.USER_CANCELLED,
  'SecurityError': BiometricErrorCode.PERMISSION_DENIED,
  'AbortError': BiometricErrorCode.SYSTEM_CANCELLED,
  'ConstraintError': BiometricErrorCode.NOT_AVAILABLE,
  'InvalidStateError': BiometricErrorCode.UNKNOWN_ERROR,
  'NotSupportedError': BiometricErrorCode.NOT_AVAILABLE,
  'UnknownError': BiometricErrorCode.UNKNOWN_ERROR
};
```

## Error Recovery Strategies

### Automatic Retry Logic

```typescript
class SmartRetryHandler {
  private readonly retryDelays = [1000, 2000, 5000]; // Progressive delays
  
  async authenticateWithSmartRetry(
    maxAttempts: number = 3
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await BiometricAuth.authenticate({
          reason: 'Please authenticate',
          maxAttempts: 1 // Single attempt per try
        });
        
        return result.isAuthenticated;
        
      } catch (error: any) {
        // Don't retry for user actions
        if (this.isUserAction(error.code)) {
          return false;
        }
        
        // Don't retry for permanent errors
        if (this.isPermanentError(error.code)) {
          this.handlePermanentError(error);
          return false;
        }
        
        // Retry with delay for temporary errors
        if (attempt < maxAttempts - 1) {
          const delay = this.retryDelays[attempt] || 5000;
          await this.showRetryMessage(attempt + 1, maxAttempts, delay);
          await this.delay(delay);
          continue;
        }
        
        // Final attempt failed
        this.handleFinalFailure(error);
        return false;
      }
    }
    
    return false;
  }
  
  private isUserAction(code: BiometricErrorCode): boolean {
    return [
      BiometricErrorCode.USER_CANCELLED,
      BiometricErrorCode.USER_FALLBACK
    ].includes(code);
  }
  
  private isPermanentError(code: BiometricErrorCode): boolean {
    return [
      BiometricErrorCode.LOCKOUT_PERMANENT,
      BiometricErrorCode.PERMISSION_DENIED,
      BiometricErrorCode.BIOMETRIC_NOT_ENROLLED
    ].includes(code);
  }
}
```

### Fallback Authentication

```typescript
class FallbackAuthHandler {
  async authenticateWithFallback(): Promise<boolean> {
    try {
      // Try biometric first
      const result = await BiometricAuth.authenticate({
        reason: 'Authenticate with biometric',
        fallbackButtonTitle: 'Use Password'
      });
      
      return result.isAuthenticated;
      
    } catch (error: any) {
      if (error.code === BiometricErrorCode.USER_FALLBACK) {
        // User chose fallback
        return this.showPasswordAuth();
      }
      
      // Other errors - offer fallback
      const useFallback = await this.confirmFallback(error);
      if (useFallback) {
        return this.showPasswordAuth();
      }
      
      return false;
    }
  }
  
  private async confirmFallback(error: BiometricError): Promise<boolean> {
    const message = this.getErrorMessage(error);
    
    return new Promise(resolve => {
      this.showDialog({
        title: 'Authentication Failed',
        message: message,
        buttons: [
          {
            text: 'Try Again',
            handler: () => resolve(false)
          },
          {
            text: 'Use Password',
            handler: () => resolve(true)
          }
        ]
      });
    });
  }
}
```

## Error Logging and Monitoring

### Structured Error Logging

```typescript
class BiometricErrorLogger {
  logError(error: BiometricError, context: any) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      errorMessage: error.message,
      platform: Capacitor.getPlatform(),
      context: {
        ...context,
        deviceInfo: this.getDeviceInfo(),
        appVersion: this.getAppVersion()
      },
      stack: error.stack || 'No stack trace'
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Biometric Error:', errorLog);
    }
    
    // Send to analytics/monitoring service
    this.sendToMonitoring(errorLog);
  }
  
  private sendToMonitoring(errorLog: any) {
    // Example: Sentry
    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(new Error(errorLog.errorMessage), {
        tags: {
          errorCode: errorLog.errorCode,
          platform: errorLog.platform
        },
        extra: errorLog.context
      });
    }
    
    // Example: Custom analytics
    if (typeof analytics !== 'undefined') {
      analytics.track('biometric_error', {
        error_code: errorLog.errorCode,
        platform: errorLog.platform
      });
    }
  }
}
```

## User-Friendly Error Messages

### Error Message Mapping

```typescript
const userFriendlyMessages: Record<BiometricErrorCode, string> = {
  [BiometricErrorCode.USER_CANCELLED]: 
    'Authentication cancelled',
    
  [BiometricErrorCode.USER_FALLBACK]: 
    'Please enter your password',
    
  [BiometricErrorCode.AUTHENTICATION_FAILED]: 
    'Biometric not recognized. Please try again.',
    
  [BiometricErrorCode.LOCKOUT]: 
    'Too many failed attempts. Please wait 30 seconds.',
    
  [BiometricErrorCode.LOCKOUT_PERMANENT]: 
    'Biometric is locked. Unlock your device to reset.',
    
  [BiometricErrorCode.SYSTEM_CANCELLED]: 
    'Authentication was interrupted. Please try again.',
    
  [BiometricErrorCode.NOT_AVAILABLE]: 
    'Biometric authentication is not available.',
    
  [BiometricErrorCode.PERMISSION_DENIED]: 
    'Permission denied. Please check your settings.',
    
  [BiometricErrorCode.BIOMETRIC_NOT_ENROLLED]: 
    'No biometrics enrolled. Please set up in device settings.',
    
  [BiometricErrorCode.UNKNOWN_ERROR]: 
    'An unexpected error occurred. Please try again.'
};

function getUserMessage(error: BiometricError): string {
  return userFriendlyMessages[error.code] || 
         'Authentication failed. Please try again.';
}
```

## Testing Error Scenarios

### Error Simulation

```typescript
// Simulate different error scenarios for testing
class BiometricErrorSimulator {
  async simulateError(errorCode: BiometricErrorCode) {
    // Create mock error
    const error: BiometricError = {
      code: errorCode,
      message: `Simulated error: ${errorCode}`,
      details: { simulated: true }
    };
    
    // Trigger error handler
    const handler = new BiometricErrorHandler();
    await handler.handleError(error);
  }
  
  async runAllErrorScenarios() {
    const scenarios = Object.values(BiometricErrorCode);
    
    for (const errorCode of scenarios) {
      console.log(`Testing error: ${errorCode}`);
      await this.simulateError(errorCode);
      await this.delay(2000); // Wait between tests
    }
  }
}
```

## Best Practices

1. **Always handle errors** - Never leave catch blocks empty
2. **Log strategically** - Log errors with context for debugging
3. **User-friendly messages** - Show clear, actionable messages
4. **Offer alternatives** - Provide fallback options when possible
5. **Retry intelligently** - Don't retry user-cancelled actions
6. **Monitor in production** - Track error rates and patterns
7. **Test error paths** - Ensure error handling works correctly