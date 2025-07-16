# Integration Examples

This guide provides real-world integration examples for the `capacitor-biometric-authentication` plugin with popular frameworks and authentication systems.

## Framework Integrations

### React Integration

#### React Hook Implementation

```typescript
// hooks/useBiometricAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { BiometricAuth, BiometricAuthResult, BiometricErrorCode } from 'capacitor-biometric-authentication';

interface UseBiometricAuthReturn {
  isAvailable: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  authenticate: (reason?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAvailability: () => Promise<void>;
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = useCallback(async () => {
    try {
      const { isAvailable } = await BiometricAuth.isAvailable();
      setIsAvailable(isAvailable);
    } catch (err) {
      console.error('Biometric availability check failed:', err);
      setIsAvailable(false);
    }
  }, []);

  const authenticate = useCallback(async (reason = 'Authenticate to continue') => {
    if (!isAvailable) {
      setError(new Error('Biometric authentication not available'));
      return false;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await BiometricAuth.authenticate({ reason });
      setIsAuthenticated(result.isAuthenticated);
      return result.isAuthenticated;
    } catch (err: any) {
      setError(err);
      setIsAuthenticated(false);
      
      // Handle specific errors
      if (err.code === BiometricErrorCode.USER_CANCELLED) {
        // User cancelled - don't show error
        setError(null);
      }
      
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAvailable]);

  const logout = useCallback(async () => {
    try {
      await BiometricAuth.deleteCredentials();
      setIsAuthenticated(false);
    } catch (err: any) {
      setError(err);
    }
  }, []);

  return {
    isAvailable,
    isAuthenticating,
    isAuthenticated,
    error,
    authenticate,
    logout,
    checkAvailability
  };
}
```

#### React Component Example

```tsx
// components/BiometricLogin.tsx
import React from 'react';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { BiometricErrorCode } from 'capacitor-biometric-authentication';

export function BiometricLogin({ onSuccess }: { onSuccess: () => void }) {
  const { 
    isAvailable, 
    isAuthenticating, 
    error, 
    authenticate 
  } = useBiometricAuth();

  const handleAuthenticate = async () => {
    const success = await authenticate('Sign in to your account');
    if (success) {
      onSuccess();
    }
  };

  const getErrorMessage = () => {
    if (!error) return null;
    
    switch ((error as any).code) {
      case BiometricErrorCode.LOCKOUT:
        return 'Too many attempts. Please try again later.';
      case BiometricErrorCode.BIOMETRIC_NOT_ENROLLED:
        return 'No biometrics enrolled. Please set up in device settings.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  if (!isAvailable) {
    return (
      <div className="biometric-unavailable">
        <p>Biometric authentication is not available on this device.</p>
        <button onClick={() => window.location.href = '/login'}>
          Use Password
        </button>
      </div>
    );
  }

  return (
    <div className="biometric-login">
      <h2>Quick Sign In</h2>
      <button 
        onClick={handleAuthenticate}
        disabled={isAuthenticating}
        className="biometric-button"
      >
        {isAuthenticating ? 'Authenticating...' : 'Sign in with Biometric'}
      </button>
      
      {error && (
        <div className="error-message">
          {getErrorMessage()}
        </div>
      )}
      
      <a href="/login" className="fallback-link">
        Use password instead
      </a>
    </div>
  );
}
```

### Vue 3 Integration

#### Vue Composable

