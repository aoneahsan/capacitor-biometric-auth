# Session Management Guide

This guide covers advanced session management techniques for the `capacitor-biometric-authentication` plugin, including session lifecycle, persistence, and security.

## Session Overview

The plugin provides built-in session management to:
- Reduce authentication frequency
- Improve user experience
- Maintain security standards
- Handle app lifecycle events

## Basic Session Configuration

### Setting Session Duration

```typescript
await BiometricAuth.configure({
  sessionDuration: 1800000, // 30 minutes in milliseconds
  sessionKey: 'myapp_biometric_session' // Custom session key
});
```

### Session Duration Guidelines

| Use Case | Recommended Duration | Example |
|----------|---------------------|---------|
| Banking | 5-10 minutes | `300000` |
| E-commerce | 15-30 minutes | `900000` |
| Social Media | 1-2 hours | `3600000` |
| Utility Apps | 4-24 hours | `14400000` |

## Advanced Session Management

### Custom Session Manager

```typescript
class AdvancedSessionManager {
  private sessionStartTime: number | null = null;
  private lastActivityTime: number | null = null;
  private sessionConfig: SessionConfig;
  
  constructor(config: SessionConfig) {
    this.sessionConfig = {
      maxDuration: config.maxDuration || 3600000, // 1 hour
      idleTimeout: config.idleTimeout || 300000,   // 5 minutes
      requireReauthAfter: config.requireReauthAfter || 1800000, // 30 minutes
      extendOnActivity: config.extendOnActivity ?? true
    };
  }
  
  async startSession(): Promise<boolean> {
    try {
      const result = await BiometricAuth.authenticate({
        reason: 'Start secure session'
      });
      
      if (result.isAuthenticated) {
        this.sessionStartTime = Date.now();
        this.lastActivityTime = Date.now();
        await this.persistSession();
        return true;
      }
    } catch (error) {
      console.error('Session start failed:', error);
    }
    
    return false;
  }
  
  async validateSession(): Promise<SessionStatus> {
    const now = Date.now();
    
    // Check if session exists
    if (!this.sessionStartTime || !this.lastActivityTime) {
      const restored = await this.restoreSession();
      if (!restored) {
        return { valid: false, reason: 'no_session' };
      }
    }
    
    // Check max duration
    if (now - this.sessionStartTime! > this.sessionConfig.maxDuration) {
      await this.endSession();
      return { valid: false, reason: 'max_duration_exceeded' };
    }
    
    // Check idle timeout
    if (now - this.lastActivityTime! > this.sessionConfig.idleTimeout) {
      await this.endSession();
      return { valid: false, reason: 'idle_timeout' };
    }
    
    // Check if re-authentication required
    if (now - this.sessionStartTime! > this.sessionConfig.requireReauthAfter) {
      return { valid: false, reason: 'reauth_required' };
    }
    
    // Extend session on activity
    if (this.sessionConfig.extendOnActivity) {
      this.lastActivityTime = now;
      await this.persistSession();
    }
    
    return { valid: true };
  }
  
  async requireAuthentication(reason?: string): Promise<boolean> {
    const status = await this.validateSession();
    
    if (status.valid) {
      return true;
    }
    
    // Determine authentication message
    const authReason = reason || this.getAuthReason(status.reason);
    
    try {
      const result = await BiometricAuth.authenticate({
        reason: authReason,
        disableBackup: status.reason === 'reauth_required'
      });
      
      if (result.isAuthenticated) {
        if (status.reason === 'reauth_required') {
          // Extend existing session
          this.sessionStartTime = Date.now();
        } else {
          // Start new session
          await this.startSession();
        }
        return true;
      }
    } catch (error) {
      console.error('Re-authentication failed:', error);
    }
    
    return false;
  }
  
  private getAuthReason(reason?: string): string {
    const reasons = {
      'no_session': 'Please authenticate to start a secure session',
      'max_duration_exceeded': 'Your session has expired. Please re-authenticate',
      'idle_timeout': 'Session timed out due to inactivity',
      'reauth_required': 'Please re-authenticate to continue'
    };
    
    return reasons[reason || 'no_session'];
  }
  
  private async persistSession() {
    const sessionData = {
      startTime: this.sessionStartTime,
      lastActivity: this.lastActivityTime,
      config: this.sessionConfig
    };
    
    // Encrypt and store
    const encrypted = await this.encryptData(sessionData);
    await Preferences.set({
      key: 'biometric_session',
      value: encrypted
    });
  }
  
  private async restoreSession(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'biometric_session' });
      if (!value) return false;
      
      const sessionData = await this.decryptData(value);
      this.sessionStartTime = sessionData.startTime;
      this.lastActivityTime = sessionData.lastActivity;
      
      // Validate restored session
      const status = await this.validateSession();
      return status.valid;
    } catch (error) {
      console.error('Session restore failed:', error);
      return false;
    }
  }
  
  async endSession() {
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    
    await Preferences.remove({ key: 'biometric_session' });
    await BiometricAuth.deleteCredentials();
  }
}
```

