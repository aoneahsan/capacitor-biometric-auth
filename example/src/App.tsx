import React, { useState, useEffect } from 'react';
import BiometricAuth from '../../src';
import type {
  BiometricAuthResult,
  BiometricAuthState,
  BiometryType,
} from '../../src';

const App: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<BiometricAuthResult | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [supportedBiometrics, setSupportedBiometrics] = useState<BiometryType[]>([]);
  const [authState, setAuthState] = useState<BiometricAuthState | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = BiometricAuth.subscribe((state) => {
      setAuthState(state);
    });
    return unsubscribe;
  }, []);

  const checkAvailability = async () => {
    try {
      const available = await BiometricAuth.isAvailable();
      setIsAvailable(available);
      setStatus(
        available
          ? 'Biometric authentication is available'
          : 'Biometric authentication is not available'
      );
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const getSupportedBiometrics = async () => {
    try {
      const biometrics = await BiometricAuth.getSupportedBiometrics();
      setSupportedBiometrics(biometrics);
      setStatus(`Supported biometrics: ${biometrics.join(', ')}`);
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const authenticate = async () => {
    try {
      setStatus('Authenticating...');
      const result = await BiometricAuth.authenticate({
        reason: 'Authenticate to access your account',
        cancelTitle: 'Cancel',
        fallbackTitle: 'Use Passcode',
      });

      setResult(result);
      if (result.success) {
        setStatus('Authentication successful!');
      } else {
        setStatus(`Authentication failed: ${result.error?.message}`);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const deleteCredentials = async () => {
    try {
      await BiometricAuth.deleteCredentials();
      setStatus('Credentials deleted successfully');
      setResult(null);
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const configurePlugin = () => {
    try {
      BiometricAuth.configure({
        sessionDuration: 7200000, // 2 hours in ms
        debug: true,
      });
      setStatus('Plugin configured successfully');
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const logout = () => {
    BiometricAuth.logout();
    setStatus('Logged out successfully');
    setResult(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Biometric Auth Plugin Example</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Status</h2>
        <p
          style={{
            padding: '10px',
            backgroundColor: status.includes('Error') ? '#ffebee' : '#e8f5e9',
            borderRadius: '4px',
          }}
        >
          {status || 'Ready'}
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Actions</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={checkAvailability}
            style={buttonStyle}
          >
            Check Availability
          </button>
          <button
            onClick={getSupportedBiometrics}
            style={buttonStyle}
          >
            Get Supported Biometrics
          </button>
          <button
            onClick={configurePlugin}
            style={buttonStyle}
          >
            Configure Plugin
          </button>
          <button
            onClick={authenticate}
            style={{ ...buttonStyle, backgroundColor: '#4CAF50' }}
          >
            Authenticate
          </button>
          <button
            onClick={deleteCredentials}
            style={{ ...buttonStyle, backgroundColor: '#f44336' }}
          >
            Delete Credentials
          </button>
          <button
            onClick={logout}
            style={{ ...buttonStyle, backgroundColor: '#FF9800' }}
          >
            Logout
          </button>
        </div>
      </div>

      {isAvailable !== null && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Availability</h2>
          <pre style={codeStyle}>{JSON.stringify({ available: isAvailable }, null, 2)}</pre>
        </div>
      )}

      {supportedBiometrics.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Supported Biometrics</h2>
          <pre style={codeStyle}>
            {JSON.stringify({ biometrics: supportedBiometrics }, null, 2)}
          </pre>
        </div>
      )}

      {authState && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Authentication State</h2>
          <pre style={codeStyle}>{JSON.stringify(authState, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Authentication Result</h2>
          <pre style={codeStyle}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '16px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#2196F3',
  color: 'white',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
};

const codeStyle: React.CSSProperties = {
  backgroundColor: '#f5f5f5',
  padding: '10px',
  borderRadius: '4px',
  overflow: 'auto',
};

export default App;
