package com.aoneahsan.capacitor.biometricauth;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.KeyGenerator;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.UUID;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.RSAKeyGenParameterSpec;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import android.security.keystore.KeyInfo;
import java.security.KeyFactory;
import android.os.Build;
import androidx.annotation.RequiresApi;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    
    private static final String TAG = "BiometricAuth";
    private static final String KEY_ALIAS = "BiometricAuthKey";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    
    // Shared preferences keys
    private static final String PREFS_NAME = "BiometricAuthPrefs";
    private static final String PREF_SESSION_TOKEN = "sessionToken";
    private static final String PREF_SESSION_EXPIRY = "sessionExpiry";
    private static final String PREF_STORED_CREDENTIALS = "storedCredentials";
    
    // Configuration
    private long sessionDuration = 3600; // 1 hour in seconds
    private String encryptionSecret = "";
    private boolean allowDeviceCredential = true;
    private int maxAttempts = 3;
    private int lockoutDuration = 30;
    
    // Crypto constants
    private static final String KEY_PAIR_ALIAS_PREFIX = "BiometricAuthKeyPair_";
    private static final String SECRET_KEY_ALIAS_PREFIX = "BiometricAuthSecret_";
    
    private KeyStore keyStore;
    private BiometricPrompt biometricPrompt;
    private BiometricPrompt.PromptInfo promptInfo;
    
    @Override
    public void load() {
        try {
            keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize keystore", e);
        }
    }
    
    // Base64URL utilities for WebAuthn compatibility
    private String base64UrlEncode(byte[] data) {
        return Base64.encodeToString(data, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING);
    }
    
    private byte[] base64UrlDecode(String data) {
        // Add padding if needed
        String padded = data;
        while (padded.length() % 4 != 0) {
            padded += "=";
        }
        return Base64.decode(padded, Base64.URL_SAFE);
    }
    
    private String createEnhancedToken(String credentialId, String type, JSObject credentialData) {
        try {
            JSONObject tokenPayload = new JSONObject();
            tokenPayload.put("credentialId", credentialId);
            tokenPayload.put("timestamp", System.currentTimeMillis());
            tokenPayload.put("sessionId", UUID.randomUUID().toString());
            tokenPayload.put("type", type);
            
            if (credentialData != null) {
                tokenPayload.put("credentialData", new JSONObject(credentialData.toString()));
            }
            
            String tokenJson = tokenPayload.toString();
            return Base64.encodeToString(tokenJson.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
        } catch (JSONException e) {
            Log.e(TAG, "Failed to create enhanced token", e);
            return UUID.randomUUID().toString(); // Fallback to simple token
        }
    }
    
    private String createClientDataJSON(String type, String challenge) {
        try {
            JSONObject clientData = new JSONObject();
            clientData.put("type", type);
            clientData.put("challenge", Base64.encodeToString(challenge.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP));
            clientData.put("origin", "android-app://com.yourapp.package"); // Should be configurable
            clientData.put("crossOrigin", false);
            return clientData.toString();
        } catch (JSONException e) {
            Log.e(TAG, "Failed to create client data JSON", e);
            return "{}";
        }
    }
    
    @PluginMethod
    public void isAvailable(PluginCall call) {
        Context context = getContext();
        BiometricManager biometricManager = BiometricManager.from(context);
        
        JSObject result = new JSObject();
        int canAuthenticate = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
        
        switch (canAuthenticate) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                result.put("available", true);
                break;
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                result.put("available", false);
                result.put("reason", "noHardware");
                result.put("errorMessage", "No biometric hardware detected");
                break;
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                result.put("available", false);
                result.put("reason", "hardwareUnavailable");
                result.put("errorMessage", "Biometric hardware is unavailable");
                break;
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                result.put("available", false);
                result.put("reason", "noEnrolledBiometrics");
                result.put("errorMessage", "No biometric data enrolled");
                break;
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                result.put("available", false);
                result.put("reason", "securityUpdateRequired");
                result.put("errorMessage", "Security update required");
                break;
            case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:
                result.put("available", false);
                result.put("reason", "notSupported");
                result.put("errorMessage", "Biometric authentication not supported");
                break;
            default:
                result.put("available", false);
                result.put("reason", "unknown");
                result.put("errorMessage", "Unknown error");
                break;
        }
        
        call.resolve(result);
    }
    
    @PluginMethod
    public void getSupportedBiometrics(PluginCall call) {
        Context context = getContext();
        BiometricManager biometricManager = BiometricManager.from(context);
        
        JSONArray biometrics = new JSONArray();
        
        // Check for different biometric types
        int canAuthenticate = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        if (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS) {
            // Android doesn't differentiate between fingerprint, face, etc. at API level
            // We'll return generic biometric support
            biometrics.put("fingerprint");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                biometrics.put("faceAuthentication");
            }
        }
        
        // Check for device credential
        if (allowDeviceCredential) {
            int deviceCredential = biometricManager.canAuthenticate(BiometricManager.Authenticators.DEVICE_CREDENTIAL);
            if (deviceCredential == BiometricManager.BIOMETRIC_SUCCESS) {
                biometrics.put("passcode");
                biometrics.put("pattern");
                biometrics.put("pin");
            }
        }
        
        JSObject result = new JSObject();
        result.put("biometrics", biometrics);
        call.resolve(result);
    }
    
    @PluginMethod
    public void authenticate(PluginCall call) {
        Activity activity = getActivity();
        if (!(activity instanceof FragmentActivity)) {
            call.reject("Activity must be a FragmentActivity");
            return;
        }
        
        FragmentActivity fragmentActivity = (FragmentActivity) activity;
        
        // Get options
        String title = call.getString("title", "Authenticate");
        String subtitle = call.getString("subtitle", "");
        String description = call.getString("description", "");
        String fallbackButtonTitle = call.getString("fallbackButtonTitle", "Use Passcode");
        String cancelButtonTitle = call.getString("cancelButtonTitle", "Cancel");
        boolean disableFallback = call.getBoolean("disableFallback", false);
        boolean saveCredentials = call.getBoolean("saveCredentials", false);
        
        // Create executor
        Executor executor = ContextCompat.getMainExecutor(activity);
        
        // Create authentication callback
        biometricPrompt = new BiometricPrompt(fragmentActivity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                
                JSObject result = new JSObject();
                result.put("success", false);
                
                JSObject error = new JSObject();
                switch (errorCode) {
                    case BiometricPrompt.ERROR_USER_CANCELED:
                        error.put("code", "userCancelled");
                        break;
                    case BiometricPrompt.ERROR_LOCKOUT:
                        error.put("code", "lockedOut");
                        break;
                    case BiometricPrompt.ERROR_TIMEOUT:
                        error.put("code", "timeout");
                        break;
                    default:
                        error.put("code", "authenticationFailed");
                        break;
                }
                error.put("message", errString.toString());
                
                result.put("error", error);
                call.resolve(result);
            }
            
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult authResult) {
                super.onAuthenticationSucceeded(authResult);
                
                // Generate credential data for mobile authentication
                String credentialId = "mobile_" + UUID.randomUUID().toString().replace("-", "");
                String sessionId = UUID.randomUUID().toString();
                
                // Create enhanced credential data for backend verification
                JSObject credentialData = new JSObject();
                credentialData.put("id", credentialId);
                credentialData.put("rawId", base64UrlEncode(credentialId.getBytes(StandardCharsets.UTF_8)));
                
                JSObject response = new JSObject();
                response.put("authenticatorData", ""); // Empty for mobile (handled by backend)
                response.put("clientDataJSON", base64UrlEncode(createClientDataJSON("webauthn.get", 
                    "mobile_auth_" + System.currentTimeMillis()).getBytes(StandardCharsets.UTF_8)));
                response.put("signature", base64UrlEncode(("mobile_signature_" + sessionId).getBytes(StandardCharsets.UTF_8)));
                response.put("userHandle", ""); // Will be set by backend
                
                credentialData.put("response", response);
                credentialData.put("type", "public-key");
                credentialData.put("clientExtensionResults", "{}");
                credentialData.put("authenticatorAttachment", "platform");
                
                // Create enhanced token with credential data
                String token = createEnhancedToken(credentialId, "authentication", credentialData);
                
                // Store session
                SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(PREF_SESSION_TOKEN, token);
                editor.putLong(PREF_SESSION_EXPIRY, System.currentTimeMillis() + (sessionDuration * 1000));
                editor.apply();
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("sessionId", sessionId);
                result.put("token", token);
                
                call.resolve(result);
            }
            
            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                // Don't resolve here, let the user try again
            }
        });
        
        // Create prompt info
        BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setDescription(description);
        
        if (disableFallback || !allowDeviceCredential) {
            builder.setNegativeButtonText(cancelButtonTitle);
        } else {
            builder.setDeviceCredentialAllowed(true);
        }
        
        promptInfo = builder.build();
        
        // Show biometric prompt
        activity.runOnUiThread(() -> {
            biometricPrompt.authenticate(promptInfo);
        });
    }
    
    @PluginMethod
    public void register(PluginCall call) {
        // For mobile registration, we use the same biometric authentication flow
        // but mark the token as "registration" type
        Activity activity = getActivity();
        if (!(activity instanceof FragmentActivity)) {
            call.reject("Activity must be a FragmentActivity");
            return;
        }
        
        FragmentActivity fragmentActivity = (FragmentActivity) activity;
        
        // Get options
        String title = call.getString("title", "Register Biometric");
        String subtitle = call.getString("subtitle", "");
        String description = call.getString("description", "");
        String cancelButtonTitle = call.getString("cancelButtonTitle", "Cancel");
        
        // Create executor
        Executor executor = ContextCompat.getMainExecutor(activity);
        
        // Create registration callback
        biometricPrompt = new BiometricPrompt(fragmentActivity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                
                JSObject result = new JSObject();
                result.put("success", false);
                
                JSObject error = new JSObject();
                switch (errorCode) {
                    case BiometricPrompt.ERROR_USER_CANCELED:
                        error.put("code", "userCancelled");
                        break;
                    case BiometricPrompt.ERROR_LOCKOUT:
                        error.put("code", "lockedOut");
                        break;
                    case BiometricPrompt.ERROR_TIMEOUT:
                        error.put("code", "timeout");
                        break;
                    default:
                        error.put("code", "authenticationFailed");
                        break;
                }
                error.put("message", errString.toString());
                
                result.put("error", error);
                call.resolve(result);
            }
            
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult authResult) {
                super.onAuthenticationSucceeded(authResult);
                
                // Generate credential data for mobile registration
                String credentialId = "mobile_" + UUID.randomUUID().toString().replace("-", "");
                String sessionId = UUID.randomUUID().toString();
                
                // Create enhanced credential data for backend verification
                JSObject credentialData = new JSObject();
                credentialData.put("id", credentialId);
                credentialData.put("rawId", base64UrlEncode(credentialId.getBytes(StandardCharsets.UTF_8)));
                
                JSObject response = new JSObject();
                response.put("attestationObject", Base64.encodeToString("mobile_attestation".getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP));
                response.put("clientDataJSON", base64UrlEncode(createClientDataJSON("webauthn.create", 
                    "mobile_registration_" + System.currentTimeMillis()).getBytes(StandardCharsets.UTF_8)));
                
                JSONArray transports = new JSONArray();
                transports.put("internal");
                response.put("transports", transports);
                
                credentialData.put("response", response);
                credentialData.put("type", "public-key");
                credentialData.put("clientExtensionResults", "{}");
                credentialData.put("authenticatorAttachment", "platform");
                
                // Create enhanced token with credential data
                String token = createEnhancedToken(credentialId, "registration", credentialData);
                
                // Store session
                SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(PREF_SESSION_TOKEN, token);
                editor.putLong(PREF_SESSION_EXPIRY, System.currentTimeMillis() + (sessionDuration * 1000));
                editor.apply();
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("sessionId", sessionId);
                result.put("token", token);
                
                call.resolve(result);
            }
            
            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                // Don't resolve here, let the user try again
            }
        });
        
        // Create prompt info
        BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setDescription(description)
                .setNegativeButtonText(cancelButtonTitle);
        
        promptInfo = builder.build();
        
        // Show biometric prompt
        activity.runOnUiThread(() -> {
            biometricPrompt.authenticate(promptInfo);
        });
    }
    
    @PluginMethod
    public void deleteCredentials(PluginCall call) {
        try {
            // Clear all stored credentials
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.remove(PREF_STORED_CREDENTIALS);
            editor.remove(PREF_SESSION_TOKEN);
            editor.remove(PREF_SESSION_EXPIRY);
            editor.apply();
            
            // Delete encryption key
            if (keyStore.containsAlias(KEY_ALIAS)) {
                keyStore.deleteEntry(KEY_ALIAS);
            }
            
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to delete credentials", e);
            call.reject("Failed to delete credentials: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void configure(PluginCall call) {
        JSObject config = call.getObject("config");
        
        if (config != null) {
            // getLong doesn't support default values, so we need to check if it exists
            if (config.has("sessionDuration")) {
                try {
                    sessionDuration = config.getLong("sessionDuration");
                } catch (JSONException e) {
                    // Keep default value
                }
            }
            encryptionSecret = config.getString("encryptionSecret", encryptionSecret);
            
            JSObject uiConfig = config.getJSObject("uiConfig");
            if (uiConfig != null) {
                // Android doesn't support these UI customizations
                // but we'll store them for consistency
            }
            
            JSONArray fallbackMethods = null;
            try {
                fallbackMethods = config.getJSONArray("fallbackMethods");
                if (fallbackMethods != null && fallbackMethods.length() > 0) {
                    // Check if any device credential methods are allowed
                    allowDeviceCredential = false;
                    for (int i = 0; i < fallbackMethods.length(); i++) {
                        String method = fallbackMethods.getString(i);
                        if (method.equals("passcode") || method.equals("pattern") || method.equals("pin")) {
                            allowDeviceCredential = true;
                            break;
                        }
                    }
                }
            } catch (JSONException e) {
                // Keep default value
            }
            
            if (config.has("maxAttempts")) {
                try {
                    maxAttempts = config.getInt("maxAttempts");
                } catch (JSONException e) {
                    // Keep default value
                }
            }
            if (config.has("lockoutDuration")) {
                try {
                    lockoutDuration = config.getInt("lockoutDuration");
                } catch (JSONException e) {
                    // Keep default value
                }
            }
        }
        
        call.resolve();
    }
    
    // Helper methods
    @RequiresApi(api = Build.VERSION_CODES.M)
    private void generateSecretKey() throws NoSuchAlgorithmException, NoSuchProviderException,
            InvalidAlgorithmParameterException {
        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        KeyGenParameterSpec keyGenParameterSpec = new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(false)
                .build();
        keyGenerator.init(keyGenParameterSpec);
        keyGenerator.generateKey();
    }
    
    @RequiresApi(api = Build.VERSION_CODES.M)
    private KeyPair generateKeyPair(String alias, JSObject androidOptions) throws Exception {
        String algorithm = androidOptions.getString("signatureAlgorithm", "SHA256withECDSA");
        int keySize = androidOptions.getInt("keySize", 256);
        int authValidityDuration = androidOptions.getInt("authenticationValidityDuration", -1);
        boolean invalidateOnEnrollment = androidOptions.getBoolean("invalidateOnEnrollment", true);
        boolean requireStrongBiometric = androidOptions.getBoolean("requireStrongBiometric", false);
        
        KeyPairGenerator keyPairGenerator;
        KeyGenParameterSpec.Builder specBuilder;
        
        if (algorithm.contains("RSA")) {
            keyPairGenerator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, ANDROID_KEYSTORE);
            specBuilder = new KeyGenParameterSpec.Builder(alias,
                    KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
                    .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                    .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                    .setKeySize(keySize > 0 ? keySize : 2048);
        } else {
            keyPairGenerator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE);
            specBuilder = new KeyGenParameterSpec.Builder(alias,
                    KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
                    .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                    .setKeySize(keySize > 0 ? keySize : 256);
        }
        
        specBuilder.setUserAuthenticationRequired(true);
        
        if (authValidityDuration >= 0) {
            specBuilder.setUserAuthenticationValidityDurationSeconds(authValidityDuration);
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            specBuilder.setInvalidatedByBiometricEnrollment(invalidateOnEnrollment);
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && requireStrongBiometric) {
            specBuilder.setUserAuthenticationParameters(0, 
                KeyProperties.AUTH_BIOMETRIC_STRONG);
        }
        
        keyPairGenerator.initialize(specBuilder.build());
        return keyPairGenerator.generateKeyPair();
    }
    
    @RequiresApi(api = Build.VERSION_CODES.M)
    private SecretKey generateSecretKeyForCrypto(String alias, JSObject androidOptions) throws Exception {
        int authValidityDuration = androidOptions.getInt("authenticationValidityDuration", -1);
        boolean invalidateOnEnrollment = androidOptions.getBoolean("invalidateOnEnrollment", true);
        boolean requireStrongBiometric = androidOptions.getBoolean("requireStrongBiometric", false);
        
        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        
        KeyGenParameterSpec.Builder specBuilder = new KeyGenParameterSpec.Builder(alias,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(true)
                .setKeySize(256);
        
        if (authValidityDuration >= 0) {
            specBuilder.setUserAuthenticationValidityDurationSeconds(authValidityDuration);
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            specBuilder.setInvalidatedByBiometricEnrollment(invalidateOnEnrollment);
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && requireStrongBiometric) {
            specBuilder.setUserAuthenticationParameters(0, 
                KeyProperties.AUTH_BIOMETRIC_STRONG);
        }
        
        keyGenerator.init(specBuilder.build());
        return keyGenerator.generateKey();
    }
    
    private String encryptData(String data) throws Exception {
        SecretKey secretKey = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        
        byte[] iv = cipher.getIV();
        byte[] encrypted = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));
        
        // Combine IV and encrypted data
        byte[] combined = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
        
        return Base64.encodeToString(combined, Base64.DEFAULT);
    }
    
    private String decryptData(String encryptedData) throws Exception {
        byte[] combined = Base64.decode(encryptedData, Base64.DEFAULT);
        
        // Extract IV and encrypted data
        byte[] iv = new byte[12]; // GCM IV is 12 bytes
        byte[] encrypted = new byte[combined.length - iv.length];
        System.arraycopy(combined, 0, iv, 0, iv.length);
        System.arraycopy(combined, iv.length, encrypted, 0, encrypted.length);
        
        SecretKey secretKey = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);
        
        byte[] decrypted = cipher.doFinal(encrypted);
        return new String(decrypted, StandardCharsets.UTF_8);
    }
    
    @RequiresApi(api = Build.VERSION_CODES.M)
    private BiometricPrompt.CryptoObject createCryptoObject(String cryptoType, String challenge, 
            JSObject androidOptions) throws Exception {
        String keyAlias = androidOptions.getString("keyAlias", KEY_PAIR_ALIAS_PREFIX + "default");
        
        switch (cryptoType) {
            case "signature":
                return createSignatureCryptoObject(keyAlias, androidOptions);
            case "cipher":
                return createCipherCryptoObject(keyAlias, androidOptions);
            case "mac":
                return createMacCryptoObject(keyAlias, challenge, androidOptions);
            default:
                throw new IllegalArgumentException("Unsupported crypto type: " + cryptoType);
        }
    }
    
    @RequiresApi(api = Build.VERSION_CODES.M)
    private BiometricPrompt.CryptoObject createSignatureCryptoObject(String keyAlias, 
            JSObject androidOptions) throws Exception {
        // Generate or retrieve key pair
        KeyPair keyPair;
        if (!keyStore.containsAlias(keyAlias)) {
            keyPair = generateKeyPair(keyAlias, androidOptions);
        } else {
            PrivateKey privateKey = (PrivateKey) keyStore.getKey(keyAlias, null);
            PublicKey publicKey = keyStore.getCertificate(keyAlias).getPublicKey();
            keyPair = new KeyPair(publicKey, privateKey);
        }
        
        // Create signature object
        String algorithm = androidOptions.getString("signatureAlgorithm", "SHA256withECDSA");
        Signature signature = Signature.getInstance(algorithm);
        signature.initSign(keyPair.getPrivate());
        
        return new BiometricPrompt.CryptoObject(signature);
    }
    
    @RequiresApi(api = Build.VERSION_CODES.M)
    private BiometricPrompt.CryptoObject createCipherCryptoObject(String keyAlias, 
            JSObject androidOptions) throws Exception {
        // Generate or retrieve secret key
        SecretKey secretKey;
        if (!keyStore.containsAlias(keyAlias)) {
            secretKey = generateSecretKeyForCrypto(keyAlias, androidOptions);
        } else {
            secretKey = (SecretKey) keyStore.getKey(keyAlias, null);
        }
        
        // Create cipher object
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        
        return new BiometricPrompt.CryptoObject(cipher);
    }
    
    @RequiresApi(api = Build.VERSION_CODES.M)
    private BiometricPrompt.CryptoObject createMacCryptoObject(String keyAlias, String challenge,
            JSObject androidOptions) throws Exception {
        // Generate or retrieve secret key
        SecretKey secretKey;
        if (!keyStore.containsAlias(keyAlias)) {
            secretKey = generateSecretKeyForCrypto(keyAlias, androidOptions);
        } else {
            secretKey = (SecretKey) keyStore.getKey(keyAlias, null);
        }
        
        // Create MAC object
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(secretKey);
        
        return new BiometricPrompt.CryptoObject(mac);
    }
    
    private String getPublicKeyBase64(String keyAlias) throws Exception {
        if (keyStore.containsAlias(keyAlias)) {
            PublicKey publicKey = keyStore.getCertificate(keyAlias).getPublicKey();
            return Base64.encodeToString(publicKey.getEncoded(), Base64.NO_WRAP);
        }
        return null;
    }
}