### Activity-Based Session Extension

```typescript
class ActivityTracker {
  private sessionManager: AdvancedSessionManager;
  private activityListeners: (() => void)[] = [];
  
  constructor(sessionManager: AdvancedSessionManager) {
    this.sessionManager = sessionManager;
    this.setupActivityListeners();
  }
  
  private setupActivityListeners() {
    // User interaction events
    const events = ['click', 'touchstart', 'keypress', 'scroll'];
    
    events.forEach(event => {
      const listener = () => this.handleActivity();
      document.addEventListener(event, listener, { passive: true });
      this.activityListeners.push(() => 
        document.removeEventListener(event, listener)
      );
    });
    
    // App state changes
    const stateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.handleActivity();
      }
    });
    
    this.activityListeners.push(() => stateListener.remove());
  }
  
  private async handleActivity() {
    const status = await this.sessionManager.validateSession();
    
    if (!status.valid && status.reason === 'idle_timeout') {
      // Session expired due to inactivity
      this.showReauthPrompt();
    }
  }
  
  private showReauthPrompt() {
    // Show non-intrusive prompt
    const prompt = {
      message: 'Your session has expired',
      action: 'Tap to re-authenticate',
      onClick: () => this.sessionManager.requireAuthentication()
    };
    
    this.displayPrompt(prompt);
  }
  
  destroy() {
    this.activityListeners.forEach(remove => remove());
    this.activityListeners = [];
  }
}
```

## Multi-Level Session Security

### Implementing Security Levels

```typescript
enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

class MultiLevelSessionManager {
  private currentLevel: SecurityLevel = SecurityLevel.LOW;
  private levelTimestamps: Map<SecurityLevel, number> = new Map();
  
  async elevateSession(
    requiredLevel: SecurityLevel,
    reason: string
  ): Promise<boolean> {
    // Check if already at required level
    if (this.isLevelValid(requiredLevel)) {
      return true;
    }
    
    // Determine authentication requirements
    const authConfig = this.getAuthConfig(requiredLevel);
    
    try {
      const result = await BiometricAuth.authenticate({
        reason: reason,
        ...authConfig
      });
      
      if (result.isAuthenticated) {
        this.currentLevel = requiredLevel;
        this.levelTimestamps.set(requiredLevel, Date.now());
        return true;
      }
    } catch (error) {
      console.error('Session elevation failed:', error);
    }
    
    return false;
  }
  
  private isLevelValid(level: SecurityLevel): boolean {
    const timestamp = this.levelTimestamps.get(level);
    if (!timestamp) return false;
    
    const maxAge = this.getMaxAge(level);
    return Date.now() - timestamp < maxAge;
  }
  
  private getMaxAge(level: SecurityLevel): number {
    const maxAges = {
      [SecurityLevel.LOW]: 3600000,    // 1 hour
      [SecurityLevel.MEDIUM]: 900000,   // 15 minutes
      [SecurityLevel.HIGH]: 300000      // 5 minutes
    };
    
    return maxAges[level];
  }
  
  private getAuthConfig(level: SecurityLevel): any {
    const configs = {
      [SecurityLevel.LOW]: {
        disableBackup: false,
        maxAttempts: 3
      },
      [SecurityLevel.MEDIUM]: {
        disableBackup: true,
        maxAttempts: 2
      },
      [SecurityLevel.HIGH]: {
        disableBackup: true,
        maxAttempts: 1,
        androidOptions: {
          confirmationRequired: true
        }
      }
    };
    
    return configs[level];
  }
  
  // Usage example
  async performSensitiveAction() {
    const elevated = await this.elevateSession(
      SecurityLevel.HIGH,
      'Authenticate to perform sensitive action'
    );
    
    if (elevated) {
      // Perform action
      await this.executeSensitiveOperation();
      
      // Downgrade after completion
      this.currentLevel = SecurityLevel.MEDIUM;
    }
  }
}
```

