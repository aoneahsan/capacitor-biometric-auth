import type { CapacitorConfig } from '@capacitor/cli';
import { config } from 'dotenv';

config();

const googleWebClientID = process.env.VITE_GOOGLE_MOBILE_AUTH_CLIENT_ID;
const googleIosClientID = process.env.VITE_GOOGLE_AUTH_IOS_APP_CLIENT_ID;

const capacitorConfig: CapacitorConfig = {
  appId: 'com.zaions.biometric_auth',
  appName: 'Biometric Auth',
  webDir: 'build',
  backgroundColor: '#ffffff',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
    },
    CapacitorCookies: {
      enabled: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: googleWebClientID,
      iosClientId: googleIosClientID,
      androidClientId: googleWebClientID,
      forceCodeForRefreshToken: true,
    },
  },
  ios: {
    preferredContentMode: 'mobile',
  },
  cordova: {},
};

export default capacitorConfig;
