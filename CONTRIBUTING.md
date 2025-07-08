# Contributing to Capacitor Biometric Auth

First off, thank you for considering contributing to Capacitor Biometric Auth! It's people like you that make this plugin a great tool for the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

Before you begin:
- Have you read the [README](README.md)?
- Check if your issue/idea has already been reported/discussed in [Issues](https://github.com/your-repo/issues)
- Check if your idea fits with the scope and aims of the project

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**
```markdown
**Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. iOS 16, Android 13]
 - Plugin Version: [e.g. 1.0.0]
 - Capacitor Version: [e.g. 7.4.1]
 - Device: [e.g. iPhone 14, Samsung Galaxy S23]

**Additional context**
Any other context about the problem.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing code style
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/capacitor-biometric-auth.git
   cd capacitor-biometric-auth
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Build the plugin**
   ```bash
   yarn build
   ```

4. **Set up the example app**
   ```bash
   cd example
   yarn install
   yarn cap sync
   ```

### Development Commands

```bash
# Build the plugin
yarn build

# Run linter
yarn lint

# Format code
yarn prettier

# Run tests (when implemented)
yarn test

# Start example app
cd example
yarn dev
```

## Project Structure

```
capacitor-biometric-auth/
├── src/                    # TypeScript source files
│   ├── definitions.ts      # Plugin interface definitions
│   ├── index.ts           # Main entry point
│   ├── web.ts             # Web implementation
│   └── utils/             # Utility functions
├── android/               # Android native implementation
│   └── src/main/java/     # Java source files
├── ios/                   # iOS native implementation
│   └── Plugin/            # Swift source files
├── example/               # Example app
└── dist/                  # Built files (generated)
```

## Coding Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint and Prettier)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Avoid using `any` type - use `unknown` or specific types instead

### Native Code

#### Android (Java)
- Follow Android coding conventions
- Use AndroidX libraries
- Handle permissions properly
- Support Android API 23+ (Android 6.0+)

#### iOS (Swift)
- Follow Swift naming conventions
- Use Swift 5.1+
- Support iOS 13.0+
- Handle permissions and entitlements properly

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Example:
```
feat: add session encryption for web platform

- Implement AES-GCM encryption using Web Crypto API
- Add session management utilities
- Update TypeScript definitions

Fixes #123
```

## Testing

### Unit Tests

Currently, unit tests are being set up. When contributing, please:
- Write tests for new functionality
- Ensure all tests pass before submitting PR
- Aim for high test coverage

### Manual Testing

Test your changes on:
- [ ] Web (Chrome, Safari, Firefox)
- [ ] Android (API 23+)
- [ ] iOS (iOS 13+)

### Testing Checklist

Before submitting a PR, ensure:
- [ ] Code builds without errors (`yarn build`)
- [ ] Linter passes (`yarn lint`)
- [ ] Code is formatted (`yarn prettier`)
- [ ] Example app works with your changes
- [ ] Documentation is updated if needed
- [ ] Tests pass (when available)

## Documentation

- Update README.md if you change functionality
- Update TypeScript definitions with proper JSDoc comments
- Add inline comments for complex logic
- Update CHANGELOG.md with your changes (if it exists)

### Documentation Style

- Use clear, concise language
- Include code examples where appropriate
- Keep documentation up-to-date with code changes

## Platform-Specific Guidelines

### Web Implementation
- Use Web Authentication API standards
- Ensure cross-browser compatibility
- Handle cases where WebAuthn is not available

### Android Implementation
- Use BiometricPrompt API
- Handle different Android versions gracefully
- Properly manage Android permissions

### iOS Implementation
- Use LocalAuthentication framework
- Handle Face ID permission properly
- Support both Face ID and Touch ID

## Release Process

Maintainers will handle releases, but for reference:
1. Update version in package.json
2. Update CHANGELOG.md
3. Build and test thoroughly
4. Create git tag
5. Publish to npm

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## Recognition

Contributors will be recognized in the README.md file. Thank you for your contributions!

---

By contributing to this project, you agree that your contributions will be licensed under the MIT License.