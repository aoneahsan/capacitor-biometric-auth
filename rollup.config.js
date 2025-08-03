import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

// Main build - framework-agnostic with optional Capacitor
const mainBuild = {
  input: 'dist/esm/index.js',
  output: [
    {
      file: 'dist/plugin.js',
      format: 'iife',
      name: 'BiometricAuth',
      globals: {
        '@capacitor/core': 'capacitorExports',
      },
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/plugin.cjs.js',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/plugin.mjs',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
  ],
  external: ['@capacitor/core', 'react-native'],
  plugins: [
    resolve({
      preferBuiltins: false,
      browser: true,
    }),
    json(),
  ],
};

// Web-only build (no native dependencies)
const webBuild = {
  input: 'dist/esm/index.js',
  output: [
    {
      file: 'dist/web.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/web.umd.js',
      format: 'umd',
      name: 'BiometricAuth',
      sourcemap: true,
      inlineDynamicImports: true,
    },
  ],
  external: [],
  plugins: [
    resolve({
      preferBuiltins: false,
      browser: true,
    }),
    json(),
    {
      name: 'remove-native-imports',
      resolveId(source) {
        // Skip native-specific imports for web build
        if (source.includes('CapacitorAdapter') || 
            source.includes('ReactNativeAdapter') ||
            source.includes('@capacitor/core')) {
          return { id: source, external: true };
        }
        return null;
      },
      load(id) {
        // Provide empty modules for native adapters in web build
        if (id.includes('CapacitorAdapter') || 
            id.includes('ReactNativeAdapter')) {
          return 'export const unused = null;';
        }
        return null;
      },
    },
  ],
};

export default [mainBuild, webBuild];