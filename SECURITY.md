# Security Policy

## Supported Versions

Currently, we support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Capacitor Biometric Auth seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:
- Open a public GitHub issue for security vulnerabilities
- Post about the vulnerability on social media or forums

### Please DO:
- Email the maintainers directly with details
- Allow reasonable time for us to address the issue before public disclosure
- Provide detailed steps to reproduce the vulnerability

### What to include in your report:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)
5. Your contact information

### What to expect:
- Acknowledgment of your report within 48 hours
- Regular updates on our progress
- Credit for responsible disclosure (if desired)

## Security Best Practices

When using this plugin, please follow these security best practices:

### General
- Always use the latest version of the plugin
- Keep your Capacitor and platform dependencies up to date
- Use HTTPS in production environments
- Implement proper session management

### Web Platform
- Ensure your domain supports WebAuthn properly
- Use secure contexts (HTTPS)
- Implement proper CORS policies
- Validate all data on the server side

### Android
- Enable ProGuard/R8 in production builds
- Use certificate pinning for sensitive applications
- Implement root detection if required
- Follow Android security best practices

### iOS
- Enable App Transport Security
- Use proper entitlements
- Implement jailbreak detection if required
- Follow iOS security best practices

### Session Management
- Configure appropriate session durations
- Implement session invalidation on logout
- Use secure session storage
- Rotate session tokens regularly

### Credential Storage
- Never store credentials in plain text
- Use the platform's secure storage mechanisms
- Implement proper access controls
- Clear credentials on app uninstall (handled by platform)

## Known Security Considerations

1. **Biometric Data**: This plugin does NOT store or have access to actual biometric data. All biometric matching is handled by the operating system.

2. **Fallback Methods**: When allowing device credentials as fallback, users can authenticate with PIN/password instead of biometrics. Consider if this meets your security requirements.

3. **Web Platform Limitations**: WebAuthn support varies by browser and platform. Always implement server-side verification.

4. **Session Tokens**: Session tokens are stored in platform-specific secure storage but should still be treated as sensitive data.

## Security Updates

Security updates will be released as patch versions and announced through:
- GitHub Releases
- npm package updates
- Security advisories (for critical issues)

## Compliance

This plugin is designed to help with compliance for:
- GDPR (no biometric data storage)
- PCI DSS (when used as part of secure authentication)
- HIPAA (when properly configured)

However, compliance is ultimately the responsibility of the implementing application.

## Contact

For security concerns, please contact the maintainers directly rather than using public issue trackers.