```typescript
// composables/biometricAuth.ts
import { ref, onMounted } from 'vue';
import { BiometricAuth, BiometricType } from 'capacitor-biometric-authentication';

export function useBiometricAuth() {
  const isAvailable = ref(false);
  const isAuthenticating = ref(false);
  const supportedTypes = ref<BiometricType[]>([]);
  const error = ref<Error | null>(null);

  const checkAvailability = async () => {
    try {
      const result = await BiometricAuth.isAvailable();
      isAvailable.value = result.isAvailable;
      
      if (result.isAvailable) {
        const types = await BiometricAuth.getSupportedBiometrics();
        supportedTypes.value = types.supportedBiometrics;
      }
    } catch (err) {
      console.error('Failed to check biometric availability:', err);
      isAvailable.value = false;
    }
  };

  const authenticate = async (reason = 'Authenticate to continue') => {
    if (!isAvailable.value) {
      error.value = new Error('Biometric not available');
      return false;
    }

    isAuthenticating.value = true;
    error.value = null;

    try {
      const result = await BiometricAuth.authenticate({ 
        reason,
        fallbackButtonTitle: 'Use Password' 
      });
      
      return result.isAuthenticated;
    } catch (err: any) {
      error.value = err;
      return false;
    } finally {
      isAuthenticating.value = false;
    }
  };

  const getBiometricIcon = () => {
    if (supportedTypes.value.includes(BiometricType.FACE_ID)) {
      return 'mdi-face-recognition';
    } else if (supportedTypes.value.includes(BiometricType.FINGERPRINT)) {
      return 'mdi-fingerprint';
    }
    return 'mdi-shield-lock';
  };

  onMounted(() => {
    checkAvailability();
  });

  return {
    isAvailable,
    isAuthenticating,
    supportedTypes,
    error,
    authenticate,
    getBiometricIcon,
    checkAvailability
  };
}
```

#### Vue Component

```vue
<!-- components/BiometricAuth.vue -->
<template>
  <div class="biometric-auth">
    <div v-if="isAvailable" class="auth-container">
      <v-btn
        @click="handleAuth"
        :loading="isAuthenticating"
        :disabled="isAuthenticating"
        color="primary"
        large
      >
        <v-icon left>{{ biometricIcon }}</v-icon>
        {{ buttonText }}
      </v-btn>
      
      <v-alert 
        v-if="error" 
        type="error" 
        dismissible
        @click:close="error = null"
      >
        {{ errorMessage }}
      </v-alert>
    </div>
    
    <div v-else class="fallback-container">
      <p>Biometric authentication not available</p>
      <v-btn @click="$emit('use-password')" text>
        Use password login
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBiometricAuth } from '@/composables/biometricAuth';
import { BiometricErrorCode } from 'capacitor-biometric-authentication';

const emit = defineEmits<{
  'auth-success': [];
  'auth-failed': [error: Error];
  'use-password': [];
}>();

const { 
  isAvailable, 
  isAuthenticating, 
  error, 
  authenticate, 
  getBiometricIcon 
} = useBiometricAuth();

const biometricIcon = computed(() => getBiometricIcon());

const buttonText = computed(() => 
  isAuthenticating.value ? 'Authenticating...' : 'Sign in with Biometric'
);

const errorMessage = computed(() => {
  if (!error.value) return '';
  
  const errorCode = (error.value as any).code;
  const messages: Record<string, string> = {
    [BiometricErrorCode.USER_CANCELLED]: 'Authentication cancelled',
    [BiometricErrorCode.LOCKOUT]: 'Too many attempts. Try again later.',
    [BiometricErrorCode.BIOMETRIC_NOT_ENROLLED]: 'Please enroll biometrics in settings'
  };
  
  return messages[errorCode] || 'Authentication failed';
});

const handleAuth = async () => {
  const success = await authenticate('Sign in to your account');
  
  if (success) {
    emit('auth-success');
  } else if (error.value) {
    emit('auth-failed', error.value);
  }
};
</script>
```

### Angular Integration

#### Angular Service

```typescript
// services/biometric-auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BiometricAuth, BiometricAuthResult } from 'capacitor-biometric-authentication';

@Injectable({
  providedIn: 'root'
})
export class BiometricAuthService {
  private isAvailableSubject = new BehaviorSubject<boolean>(false);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  public isAvailable$ = this.isAvailableSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      const { isAvailable } = await BiometricAuth.isAvailable();
      this.isAvailableSubject.next(isAvailable);
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      this.isAvailableSubject.next(false);
    }
  }

  authenticate(reason = 'Authenticate to continue'): Observable<boolean> {
    return from(BiometricAuth.authenticate({ reason })).pipe(
      map((result: BiometricAuthResult) => {
        const authenticated = result.isAuthenticated;
        this.isAuthenticatedSubject.next(authenticated);
        return authenticated;
      }),
      catchError((error) => {
        console.error('Authentication failed:', error);
        this.isAuthenticatedSubject.next(false);
        throw error;
      })
    );
  }

  logout(): Observable<void> {
    return from(BiometricAuth.deleteCredentials()).pipe(
      map(() => {
        this.isAuthenticatedSubject.next(false);
      })
    );
  }

  configure(options: any): Observable<void> {
    return from(BiometricAuth.configure(options));
  }
}
```

