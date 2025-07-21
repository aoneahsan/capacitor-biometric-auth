module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
  },
  plugins: ['@typescript-eslint'],
  rules: {},
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'android/',
    'ios/',
    'example/',
    'rollup.config.js',
    '.eslintrc.js',
  ],
};