## Cross-Platform Session Persistence

### Unified Session Storage

```typescript
class CrossPlatformSessionStore {
  private readonly STORAGE_KEY = 'biometric_session_data';
  
  async saveSession(sessionData: SessionData): Promise<void> {
    const platform = Capacitor.getPlatform();
    const encrypted = await this.encryptSessionData(sessionData);
    
    if (platform === 'web') {
      // Use secure storage for web
      await this.saveToSecureStorage(encrypted);
    } else {
      // Use Capacitor Preferences for native
      await Preferences.set({
        key: this.STORAGE_KEY,
        value: JSON.stringify(encrypted)
      });
    }
  }
  
  async loadSession(): Promise<SessionData | null> {
    try {
      const platform = Capacitor.getPlatform();
      let encrypted: any;
      
      if (platform === 'web') {
        encrypted = await this.loadFromSecureStorage();
      } else {
        const { value } = await Preferences.get({ key: this.STORAGE_KEY });
        encrypted = value ? JSON.parse(value) : null;
      }
      
      if (!encrypted) return null;
      
      return await this.decryptSessionData(encrypted);
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }
  
  private async saveToSecureStorage(data: any): Promise<void> {
    // Web implementation with encryption
    const key = await this.deriveKey();
    const encrypted = await this.encrypt(data, key);
    
    localStorage.setItem(this.STORAGE_KEY, encrypted);
  }
  
  private async loadFromSecureStorage(): Promise<any> {
    const encrypted = localStorage.getItem(this.STORAGE_KEY);
    if (!encrypted) return null;
    
    const key = await this.deriveKey();
    return await this.decrypt(encrypted, key);
  }
  
  private async encryptSessionData(data: SessionData): Promise<any> {
    // Platform-specific encryption
    const platform = Capacitor.getPlatform();
    
    if (platform === 'android') {
      // Use Android Keystore
      return this.androidEncrypt(data);
    } else if (platform === 'ios') {
      // Use iOS Keychain
      return this.iosEncrypt(data);
    } else {
      // Use Web Crypto API
      return this.webEncrypt(data);
    }
  }
}
```

## Session Lifecycle Management

### Complete Lifecycle Handler

```typescript
class SessionLifecycleManager {
  private session: Session | null = null;
  private listeners: Map<SessionEvent, Function[]> = new Map();
  
  constructor() {
    this.setupLifecycleListeners();
  }
  
  private setupLifecycleListeners() {
    // App lifecycle
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.handleAppResume();
      } else {
        this.handleAppPause();
      }
    });
    
    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });
    
    // Network status
    Network.addListener('networkStatusChange', status => {
      if (status.connected) {
        this.handleNetworkReconnect();
      }
    });
  }
  
  private async handleAppResume() {
    console.log('App resumed');
    
    // Check session validity
    if (this.session) {
      const valid = await this.validateSession();
      
      if (!valid) {
        this.emit('sessionExpired', { reason: 'app_resume' });
        await this.promptReauthentication();
      } else {
        this.emit('sessionResumed', { session: this.session });
      }
    }
  }
  
  private async handleAppPause() {
    console.log('App paused');
    
    // Save session state
    if (this.session) {
      await this.persistSession();
      this.emit('sessionPaused', { session: this.session });
    }
  }
  
  private async handlePageHidden() {
    // Start inactivity timer
    this.startInactivityTimer();
  }
  
  private async handlePageVisible() {
    // Cancel inactivity timer
    this.cancelInactivityTimer();
    
    // Check if re-authentication needed
    if (this.needsReauthentication()) {
      await this.promptReauthentication();
    }
  }
  
  private async handleNetworkReconnect() {
    // Sync session state with server
    if (this.session) {
      await this.syncSessionWithServer();
    }
  }
  
  on(event: SessionEvent, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
  }
  
  private emit(event: SessionEvent, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}

// Usage
const lifecycle = new SessionLifecycleManager();

lifecycle.on('sessionExpired', async ({ reason }) => {
  console.log('Session expired:', reason);
  // Handle expiration
});

lifecycle.on('sessionResumed', ({ session }) => {
  console.log('Session resumed:', session);
  // Restore UI state
});
```