#### Angular Component

```typescript
// components/biometric-login.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BiometricAuthService } from '../services/biometric-auth.service';

@Component({
  selector: 'app-biometric-login',
  template: `
    <div class="biometric-login" *ngIf="isAvailable">
      <h2>Welcome Back</h2>
      
      <button 
        mat-raised-button 
        color="primary"
        (click)="authenticate()"
        [disabled]="isAuthenticating"
      >
        <mat-icon>fingerprint</mat-icon>
        {{ isAuthenticating ? 'Authenticating...' : 'Sign in with Biometric' }}
      </button>
      
      <mat-error *ngIf="error">
        {{ error }}
      </mat-error>
      
      <a mat-button (click)="usePassword()">Use password instead</a>
    </div>
    
    <div *ngIf="!isAvailable" class="fallback">
      <p>Biometric authentication not available</p>
      <button mat-raised-button (click)="usePassword()">
        Sign in with password
      </button>
    </div>
  `,
  styleUrls: ['./biometric-login.component.scss']
})
export class BiometricLoginComponent implements OnInit, OnDestroy {
  isAvailable = false;
  isAuthenticating = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private biometricAuth: BiometricAuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.biometricAuth.isAvailable$
      .pipe(takeUntil(this.destroy$))
      .subscribe(available => {
        this.isAvailable = available;
      });
  }

  authenticate() {
    this.isAuthenticating = true;
    this.error = null;

    this.biometricAuth.authenticate('Sign in to your account')
      .subscribe({
        next: (authenticated) => {
          if (authenticated) {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          this.error = this.getErrorMessage(error);
          this.isAuthenticating = false;
        },
        complete: () => {
          this.isAuthenticating = false;
        }
      });
  }

  usePassword() {
    this.router.navigate(['/login']);
  }

  private getErrorMessage(error: any): string {
    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'USER_CANCELLED': 'Authentication cancelled',
      'LOCKOUT': 'Too many attempts. Please try again later.',
      'BIOMETRIC_NOT_ENROLLED': 'Please set up biometrics in device settings'
    };

    return errorMessages[error.code] || 'Authentication failed';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Authentication System Integrations

### Firebase Authentication

```typescript
// services/firebase-biometric-auth.ts
import { BiometricAuth } from 'capacitor-biometric-authentication';
import { 
  getAuth, 
  signInWithCustomToken, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';

class FirebaseBiometricAuth {
  private auth = getAuth();
  private biometricToken: string | null = null;

  async initialize() {
    // Configure biometric with Firebase-specific settings
    await BiometricAuth.configure({
      sessionDuration: 3600000, // 1 hour
      storagePrefix: 'firebase_bio_'
    });

    // Listen for auth state changes
    onAuthStateChanged(this.auth, (user) => {
      if (!user) {
        // Clear biometric credentials on logout
        BiometricAuth.deleteCredentials();
      }
    });
  }

  async signInWithBiometric(): Promise<User | null> {
    try {
      // 1. Authenticate with biometric
      const bioResult = await BiometricAuth.authenticate({
        reason: 'Sign in to your account'
      });

      if (!bioResult.isAuthenticated) {
        return null;
      }

      // 2. Get stored Firebase token or request new one
      const token = await this.getFirebaseToken();

      if (!token) {
        throw new Error('No authentication token available');
      }

      // 3. Sign in with custom token
      const credential = await signInWithCustomToken(this.auth, token);
      
      return credential.user;
    } catch (error) {
      console.error('Biometric sign-in failed:', error);
      throw error;
    }
  }

  async linkBiometricToAccount(user: User): Promise<void> {
    try {
      // 1. Get custom token from your backend
      const token = await this.requestCustomToken(user.uid);

      // 2. Authenticate with biometric to store token
      const result = await BiometricAuth.authenticate({
        reason: 'Link biometric to your account'
      });

      if (result.isAuthenticated) {
        // 3. Store token securely
        await this.storeFirebaseToken(token);
      }
    } catch (error) {
      console.error('Failed to link biometric:', error);
      throw error;
    }
  }

  private async getFirebaseToken(): Promise<string | null> {
    // Retrieve stored token (implement secure storage)
    return this.biometricToken;
  }

  private async storeFirebaseToken(token: string): Promise<void> {
    // Store token securely (implement secure storage)
    this.biometricToken = token;
  }

  private async requestCustomToken(uid: string): Promise<string> {
    // Call your backend to generate custom token
    const response = await fetch('/api/auth/custom-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });

    const { token } = await response.json();
    return token;
  }
}

// Usage
const firebaseBioAuth = new FirebaseBiometricAuth();
await firebaseBioAuth.initialize();

// Sign in
const user = await firebaseBioAuth.signInWithBiometric();
if (user) {
  console.log('Signed in:', user.email);
}
```

### Auth0 Integration

```typescript
// services/auth0-biometric.ts
import { BiometricAuth } from 'capacitor-biometric-authentication';
import { Auth0Client } from '@auth0/auth0-spa-js';

class Auth0BiometricService {
  private auth0: Auth0Client;
  private refreshToken: string | null = null;

  constructor() {
    this.auth0 = new Auth0Client({
      domain: 'your-domain.auth0.com',
      clientId: 'your-client-id',
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
  }

  async enableBiometric(): Promise<void> {
    try {
      // 1. Ensure user is authenticated
      const user = await this.auth0.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // 2. Get refresh token
      const token = await this.auth0.getTokenSilently({
        includeRefreshToken: true
      });

      // 3. Authenticate with biometric to store token
      const result = await BiometricAuth.authenticate({
        reason: 'Enable biometric login'
      });

      if (result.isAuthenticated) {
        // 4. Store refresh token securely
        await this.storeRefreshToken(token);
        
        // 5. Configure biometric settings
        await BiometricAuth.configure({
          sessionDuration: 1800000, // 30 minutes
          webConfig: {
            rpName: 'Auth0 Biometric App'
          }
        });
      }
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      throw error;
    }
  }

  async loginWithBiometric(): Promise<void> {
    try {
      // 1. Authenticate with biometric
      const bioResult = await BiometricAuth.authenticate({
        reason: 'Sign in with biometric'
      });

      if (!bioResult.isAuthenticated) {
        throw new Error('Biometric authentication failed');
      }

      // 2. Retrieve stored refresh token
      const refreshToken = await this.getStoredRefreshToken();

      if (!refreshToken) {
        throw new Error('No stored credentials');
      }

      // 3. Use refresh token to get new access token
      await this.auth0.loginWithRefreshToken({
        refreshToken
      });

      // 4. Verify authentication
      const isAuthenticated = await this.auth0.isAuthenticated();
      
      if (!isAuthenticated) {
        throw new Error('Auth0 authentication failed');
      }
    } catch (error) {
      console.error('Biometric login failed:', error);
      
      // Clear stored credentials on failure
      await BiometricAuth.deleteCredentials();
      throw error;
    }
  }

  async logout(): Promise<void> {
    // Clear biometric credentials
    await BiometricAuth.deleteCredentials();
    
    // Clear stored tokens
    this.refreshToken = null;
    
    // Logout from Auth0
    await this.auth0.logout({
      returnTo: window.location.origin
    });
  }

  private async storeRefreshToken(token: string): Promise<void> {
    // In production, use secure encrypted storage
    this.refreshToken = token;
  }

  private async getStoredRefreshToken(): Promise<string | null> {
    // In production, retrieve from secure encrypted storage
    return this.refreshToken;
  }
}
```

### JWT Token Management

```typescript
// services/jwt-biometric-auth.ts
import { BiometricAuth } from 'capacitor-biometric-authentication';
import { Preferences } from '@capacitor/preferences';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class JWTBiometricAuth {
  private readonly TOKEN_KEY = 'biometric_jwt_tokens';
  private readonly ENCRYPTION_KEY = 'your-encryption-key';

  async authenticateAndStoreTokens(
    username: string, 
    password: string
  ): Promise<boolean> {
    try {
      // 1. Authenticate with backend
      const tokens = await this.loginToBackend(username, password);

      // 2. Authenticate with biometric to store tokens
      const bioResult = await BiometricAuth.authenticate({
        reason: 'Enable quick sign-in'
      });

      if (!bioResult.isAuthenticated) {
        return false;
      }

      // 3. Encrypt and store tokens
      await this.storeTokens(tokens);

      return true;
    } catch (error) {
      console.error('Failed to setup biometric auth:', error);
      return false;
    }
  }

  async authenticateWithBiometric(): Promise<TokenPair | null> {
    try {
      // 1. Authenticate with biometric
      const result = await BiometricAuth.authenticate({
        reason: 'Sign in to your account'
      });

      if (!result.isAuthenticated) {
        return null;
      }

      // 2. Retrieve stored tokens
      const tokens = await this.getStoredTokens();

      if (!tokens) {
        throw new Error('No stored tokens');
      }

      // 3. Check if tokens are expired
      if (this.isTokenExpired(tokens)) {
        // Refresh tokens
        const newTokens = await this.refreshTokens(tokens.refreshToken);
        await this.storeTokens(newTokens);
        return newTokens;
      }

      return tokens;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return null;
    }
  }

  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    // Get tokens with biometric if needed
    const tokens = await this.getValidTokens();

    if (!tokens) {
      throw new Error('Not authenticated');
    }

    // Make request with access token
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': `Bearer ${tokens.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const newTokens = await this.refreshTokens(tokens.refreshToken);
        if (newTokens) {
          await this.storeTokens(newTokens);
          // Retry request
          return this.makeAuthenticatedRequest(endpoint, options);
        }
      }
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async getValidTokens(): Promise<TokenPair | null> {
    let tokens = await this.getStoredTokens();

    if (!tokens) {
      // No stored tokens, authenticate with biometric
      return this.authenticateWithBiometric();
    }

    if (this.isTokenExpired(tokens)) {
      // Refresh if expired
      tokens = await this.refreshTokens(tokens.refreshToken);
      if (tokens) {
        await this.storeTokens(tokens);
      }
    }

    return tokens;
  }

  private async storeTokens(tokens: TokenPair): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(tokens));
    await Preferences.set({
      key: this.TOKEN_KEY,
      value: encrypted
    });
  }

  private async getStoredTokens(): Promise<TokenPair | null> {
    const { value } = await Preferences.get({ key: this.TOKEN_KEY });
    if (!value) return null;

    try {
      const decrypted = await this.decrypt(value);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return null;
    }
  }

  private isTokenExpired(tokens: TokenPair): boolean {
    return Date.now() >= tokens.expiresAt;
  }

  private async loginToBackend(
    username: string, 
    password: string
  ): Promise<TokenPair> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  }

  private async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  private async encrypt(data: string): Promise<string> {
    // Implement encryption
    return btoa(data); // Simple example, use proper encryption
  }

  private async decrypt(data: string): Promise<string> {
    // Implement decryption
    return atob(data); // Simple example, use proper decryption
  }
}

