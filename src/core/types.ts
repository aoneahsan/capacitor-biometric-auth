export interface BiometricAuthOptions {
  reason?: string;
  cancelTitle?: string;
  fallbackTitle?: string;
  disableDeviceCredential?: boolean;
  maxAttempts?: number;
  sessionTimeout?: number;
  requireConfirmation?: boolean;
  platform?: {
    web?: WebAuthOptions;
    android?: AndroidAuthOptions;
    ios?: IOSAuthOptions;
  };
}

export interface WebAuthOptions {
  rpId?: string;
  rpName?: string;
  challenge?: ArrayBuffer;
  userVerification?: UserVerificationRequirement;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

export interface AndroidAuthOptions {
  title?: string;
  subtitle?: string;
  description?: string;
  negativeButtonText?: string;
  confirmationRequired?: boolean;
  deviceCredentialAllowed?: boolean;
  strongBiometricOnly?: boolean;
}

export interface IOSAuthOptions {
  localizedReason?: string;
  localizedCancelTitle?: string;
  localizedFallbackTitle?: string;
  biometryType?: 'touchId' | 'faceId';
  evaluatePolicy?: 'deviceOwnerAuthentication' | 'deviceOwnerAuthenticationWithBiometrics';
}

export interface BiometricAuthResult {
  success: boolean;
  error?: BiometricError;
  biometryType?: BiometryType;
  sessionId?: string;
  platform?: string;
}

export interface BiometricError {
  code: BiometricErrorCode;
  message: string;
  details?: unknown;
}

export enum BiometricErrorCode {
  BIOMETRIC_UNAVAILABLE = 'BIOMETRIC_UNAVAILABLE',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  USER_CANCELLED = 'USER_CANCELLED',
  TIMEOUT = 'TIMEOUT',
  LOCKOUT = 'LOCKOUT',
  NOT_ENROLLED = 'NOT_ENROLLED',
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum BiometryType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'faceId',
  TOUCH_ID = 'touchId',
  IRIS = 'iris',
  MULTIPLE = 'multiple',
  UNKNOWN = 'unknown'
}

export interface BiometricAuthConfiguration {
  adapter?: 'auto' | string;
  customAdapters?: Record<string, BiometricAuthAdapter>;
  debug?: boolean;
  sessionDuration?: number;
  encryptionKey?: string;
}

export interface BiometricAuthAdapter {
  platform: string;
  isAvailable(): Promise<boolean>;
  getSupportedBiometrics(): Promise<BiometryType[]>;
  authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult>;
  deleteCredentials(): Promise<void>;
  hasCredentials(): Promise<boolean>;
}

export interface BiometricAuthState {
  isAuthenticated: boolean;
  sessionId?: string;
  lastAuthTime?: number;
  biometryType?: BiometryType;
  error?: BiometricError;
}

export interface PlatformInfo {
  name: string;
  version?: string;
  isCapacitor: boolean;
  isReactNative: boolean;
  isCordova: boolean;
  isWeb: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isElectron: boolean;
}