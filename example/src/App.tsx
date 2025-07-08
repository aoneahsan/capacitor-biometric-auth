import React, { useState } from 'react';
import { BiometricAuth } from '../../src';
import type {
  BiometricAuthResult,
  BiometricAvailabilityResult,
  SupportedBiometricsResult,
} from '../../src';

const App: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<BiometricAuthResult | null>(null);
  const [availability, setAvailability] =
    useState<BiometricAvailabilityResult | null>(null);
  const [supportedBiometrics, setSupportedBiometrics] =
    useState<SupportedBiometricsResult | null>(null);

  const checkAvailability = async () => {
    try {
      const result = await BiometricAuth.isAvailable();
      setAvailability(result);
      setStatus(
        result.available
          ? 'Biometric authentication is available'
          : `Not available: ${result.reason}`
      );
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const getSupportedBiometrics = async () => {
    try {
      const result = await BiometricAuth.getSupportedBiometrics();
      setSupportedBiometrics(result);
      setStatus(`Supported biometrics: ${result.biometrics.join(', ')}`);
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const authenticate = async () => {
    try {
      setStatus('Authenticating...');
      const result = await BiometricAuth.authenticate({
        title: 'Biometric Authentication',
        subtitle: 'Authenticate to access your account',
        description: 'Place your finger on the sensor or look at the camera',
        fallbackButtonTitle: 'Use Passcode',
        cancelButtonTitle: 'Cancel',
        saveCredentials: true,
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

  const configurePlugin = async () => {
    try {
      await BiometricAuth.configure({
        sessionDuration: 7200, // 2 hours
        requireAuthenticationForEveryAccess: false,
        uiConfig: {
          primaryColor: '#007AFF',
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
        },
      });
      setStatus('Plugin configured successfully');
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
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
        </div>
      </div>

      {availability && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Availability</h2>
          <pre style={codeStyle}>{JSON.stringify(availability, null, 2)}</pre>
        </div>
      )}

      {supportedBiometrics && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Supported Biometrics</h2>
          <pre style={codeStyle}>
            {JSON.stringify(supportedBiometrics, null, 2)}
          </pre>
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
