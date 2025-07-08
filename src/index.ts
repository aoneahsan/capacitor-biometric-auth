import { registerPlugin } from '@capacitor/core';

import type { BiometricAuthPlugin } from './definitions';

const BiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth', {
  web: () => import('./web').then(m => new m.BiometricAuthWeb()),
});

export * from './definitions';
export { BiometricAuth };