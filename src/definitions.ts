export interface BiometricAuthPlugin {
  /**
   * Check if biometric authentication is available on the device
   */
  isAvailable(): Promise<BiometricAvailabilityResult>;

  /**
   * Get the list of supported biometric authentication types
   */
  getSupportedBiometrics(): Promise<SupportedBiometricsResult>;

  /**
   * Authenticate using biometric authentication
   * For web platform: This will intelligently choose between register() and authenticate()
   * based on whether credentials exist for the user
   */
  authenticate(options?: BiometricAuthOptions): Promise<BiometricAuthResult>;

  /**
   * Register new biometric credentials (Web platform specific)
   * Creates new WebAuthn credentials for the user
   */
  register?(options?: BiometricAuthOptions): Promise<BiometricAuthResult>;

  /**
   * Delete stored biometric credentials
   */
  deleteCredentials(): Promise<void>;

  /**
   * Set the plugin configuration
   */
  configure(config: BiometricAuthConfig): Promise<void>;
}

export interface BiometricAvailabilityResult {
  /**
   * Whether biometric authentication is available
   */
  available: boolean;
  /**
   * Reason why biometric is not available (if applicable)
   */
  reason?: BiometricUnavailableReason;
  /**
   * Error message providing more details
   */
  errorMessage?: string;
}

export interface SupportedBiometricsResult {
  /**
   * List of supported biometric types
   */
  biometrics: BiometricType[];
}

export interface BiometricAuthOptions {
  /**
   * Title to display in the biometric prompt
   */
  title?: string;
  /**
   * Subtitle to display in the biometric prompt
   */
  subtitle?: string;
  /**
   * Description to display in the biometric prompt
   */
  description?: string;
  /**
   * Text for the fallback button (e.g., "Use Passcode")
   */
  fallbackButtonTitle?: string;
  /**
   * Text for the cancel button
   */
  cancelButtonTitle?: string;
  /**
   * Whether to disable the fallback button
   */
  disableFallback?: boolean;
  /**
   * Maximum number of failed attempts before fallback
   */
  maxAttempts?: number;
  /**
   * Whether to save credentials for future use
   */
  saveCredentials?: boolean;
  /**
   * WebAuthn specific options for web platform
   */
  webAuthnOptions?: WebAuthnOptions;
}

export interface WebAuthnOptions {
  /**
   * Options for credential creation (registration)
   */
  create?: WebAuthnCreateOptions;
  /**
   * Options for credential request (authentication)
   */
  get?: WebAuthnGetOptions;
}

export interface WebAuthnCreateOptions {
  /**
   * Challenge from the relying party's server
   */
  challenge?: ArrayBuffer | Uint8Array | string;
  /**
   * Relying party information
   */
  rp?: {
    id?: string;
    name?: string;
  };
  /**
   * User account information
   */
  user?: {
    id?: ArrayBuffer | Uint8Array | string;
    name?: string;
    displayName?: string;
  };
  /**
   * List of supported public key credential parameters
   */
  pubKeyCredParams?: Array<{
    alg: number;
    type: 'public-key';
  }>;
  /**
   * Authenticator selection criteria
   */
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: 'discouraged' | 'preferred' | 'required';
  };
  /**
   * Timeout for the operation in milliseconds
   */
  timeout?: number;
  /**
   * Attestation preference
   */
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
  /**
   * Attestation statement formats
   */
  attestationFormats?: string[];
  /**
   * Credentials to exclude from creation
   */
  excludeCredentials?: Array<{
    id: ArrayBuffer | Uint8Array | string;
    type: 'public-key';
    transports?: Array<'ble' | 'hybrid' | 'internal' | 'nfc' | 'usb'>;
  }>;
  /**
   * Extension inputs
   */
  extensions?: Record<string, any>;
  /**
   * Hints for user agent UI
   */
  hints?: Array<'security-key' | 'client-device' | 'hybrid'>;
}

export interface WebAuthnGetOptions {
  /**
   * Challenge from the relying party's server
   */
  challenge?: ArrayBuffer | Uint8Array | string;
  /**
   * Relying party identifier
   */
  rpId?: string;
  /**
   * List of allowed credentials
   */
  allowCredentials?: Array<{
    id: ArrayBuffer | Uint8Array | string;
    type: 'public-key';
    transports?: Array<'ble' | 'hybrid' | 'internal' | 'nfc' | 'usb'>;
  }>;
  /**
   * User verification requirement
   */
  userVerification?: 'discouraged' | 'preferred' | 'required';
  /**
   * Timeout for the operation in milliseconds
   */
  timeout?: number;
  /**
   * Extension inputs
   */
  extensions?: Record<string, any>;
  /**
   * Hints for user agent UI
   */
  hints?: Array<'security-key' | 'client-device' | 'hybrid'>;
}

export interface BiometricAuthResult {
  /**
   * Whether the authentication was successful
   */
  success: boolean;
  /**
   * Authentication token if successful
   */
  token?: string;
  /**
   * Session ID for the authenticated session
   */
  sessionId?: string;
  /**
   * Error that occurred during authentication
   */
  error?: BiometricAuthError;
}

export interface BiometricAuthConfig {
  /**
   * Session validity duration in seconds
   */
  sessionDuration?: number;
  /**
   * Secret key for encryption (should be stored securely)
   */
  encryptionSecret?: string;
  /**
   * Whether to require biometric authentication for every sensitive operation
   */
  requireAuthenticationForEveryAccess?: boolean;
  /**
   * Custom UI configuration
   */
  uiConfig?: BiometricUIConfig;
  /**
   * Fallback authentication methods
   */
  fallbackMethods?: FallbackMethod[];
}

export interface BiometricUIConfig {
  /**
   * Primary color for the biometric prompt
   */
  primaryColor?: string;
  /**
   * Background color for the biometric prompt
   */
  backgroundColor?: string;
  /**
   * Text color for the biometric prompt
   */
  textColor?: string;
  /**
   * Custom logo URL or base64 string
   */
  logo?: string;
}

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'faceId',
  TOUCH_ID = 'touchId',
  IRIS = 'iris',
  FACE_AUTHENTICATION = 'faceAuthentication',
  PASSCODE = 'passcode',
  PATTERN = 'pattern',
  PIN = 'pin',
}

export enum BiometricUnavailableReason {
  NO_HARDWARE = 'noHardware',
  HARDWARE_UNAVAILABLE = 'hardwareUnavailable',
  NO_ENROLLED_BIOMETRICS = 'noEnrolledBiometrics',
  PERMISSION_DENIED = 'permissionDenied',
  NOT_SUPPORTED = 'notSupported',
  LOCKED_OUT = 'lockedOut',
  USER_DISABLED = 'userDisabled',
}

export enum FallbackMethod {
  PASSCODE = 'passcode',
  PASSWORD = 'password',
  PATTERN = 'pattern',
  PIN = 'pin',
  SECURITY_QUESTION = 'securityQuestion',
}

export interface BiometricAuthError {
  /**
   * Error code
   */
  code: BiometricErrorCode;
  /**
   * Human-readable error message
   */
  message: string;
  /**
   * Additional error details
   */
  details?: unknown;
}

export enum BiometricErrorCode {
  AUTHENTICATION_FAILED = 'authenticationFailed',
  USER_CANCELLED = 'userCancelled',
  SYSTEM_CANCELLED = 'systemCancelled',
  NOT_AVAILABLE = 'notAvailable',
  PERMISSION_DENIED = 'permissionDenied',
  LOCKED_OUT = 'lockedOut',
  INVALID_CONTEXT = 'invalidContext',
  NOT_ENROLLED = 'notEnrolled',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}
