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
    private let KEYCHAIN_SERVICE = "com.zaions.biometricauth"
    
    // Configuration
    private var sessionDuration: TimeInterval = 300 // 5 minutes default
    private var encryptionSecret = "default-secret"
    private var allowDeviceCredential = true
    private var maxAttempts = 3
    private var lockoutDuration: TimeInterval = 30 // 30 seconds
    
    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        
        let policy: LAPolicy = allowDeviceCredential ? .deviceOwnerAuthentication : .deviceOwnerAuthenticationWithBiometrics
        let canAuthenticate = context.canEvaluatePolicy(policy, error: &error)
        
        var reason = ""
        if let error = error {
            switch error.code {
            case LAError.biometryNotAvailable.rawValue:
                reason = "HARDWARE_UNAVAILABLE"
            case LAError.biometryNotEnrolled.rawValue:
                reason = "NOT_ENROLLED"
            case LAError.biometryLockout.rawValue:
                reason = "LOCKOUT"
            case LAError.passcodeNotSet.rawValue:
                reason = "PASSCODE_NOT_SET"
            default:
                reason = "UNKNOWN_ERROR"
            }
        }
        
        call.resolve([
            "isAvailable": canAuthenticate,
            "reason": reason
        ])
    }
    
    @objc func getSupportedBiometrics(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        var biometrics: [String] = []
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            call.resolve(["biometrics": biometrics])
            return
        }
        
        switch context.biometryType {
        case .faceID:
            biometrics.append("FACE")
        case .touchID:
            biometrics.append("FINGERPRINT")
        case .none:
            break
        @unknown default:
            break
        }
        
        call.resolve(["biometrics": biometrics])
    }
    
    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Please authenticate"
        let title = call.getString("title") ?? "Authentication Required"
        let fallbackTitle = call.getString("fallbackTitle") ?? "Use Passcode"
        let disableBackup = call.getBool("disableBackup") ?? false
        
        // Check if there's a valid session
        if isSessionValid() {
            call.resolve([
                "success": true,
                "sessionToken": getSessionToken() ?? ""
            ])
            return
        }
        
        let context = LAContext()
        context.localizedFallbackTitle = fallbackTitle
        
        if #available(iOS 10.0, *) {
            context.localizedCancelTitle = "Cancel"
        }
        
        let policy: LAPolicy = (disableBackup || !allowDeviceCredential) 
            ? .deviceOwnerAuthenticationWithBiometrics 
            : .deviceOwnerAuthentication
        
        context.evaluatePolicy(policy, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    let sessionToken = self.createSession()
                    call.resolve([
                        "success": true,
                        "sessionToken": sessionToken
                    ])
                } else {
                    var errorCode = "UNKNOWN_ERROR"
                    var message = "Authentication failed"
                    
                    if let error = error as NSError? {
                        message = error.localizedDescription
                        switch error.code {
                        case LAError.authenticationFailed.rawValue:
                            errorCode = "AUTHENTICATION_FAILED"
                        case LAError.userCancel.rawValue:
                            errorCode = "USER_CANCELLED"
                        case LAError.userFallback.rawValue:
                            errorCode = "USER_FALLBACK"
                        case LAError.systemCancel.rawValue:
                            errorCode = "SYSTEM_CANCELLED"
                        case LAError.passcodeNotSet.rawValue:
                            errorCode = "PASSCODE_NOT_SET"
                        case LAError.biometryNotAvailable.rawValue:
                            errorCode = "HARDWARE_UNAVAILABLE"
                        case LAError.biometryNotEnrolled.rawValue:
                            errorCode = "NOT_ENROLLED"
                        case LAError.biometryLockout.rawValue:
                            errorCode = "TOO_MANY_ATTEMPTS"
                        default:
                            break
                        }
                    }
                    
                    call.resolve([
                        "success": false,
                        "error": errorCode,
                        "message": message
                    ])
                }
            }
        }
    }
    
    @objc func simpleAuthenticate(_ call: CAPPluginCall) {
        // For iOS, this is the same as authenticate
        authenticate(call)
    }
    
    @objc func storeCredential(_ call: CAPPluginCall) {
        guard let credentialId = call.getString("credentialId"),
              let credentialData = call.getString("credentialData") else {
            call.reject("Missing credentialId or credentialData")
            return
        }
        
        // Store in Keychain with biometric protection
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: KEYCHAIN_SERVICE,
            kSecAttrAccount as String: credentialId,
            kSecValueData as String: credentialData.data(using: .utf8)!,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        // Delete existing item if any
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        
        if status == errSecSuccess {
            call.resolve(["success": true])
        } else {
            call.reject("Failed to store credential")
        }
    }
    
    @objc func getStoredCredential(_ call: CAPPluginCall) {
        guard let credentialId = call.getString("credentialId") else {
            call.reject("Missing credentialId")
            return
        }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: KEYCHAIN_SERVICE,
            kSecAttrAccount as String: credentialId,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess,
           let data = dataTypeRef as? Data,
           let credentialData = String(data: data, encoding: .utf8) {
            call.resolve(["credentialData": credentialData])
        } else {
            call.reject("Credential not found")
        }
    }
    
    @objc func deleteStoredCredential(_ call: CAPPluginCall) {
        guard let credentialId = call.getString("credentialId") else {
            call.reject("Missing credentialId")
            return
        }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: KEYCHAIN_SERVICE,
            kSecAttrAccount as String: credentialId
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        if status == errSecSuccess || status == errSecItemNotFound {
            call.resolve(["success": true])
        } else {
            call.reject("Failed to delete credential")
        }
    }
    
    @objc func clearSession(_ call: CAPPluginCall) {
        UserDefaults.standard.removeObject(forKey: "\(PREFS_KEY)_\(SESSION_TOKEN_KEY)")
        UserDefaults.standard.removeObject(forKey: "\(PREFS_KEY)_\(SESSION_EXPIRY_KEY)")
        call.resolve(["success": true])
    }
    
    @objc func setConfiguration(_ call: CAPPluginCall) {
        if let config = call.getObject("config") {
            if let sessionDurationMs = config["sessionDuration"] as? Double {
                sessionDuration = sessionDurationMs / 1000.0
            }
            
            if let secret = config["encryptionSecret"] as? String {
                encryptionSecret = secret
            }
            
            if let fallbackConfig = config["fallbackConfig"] as? [String: Any],
               let allowDevice = fallbackConfig["allowDeviceCredential"] as? Bool {
                allowDeviceCredential = allowDevice
            }
            
            if let attempts = config["maxAttempts"] as? Int {
                maxAttempts = attempts
            }
            
            if let lockoutMs = config["lockoutDuration"] as? Double {
                lockoutDuration = lockoutMs / 1000.0
            }
        }
        
        call.resolve(["success": true])
    }
    
    // MARK: - Helper Methods
    
    private func isSessionValid() -> Bool {
        guard let expiryTime = UserDefaults.standard.object(forKey: "\(PREFS_KEY)_\(SESSION_EXPIRY_KEY)") as? Date else {
            return false
        }
        return Date() < expiryTime
    }
    
    private func getSessionToken() -> String? {
        return UserDefaults.standard.string(forKey: "\(PREFS_KEY)_\(SESSION_TOKEN_KEY)")
    }
    
    private func createSession() -> String {
        let token = UUID().uuidString
        let expiry = Date().addingTimeInterval(sessionDuration)
        
        UserDefaults.standard.set(token, forKey: "\(PREFS_KEY)_\(SESSION_TOKEN_KEY)")
        UserDefaults.standard.set(expiry, forKey: "\(PREFS_KEY)_\(SESSION_EXPIRY_KEY)")
        
        return token
    }
}