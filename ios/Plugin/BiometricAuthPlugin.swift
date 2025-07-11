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
                    // Generate session
                    let sessionId = UUID().uuidString
                    let token = UUID().uuidString
                    
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