// Usage
const jwtBioAuth = new JWTBiometricAuth();

// Initial setup
await jwtBioAuth.authenticateAndStoreTokens('user@example.com', 'password');

// Subsequent logins
const tokens = await jwtBioAuth.authenticateWithBiometric();

// Make authenticated requests
const userData = await jwtBioAuth.makeAuthenticatedRequest<User>('/api/user/profile');
```

## State Management Integration

### Redux Integration

```typescript
// store/biometricSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BiometricAuth } from 'capacitor-biometric-authentication';

interface BiometricState {
  isAvailable: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiresAt: number | null;
}

const initialState: BiometricState = {
  isAvailable: false,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpiresAt: null
};

// Async thunks
export const checkBiometricAvailability = createAsyncThunk(
  'biometric/checkAvailability',
  async () => {
    const { isAvailable } = await BiometricAuth.isAvailable();
    return isAvailable;
  }
);

export const authenticateWithBiometric = createAsyncThunk(
  'biometric/authenticate',
  async (reason: string = 'Authenticate to continue') => {
    const result = await BiometricAuth.authenticate({ reason });
    
    if (result.isAuthenticated) {
      const sessionDuration = 30 * 60 * 1000; // 30 minutes
      return {
        isAuthenticated: true,
        sessionExpiresAt: Date.now() + sessionDuration
      };
    }
    
    throw new Error('Authentication failed');
  }
);

