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
      if ((window as unknown as { Capacitor?: unknown }).Capacitor) {
        info.isCapacitor = true;
        const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
        const platform = capacitor?.getPlatform?.();
        if (platform) {
          info.name = platform;
          info.isIOS = platform === 'ios';
          info.isAndroid = platform === 'android';
          info.isWeb = platform === 'web';
        }
      }
      // Check for Cordova
      else if ((window as unknown as { cordova?: unknown; phonegap?: unknown }).cordova || (window as unknown as { cordova?: unknown; phonegap?: unknown }).phonegap) {
        info.isCordova = true;
        info.name = 'cordova';
        
        const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
        if (/android/i.test(userAgent)) {
          info.isAndroid = true;
          info.name = 'android';
        } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream) {
          info.isIOS = true;
          info.name = 'ios';
        }
      }
      // Check for Electron
      else if ((window as unknown as { process?: { type?: string } }).process?.type === 'renderer' || navigator.userAgent.indexOf('Electron') !== -1) {
        info.isElectron = true;
        info.name = 'electron';
      }
      // Default to web
      else {
        info.name = 'web';
      }
    }
    // Node.js environment
    else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      info.name = 'node';
    }

    // Get version info if available
    if (info.isCapacitor && typeof window !== 'undefined') {
      const capacitor = (window as unknown as { Capacitor?: { version?: string } }).Capacitor;
      if (capacitor?.version) {
        info.version = capacitor.version;
      }
    }

    this.platformInfo = info;
    return info;
  }

  isSupported(): boolean {
    const info = this.detect();
    return info.isWeb || info.isCapacitor || info.isCordova;
  }

  getPlatformName(): string {
    return this.detect().name;
  }

  isNativePlatform(): boolean {
    const info = this.detect();
    return (info.isIOS || info.isAndroid) && (info.isCapacitor || info.isCordova);
  }
}