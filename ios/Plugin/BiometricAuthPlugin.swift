import Foundation
import Capacitor
import LocalAuthentication
import Security

@objc(BiometricAuthPlugin)
public class BiometricAuthPlugin: CAPPlugin {
    private let PREFS_KEY = "BiometricAuthPrefs"
    private let SESSION_TOKEN_KEY = "session_token"
    private let SESSION_EXPIRY_KEY = "session_expiry"
    private let STORED_CREDENTIALS_KEY = "stored_credentials"
    private let KEYCHAIN_SERVICE = "com.aoneahsan.biometricauth"
    
    // Configuration
    private var sessionDuration: TimeInterval = 3600 // 1 hour default
    private var encryptionSecret = "default-secret"
    private var allowDeviceCredential = true
    private var maxAttempts = 3
    private var lockoutDuration: TimeInterval = 30 // 30 seconds
    
    // Base64URL utilities for WebAuthn compatibility
    private func base64UrlEncode(_ data: Data) -> String {
        return data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
    
    private func base64UrlDecode(_ string: String) -> Data? {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        // Add padding if needed
        while base64.count % 4 != 0 {
            base64 += "="
        }
        
        return Data(base64Encoded: base64)
    }
    
    private func createEnhancedToken(credentialId: String, type: String, credentialData: [String: Any]? = nil) -> String {
        var tokenPayload: [String: Any] = [
            "credentialId": credentialId,
            "timestamp": Date().timeIntervalSince1970 * 1000,
            "sessionId": UUID().uuidString,
            "type": type
        ]
        
        if let credentialData = credentialData {
            tokenPayload["credentialData"] = credentialData
        }
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: tokenPayload)
            return jsonData.base64EncodedString()
        } catch {
            print("Failed to create enhanced token: \(error)")
            return UUID().uuidString // Fallback to simple token
        }
    }
    
    private func createClientDataJSON(type: String, challenge: String) -> String {
        let clientData: [String: Any] = [
            "type": type,
            "challenge": Data(challenge.utf8).base64EncodedString(),
            "origin": "ios-app://com.yourapp.bundle", // Should be configurable
            "crossOrigin": false
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: clientData)
            return String(data: jsonData, encoding: .utf8) ?? "{}"
        } catch {
            print("Failed to create client data JSON: \(error)")
            return "{}"
        }
    }
    
    private func generateDeviceFingerprint() -> String {
        var fingerprintComponents: [String] = []
        
        // Device model
        var systemInfo = utsname()
        uname(&systemInfo)
        let deviceModel = String(bytes: Data(bytes: &systemInfo.machine, count: Int(_SYS_NAMELEN)), encoding: .ascii)?.trimmingCharacters(in: .controlCharacters) ?? "unknown"
        fingerprintComponents.append(deviceModel)
        
        // Screen resolution
        let screenSize = UIScreen.main.bounds
        let screenScale = UIScreen.main.scale
        let screenInfo = "\(Int(screenSize.width * screenScale))x\(Int(screenSize.height * screenScale))"
        fingerprintComponents.append(screenInfo)
        
        // Language/Locale
        let locale = Locale.current.identifier
        fingerprintComponents.append(locale)
        
        // Timezone
        let timezone = TimeZone.current.identifier
        fingerprintComponents.append(timezone)
        
        // iOS version
        let iosVersion = UIDevice.current.systemVersion
        fingerprintComponents.append(iosVersion)
        
        let fingerprint = fingerprintComponents.joined(separator: "|")
        let fingerprintData = fingerprint.data(using: .utf8) ?? Data()
        let base64Fingerprint = fingerprintData.base64EncodedString()
        
        // Return first 32 characters
        return String(base64Fingerprint.prefix(32))
    }
    
    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        
        let policy: LAPolicy = allowDeviceCredential ? .deviceOwnerAuthentication : .deviceOwnerAuthenticationWithBiometrics
        let canAuthenticate = context.canEvaluatePolicy(policy, error: &error)
        
        var result: [String: Any] = ["available": canAuthenticate]
        if !canAuthenticate, let error = error {
            var reason = ""
            switch error.code {
            case LAError.biometryNotAvailable.rawValue:
                reason = "hardwareUnavailable"
            case LAError.biometryNotEnrolled.rawValue:
                reason = "noEnrolledBiometrics"
            case LAError.biometryLockout.rawValue:
                reason = "lockedOut"
            case LAError.passcodeNotSet.rawValue:
                reason = "noHardware"
            default:
                reason = "notSupported"
            }
            result["reason"] = reason
            result["errorMessage"] = error.localizedDescription
        }
        
        call.resolve(result)
    }
    
    @objc func getSupportedBiometrics(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        var biometrics: [String] = []
        
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            if #available(iOS 11.0, *) {
                switch context.biometryType {
                case .touchID:
                    biometrics.append("touchId")
                    biometrics.append("fingerprint")
                case .faceID:
                    biometrics.append("faceId")
                case .none:
                    break
                @unknown default:
                    break
                }
            } else {
                // Fallback for older iOS versions
                biometrics.append("touchId")
                biometrics.append("fingerprint")
            }
        }
        
        if allowDeviceCredential && context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
            biometrics.append("passcode")
            biometrics.append("pattern")
            biometrics.append("pin")
        }
        
        call.resolve(["biometrics": biometrics])
    }
    
    @objc func authenticate(_ call: CAPPluginCall) {
        let context = LAContext()
        context.localizedCancelTitle = call.getString("cancelButtonTitle") ?? "Cancel"
        
        if !allowDeviceCredential, let fallbackTitle = call.getString("fallbackButtonTitle") {
            context.localizedFallbackTitle = fallbackTitle
        }
        
        let reason = call.getString("description") ?? call.getString("subtitle") ?? call.getString("title") ?? "Authenticate to continue"
        
        let policy: LAPolicy = allowDeviceCredential ? .deviceOwnerAuthentication : .deviceOwnerAuthenticationWithBiometrics
        
        context.evaluatePolicy(policy, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    // Generate credential data for mobile authentication
                    let credentialId = "mobile_" + UUID().uuidString.replacingOccurrences(of: "-", with: "")
                    let sessionId = UUID().uuidString
                    
                    // Create enhanced credential data for backend verification
                    let credentialData: [String: Any] = [
                        "id": credentialId,
                        "rawId": self.base64UrlEncode(credentialId.data(using: .utf8) ?? Data()),
                        "response": [
                            "authenticatorData": "", // Empty for mobile (handled by backend)
                            "clientDataJSON": self.base64UrlEncode(self.createClientDataJSON(type: "webauthn.get", 
                                challenge: "mobile_auth_\(Int(Date().timeIntervalSince1970 * 1000))").data(using: .utf8) ?? Data()),
                            "signature": self.base64UrlEncode("mobile_signature_\(sessionId)".data(using: .utf8) ?? Data()),
                            "userHandle": "" // Will be set by backend
                        ],
                        "type": "public-key",
                        "clientExtensionResults": "{}",
                        "authenticatorAttachment": "platform",
                        "deviceFingerprint": self.generateDeviceFingerprint()
                    ]
                    
                    // Create enhanced token with credential data
                    let token = self.createEnhancedToken(credentialId: credentialId, type: "authentication", credentialData: credentialData)
                    
                    // Store session
                    UserDefaults.standard.set(token, forKey: self.SESSION_TOKEN_KEY)
                    UserDefaults.standard.set(Date().addingTimeInterval(self.sessionDuration), forKey: self.SESSION_EXPIRY_KEY)
                    
                    call.resolve([
                        "success": true,
                        "sessionId": sessionId,
                        "token": token
                    ])
                } else {
                    var errorCode = "unknown"
                    var errorMessage = "Authentication failed"
                    
                    if let error = error as NSError? {
                        switch error.code {
                        case LAError.userCancel.rawValue:
                            errorCode = "userCancelled"
                            errorMessage = "User cancelled authentication"
                        case LAError.userFallback.rawValue:
                            errorCode = "userCancelled"
                            errorMessage = "User chose fallback"
                        case LAError.systemCancel.rawValue:
                            errorCode = "systemCancelled"
                            errorMessage = "System cancelled authentication"
                        case LAError.authenticationFailed.rawValue:
                            errorCode = "authenticationFailed"
                            errorMessage = "Authentication failed"
                        case LAError.biometryLockout.rawValue:
                            errorCode = "lockedOut"
                            errorMessage = "Biometry is locked out"
                        case LAError.biometryNotAvailable.rawValue:
                            errorCode = "notAvailable"
                            errorMessage = "Biometry is not available"
                        case LAError.biometryNotEnrolled.rawValue:
                            errorCode = "notEnrolled"
                            errorMessage = "No biometric data enrolled"
                        default:
                            errorMessage = error.localizedDescription
                        }
                    }
                    
                    call.resolve([
                        "success": false,
                        "error": [
                            "code": errorCode,
                            "message": errorMessage
                        ]
                    ])
                }
            }
        }
    }
    
    @objc func register(_ call: CAPPluginCall) {
        let context = LAContext()
        context.localizedCancelTitle = call.getString("cancelButtonTitle") ?? "Cancel"
        
        let reason = call.getString("description") ?? call.getString("subtitle") ?? call.getString("title") ?? "Register biometric authentication"
        
        let policy: LAPolicy = allowDeviceCredential ? .deviceOwnerAuthentication : .deviceOwnerAuthenticationWithBiometrics
        
        context.evaluatePolicy(policy, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    // Generate credential data for mobile registration
                    let credentialId = "mobile_" + UUID().uuidString.replacingOccurrences(of: "-", with: "")
                    let sessionId = UUID().uuidString
                    
                    // Create enhanced credential data for backend verification
                    let credentialData: [String: Any] = [
                        "id": credentialId,
                        "rawId": self.base64UrlEncode(credentialId.data(using: .utf8) ?? Data()),
                        "response": [
                            "attestationObject": ("mobile_attestation".data(using: .utf8) ?? Data()).base64EncodedString(),
                            "clientDataJSON": self.base64UrlEncode(self.createClientDataJSON(type: "webauthn.create", 
                                challenge: "mobile_registration_\(Int(Date().timeIntervalSince1970 * 1000))").data(using: .utf8) ?? Data()),
                            "transports": ["internal"]
                        ],
                        "type": "public-key",
                        "clientExtensionResults": "{}",
                        "authenticatorAttachment": "platform",
                        "deviceFingerprint": self.generateDeviceFingerprint()
                    ]
                    
                    // Create enhanced token with credential data
                    let token = self.createEnhancedToken(credentialId: credentialId, type: "registration", credentialData: credentialData)
                    
                    // Store session
                    UserDefaults.standard.set(token, forKey: self.SESSION_TOKEN_KEY)
                    UserDefaults.standard.set(Date().addingTimeInterval(self.sessionDuration), forKey: self.SESSION_EXPIRY_KEY)
                    
                    call.resolve([
                        "success": true,
                        "sessionId": sessionId,
                        "token": token
                    ])
                } else {
                    var errorCode = "unknown"
                    var errorMessage = "Registration failed"
                    
                    if let error = error as NSError? {
                        switch error.code {
                        case LAError.userCancel.rawValue:
                            errorCode = "userCancelled"
                            errorMessage = "User cancelled registration"
                        case LAError.userFallback.rawValue:
                            errorCode = "userCancelled"
                            errorMessage = "User chose fallback"
                        case LAError.systemCancel.rawValue:
                            errorCode = "systemCancelled"
                            errorMessage = "System cancelled registration"
                        case LAError.authenticationFailed.rawValue:
                            errorCode = "authenticationFailed"
                            errorMessage = "Registration failed"
                        case LAError.biometryLockout.rawValue:
                            errorCode = "lockedOut"
                            errorMessage = "Biometry is locked out"
                        case LAError.biometryNotAvailable.rawValue:
                            errorCode = "notAvailable"
                            errorMessage = "Biometry is not available"
                        case LAError.biometryNotEnrolled.rawValue:
                            errorCode = "notEnrolled"
                            errorMessage = "No biometric data enrolled"
                        default:
                            errorMessage = error.localizedDescription
                        }
                    }
                    
                    call.resolve([
                        "success": false,
                        "error": [
                            "code": errorCode,
                            "message": errorMessage
                        ]
                    ])
                }
            }
        }
    }
    
    @objc func deleteCredentials(_ call: CAPPluginCall) {
        // Clear session data
        UserDefaults.standard.removeObject(forKey: SESSION_TOKEN_KEY)
        UserDefaults.standard.removeObject(forKey: SESSION_EXPIRY_KEY)
        UserDefaults.standard.removeObject(forKey: STORED_CREDENTIALS_KEY)
        
        // Clear all items from keychain for this service
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: KEYCHAIN_SERVICE
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        if status == errSecSuccess || status == errSecItemNotFound {
            call.resolve()
        } else {
            call.reject("Failed to delete credentials")
        }
    }
    
    @objc func configure(_ call: CAPPluginCall) {
        if let config = call.getObject("config") {
            if let duration = config["sessionDuration"] as? Double {
                sessionDuration = duration
            }
            
            if let secret = config["encryptionSecret"] as? String {
                encryptionSecret = secret
            }
            
            if let fallbackMethods = config["fallbackMethods"] as? [String] {
                // Check if any device credential methods are allowed
                allowDeviceCredential = fallbackMethods.contains { method in
                    ["passcode", "pattern", "pin"].contains(method)
                }
            }
            
            if let attempts = config["maxAttempts"] as? Int {
                maxAttempts = attempts
            }
            
            if let lockout = config["lockoutDuration"] as? Double {
                lockoutDuration = lockout
            }
        }
        
        call.resolve()
    }
}