export const logoutBiometric = createAsyncThunk(
  'biometric/logout',
  async () => {
    await BiometricAuth.deleteCredentials();
  }
);

// Slice
const biometricSlice = createSlice({
  name: 'biometric',
  initialState,
  reducers: {
    checkSessionExpiry: (state) => {
      if (state.sessionExpiresAt && Date.now() > state.sessionExpiresAt) {
        state.isAuthenticated = false;
        state.sessionExpiresAt = null;
      }
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Check availability
      .addCase(checkBiometricAvailability.fulfilled, (state, action) => {
        state.isAvailable = action.payload;
      })
      
      // Authentication
      .addCase(authenticateWithBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(authenticateWithBiometric.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.sessionExpiresAt = action.payload.sessionExpiresAt;
      })
      .addCase(authenticateWithBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Authentication failed';
        state.isAuthenticated = false;
      })
      
      // Logout
      .addCase(logoutBiometric.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.sessionExpiresAt = null;
      });
  }
});

export const { checkSessionExpiry, clearError } = biometricSlice.actions;
export default biometricSlice.reducer;
```

### Zustand Integration

```typescript
// stores/biometricStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { BiometricAuth, BiometricAuthResult } from 'capacitor-biometric-authentication';

interface BiometricStore {
  // State
  isAvailable: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  sessionExpiresAt: number | null;
  
