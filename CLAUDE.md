# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Capacitor plugin development project for implementing biometric authentication across Android, iOS, and Web platforms. The plugin aims to provide a secure, type-safe, and framework-independent solution for biometric authentication.

## Development Commands

### Essential Commands
- `yarn dev` - Start development server on port 3000
- `yarn build` - Build the project
- `yarn lint` - Run ESLint for code quality checks
- `yarn prettier` - Format code with Prettier

### Capacitor Commands
- `yarn cap:sync` - Full sync (install deps, build, and sync with native projects)
- `yarn cap:android:run` - Run on Android device/emulator
- `yarn cap:ios:run` - Run on iOS device/simulator
- `yarn cap:android:open` - Open Android Studio
- `yarn cap:ios:open` - Open Xcode

### Asset Generation
- `yarn gen:assets` - Generate both Android and iOS app icons and splash screens
- `yarn gen:android:assets` - Generate Android assets only
- `yarn gen:ios:assets` - Generate iOS assets only

### Configuration Management
- `yarn sync:apps-config` - Apply native app configuration using Trapeze
- `yarn update:ios:info` - Update iOS app configuration
- `yarn update:android:info` - Update Android app configuration

## Architecture and Code Structure

### Technology Stack
- **Framework**: React with TypeScript (strict mode enabled)
- **Build Tool**: Vite
- **Platform**: Capacitor v7.4.1 for cross-platform mobile development
- **Package Manager**: Yarn
- **Path Alias**: `@/` maps to `src/` directory

### Plugin Architecture (To Be Implemented)
The plugin should follow Capacitor's plugin architecture:

1. **Core Plugin Interface** - Define TypeScript interfaces in `src/definitions.ts`
2. **Web Implementation** - Web Authentication API implementation in `src/web.ts`
3. **Native Implementations**:
   - Android: Using BiometricPrompt API
   - iOS: Using LocalAuthentication framework
4. **Plugin Facade** - Main plugin entry point that delegates to platform implementations

### Configuration
- **Bundle ID**: `com.zaions.biometric_auth`
- **App Name**: "Biometric Auth"
- **Build Output**: `build/` directory
- **TypeScript**: Strict mode with ESNext target

## Development Guidelines

### From README Requirements
1. **Type Safety**: Ensure all APIs are fully typed with TypeScript
2. **Security First**: Implement secure session management and encryption
3. **Framework Independent**: Do not depend on any specific frontend framework
4. **Configuration Options**: Provide configurable options including:
   - Session validity duration
   - Encryption secrets
   - UI customization options
   - Fallback authentication methods
5. **Easy Initialization**: Plugin should work with minimal configuration

### Platform-Specific Resources
- **Android**: [Biometric Auth API](https://developer.android.com/identity/sign-in/biometric-auth)
- **iOS**: [LocalAuthentication Framework](https://developer.apple.com/documentation/localauthentication)
- **Web**: [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)

### Code Style
- Indent with 2 spaces (enforced by .editorconfig)
- Use LF line endings
- UTF-8 encoding
- Trim trailing whitespace
- Include final newline in files

## Current Project State

The project is in initial setup phase. The main entry point (`src/main.tsx`) currently only renders a simple heading. Core plugin functionality needs to be implemented following Capacitor plugin development patterns.

## Next Implementation Steps

1. Create plugin definition interfaces in `src/definitions.ts`
2. Implement web version using Web Authentication API
3. Set up native project structure for Android and iOS implementations
4. Create example app for testing the plugin functionality
5. Add comprehensive TypeScript types for all configuration options
6. Implement secure session management and encryption utilities