# WebAuthn Advanced Options Example

This example demonstrates how to use the full WebAuthn options in the Capacitor Biometric Authentication plugin.

## Basic Registration with Defaults

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Register with default options
const result = await BiometricAuth.register({
  title: 'Register Biometric',
  saveCredentials: true
});
```

## Advanced Registration with Custom Options

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Register with full WebAuthn options control
const result = await BiometricAuth.register({
  title: 'Secure Registration',
  webAuthnOptions: {
    create: {
      // Custom challenge from your server
      challenge: 'base64EncodedChallengeFromServer',
      
      // Relying party information
      rp: {
        id: 'example.com',
        name: 'Example Corp Security'
      },
      
      // User information
      user: {
        id: 'user123',  // Can be string, will be converted to ArrayBuffer
        name: 'john.doe@example.com',
        displayName: 'John Doe'
      },
      
      // Preferred public key algorithms (in order of preference)
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (recommended)
        { alg: -257, type: 'public-key' }, // RS256
        { alg: -8, type: 'public-key' }    // EdDSA
      ],
      
      // Authenticator requirements
      authenticatorSelection: {
        authenticatorAttachment: 'platform',  // or 'cross-platform'
        requireResidentKey: false,
        residentKey: 'preferred',  // 'discouraged', 'preferred', or 'required'
        userVerification: 'required'  // 'discouraged', 'preferred', or 'required'
      },
      
      // Timeout in milliseconds
      timeout: 120000,  // 2 minutes
      
      // Attestation preference
      attestation: 'direct',  // 'none', 'indirect', 'direct', or 'enterprise'
      
      // Exclude existing credentials (prevent re-registration)
      excludeCredentials: [
        {
          id: 'existingCredentialIdBase64',
          type: 'public-key',
          transports: ['internal', 'hybrid']
        }
      ],
      
      // Extensions
      extensions: {
        credProps: true,
        largeBlob: {
          support: 'preferred'
        }
      }
    }
  }
});
```

## Advanced Authentication with Custom Options

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Authenticate with full control
const result = await BiometricAuth.authenticate({
  title: 'Authenticate',
  webAuthnOptions: {
    get: {
      // Challenge from your server
      challenge: 'base64EncodedChallengeFromServer',
      
      // Relying party ID
      rpId: 'example.com',
      
      // Specific credentials to allow
      allowCredentials: [
        {
          id: 'credentialIdBase64',
          type: 'public-key',
          transports: ['internal', 'hybrid']
        }
      ],
      
      // User verification requirement
      userVerification: 'required',
      
      // Timeout
      timeout: 60000,
      
      // Extensions
      extensions: {
        largeBlob: {
          read: true
        }
      }
    }
  }
});
```

## Server Challenge Integration Example

```typescript
import { BiometricAuth } from 'capacitor-biometric-authentication';

// Get challenge from your server
async function getServerChallenge(): Promise<string> {
  const response = await fetch('/api/auth/challenge');
  const data = await response.json();
  return data.challenge; // Base64 encoded challenge
}

// Register with server challenge
async function registerWithServer() {
  const challenge = await getServerChallenge();
  
  const result = await BiometricAuth.register({
    title: 'Register Account',
    webAuthnOptions: {
      create: {
        challenge,
        rp: {
          id: window.location.hostname,
          name: 'My Secure App'
        },
        user: {
          id: crypto.randomUUID(),
          name: 'user@example.com',
          displayName: 'User'
        },
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        }
      }
    }
  });
  
  if (result.success) {
    // Send credential to server for verification
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: result.token,
        // Include other necessary data
      })
    });
  }
}
```

## Platform-Specific Authenticator Selection

```typescript
// Require platform authenticator (Touch ID, Face ID, Windows Hello)
const platformAuth = await BiometricAuth.register({
  webAuthnOptions: {
    create: {
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required'
      }
    }
  }
});

// Allow any authenticator (including USB security keys)
const anyAuth = await BiometricAuth.register({
  webAuthnOptions: {
    create: {
      authenticatorSelection: {
        authenticatorAttachment: 'cross-platform',
        userVerification: 'preferred'
      }
    }
  }
});
```

## Enterprise Attestation Example

```typescript
// For enterprise environments requiring attestation
const result = await BiometricAuth.register({
  title: 'Enterprise Registration',
  webAuthnOptions: {
    create: {
      attestation: 'enterprise',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required'
      },
      rp: {
        id: 'enterprise.example.com',
        name: 'Enterprise Security Portal'
      }
    }
  }
});
```

## Notes

1. **Challenge**: Always use a fresh challenge from your server for each authentication attempt
2. **User ID**: Should be unique and consistent for each user
3. **RP ID**: Must match your domain or be a registrable domain suffix
4. **Attestation**: Most apps should use 'none' unless you need to verify authenticator models
5. **User Verification**: 'required' ensures biometric/PIN verification
6. **Backward Compatibility**: If you don't provide webAuthnOptions, sensible defaults are used