## Session Analytics

### Tracking Session Metrics

```typescript
class SessionAnalytics {
  private metrics: SessionMetrics = {
    totalSessions: 0,
    averageDuration: 0,
    authenticationAttempts: 0,
    successfulAuthentications: 0,
    sessionTimeouts: 0,
    reauthentications: 0
  };
  
  trackSessionStart() {
    this.metrics.totalSessions++;
    
    return {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      platform: Capacitor.getPlatform()
    };
  }
  
  trackSessionEnd(session: any) {
    const duration = Date.now() - session.startTime;
    
    // Update average duration
    this.metrics.averageDuration = 
      (this.metrics.averageDuration * (this.metrics.totalSessions - 1) + duration) 
      / this.metrics.totalSessions;
    
    // Send to analytics service
    this.sendAnalytics({
      event: 'session_end',
      sessionId: session.sessionId,
      duration: duration,
      endReason: session.endReason
    });
  }
  
  trackAuthenticationAttempt(result: boolean) {
    this.metrics.authenticationAttempts++;
    
    if (result) {
      this.metrics.successfulAuthentications++;
    }
    
    // Calculate success rate
    const successRate = 
      (this.metrics.successfulAuthentications / this.metrics.authenticationAttempts) * 100;
    
    if (successRate < 80) {
      console.warn('Low authentication success rate:', successRate);
    }
  }
  
  getMetrics(): SessionMetrics {
    return {
      ...this.metrics,
      successRate: this.calculateSuccessRate(),
      averageSessionDuration: this.formatDuration(this.metrics.averageDuration)
    };
  }
  
  private calculateSuccessRate(): string {
    if (this.metrics.authenticationAttempts === 0) return '0%';
    
    const rate = (this.metrics.successfulAuthentications / 
                  this.metrics.authenticationAttempts) * 100;
    
    return `${rate.toFixed(2)}%`;
  }
  
  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }
}
```

## Testing Session Management

### Session Test Suite

```typescript
class SessionTestSuite {
  async runTests() {
    console.group('Session Management Tests');
    
    await this.testSessionCreation();
    await this.testSessionExpiry();
    await this.testIdleTimeout();
    await this.testSessionPersistence();
    await this.testConcurrentSessions();
    
    console.groupEnd();
  }
  
  private async testSessionCreation() {
    console.log('Testing session creation...');
    
    const manager = new AdvancedSessionManager({
      maxDuration: 60000, // 1 minute for testing
      idleTimeout: 30000  // 30 seconds
    });
    
    const started = await manager.startSession();
    console.assert(started, 'Session should start successfully');
    
    const status = await manager.validateSession();
    console.assert(status.valid, 'New session should be valid');
  }
  
  private async testSessionExpiry() {
    console.log('Testing session expiry...');
    
    const manager = new AdvancedSessionManager({
      maxDuration: 100, // 100ms for quick testing
      idleTimeout: 1000
    });
    
    await manager.startSession();
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const status = await manager.validateSession();
    console.assert(!status.valid, 'Session should be expired');
    console.assert(
      status.reason === 'max_duration_exceeded',
      'Should expire due to max duration'
    );
  }
  
  // Additional test methods...
}

// Run tests
const tester = new SessionTestSuite();
await tester.runTests();
```

## Best Practices

1. **Choose appropriate session durations** based on security requirements
2. **Implement idle timeout** for inactive sessions
3. **Persist sessions securely** across app restarts
4. **Handle app lifecycle events** properly
5. **Track session metrics** for optimization
6. **Test edge cases** thoroughly
7. **Provide clear re-authentication prompts**
8. **Implement gradual security elevation** for sensitive operations