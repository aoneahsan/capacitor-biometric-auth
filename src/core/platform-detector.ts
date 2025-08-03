import { PlatformInfo } from './types';

export class PlatformDetector {
  private static instance: PlatformDetector;
  private platformInfo: PlatformInfo | null = null;

  private constructor() {}

  static getInstance(): PlatformDetector {
    if (!PlatformDetector.instance) {
      PlatformDetector.instance = new PlatformDetector();
    }
    return PlatformDetector.instance;
  }

  detect(): PlatformInfo {
    if (this.platformInfo) {
      return this.platformInfo;
    }

    const info: PlatformInfo = {
      name: 'unknown',
      isCapacitor: false,
      isReactNative: false,
      isCordova: false,
      isWeb: false,
      isIOS: false,
      isAndroid: false,
      isElectron: false
    };

    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      info.isWeb = true;

      // Check for Capacitor
      if ((window as any).Capacitor) {
        info.isCapacitor = true;
        const platform = (window as any).Capacitor.getPlatform?.();
        if (platform) {
          info.name = platform;
          info.isIOS = platform === 'ios';
          info.isAndroid = platform === 'android';
          info.isWeb = platform === 'web';
        }
      }
      // Check for Cordova
      else if ((window as any).cordova || (window as any).phonegap) {
        info.isCordova = true;
        info.name = 'cordova';
        
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        if (/android/i.test(userAgent)) {
          info.isAndroid = true;
          info.name = 'android';
        } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
          info.isIOS = true;
          info.name = 'ios';
        }
      }
      // Check for Electron
      else if ((window as any).process?.type === 'renderer' || navigator.userAgent.indexOf('Electron') !== -1) {
        info.isElectron = true;
        info.name = 'electron';
      }
      // Default to web
      else {
        info.name = 'web';
      }
    }
    // Check for React Native
    else if (typeof global !== 'undefined' && (global as any).nativePerformanceNow) {
      info.isReactNative = true;
      info.name = 'react-native';
      
      // Try to detect platform in React Native
      try {
        const { Platform } = require('react-native');
        if (Platform) {
          info.name = Platform.OS;
          info.isIOS = Platform.OS === 'ios';
          info.isAndroid = Platform.OS === 'android';
        }
      } catch (e) {
        // React Native not available
      }
    }
    // Node.js environment
    else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      info.name = 'node';
    }

    // Get version info if available
    if (info.isCapacitor && (window as any).Capacitor?.version) {
      info.version = (window as any).Capacitor.version;
    } else if (info.isReactNative) {
      try {
        const { Platform } = require('react-native');
        info.version = Platform.Version;
      } catch (e) {
        // Ignore
      }
    }

    this.platformInfo = info;
    return info;
  }

  isSupported(): boolean {
    const info = this.detect();
    return info.isWeb || info.isCapacitor || info.isReactNative || info.isCordova;
  }

  getPlatformName(): string {
    return this.detect().name;
  }

  isNativePlatform(): boolean {
    const info = this.detect();
    return (info.isIOS || info.isAndroid) && (info.isCapacitor || info.isReactNative || info.isCordova);
  }
}