  // Actions
  initialize: () => Promise<void>;
  authenticate: (reason?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => boolean;
  clearError: () => void;
}

export const useBiometricStore = create<BiometricStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isAvailable: false,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionExpiresAt: null,

        // Initialize biometric
        initialize: async () => {
          try {
            const { isAvailable } = await BiometricAuth.isAvailable();
            
            await BiometricAuth.configure({
              sessionDuration: 30 * 60 * 1000,
              enableLogging: process.env.NODE_ENV === 'development'
            });
            
            set({ isAvailable });
          } catch (error) {
            console.error('Failed to initialize biometric:', error);
            set({ isAvailable: false });
          }
        },

        // Authenticate
        authenticate: async (reason = 'Authenticate to continue') => {
          const state = get();
          
          if (!state.isAvailable) {
            set({ error: new Error('Biometric not available') });
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const result = await BiometricAuth.authenticate({ reason });
            
            if (result.isAuthenticated) {
              const sessionDuration = 30 * 60 * 1000;
              set({
                isAuthenticated: true,
                sessionExpiresAt: Date.now() + sessionDuration,
                isLoading: false
              });
              return true;
            }
            
            set({ isAuthenticated: false, isLoading: false });
            return false;
          } catch (error: any) {
            set({
              error,
              isAuthenticated: false,
              isLoading: false
            });
            return false;
          }
        },

        // Logout
        logout: async () => {
          try {
            await BiometricAuth.deleteCredentials();
            set({
              isAuthenticated: false,
              sessionExpiresAt: null
            });
          } catch (error: any) {
            set({ error });
          }
        },

        // Check session validity
        checkSession: () => {
          const state = get();
          
          if (!state.isAuthenticated || !state.sessionExpiresAt) {
            return false;
          }
          
          if (Date.now() > state.sessionExpiresAt) {
            set({
              isAuthenticated: false,
              sessionExpiresAt: null
            });
            return false;
          }
          
          return true;
        },

        // Clear error
        clearError: () => set({ error: null })
      }),
      {
        name: 'biometric-store',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          sessionExpiresAt: state.sessionExpiresAt
        })
      }
    )
  )
);

// Usage in React component
function LoginComponent() {
  const { 
    isAvailable, 
    isLoading, 
    error, 
    authenticate, 
    clearError 
  } = useBiometricStore();

  useEffect(() => {
    useBiometricStore.getState().initialize();
  }, []);

  const handleLogin = async () => {
    const success = await authenticate('Sign in to your account');
    if (success) {
      // Navigate to protected route
    }
  };

  // Component render...
}
```

## Best Practices for Integration

1. **Initialize early** - Set up biometric configuration on app start
2. **Handle all states** - Loading, error, and success states
3. **Provide fallbacks** - Always offer alternative authentication
4. **Session management** - Implement proper session expiry
5. **Error recovery** - Handle errors gracefully with clear messages
6. **State persistence** - Persist authentication state appropriately
7. **Security first** - Never store sensitive data in plain text
8. **Test thoroughly** - Test on real devices with various scenarios