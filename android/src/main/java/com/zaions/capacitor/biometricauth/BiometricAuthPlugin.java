package com.zaions.capacitor.biometricauth;

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

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    private static final String TAG = "BiometricAuth";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "BiometricAuthKey";
    private static final String PREFS_NAME = "BiometricAuthPrefs";
    private static final String PREF_SESSION_TOKEN = "session_token";
    private static final String PREF_SESSION_EXPIRY = "session_expiry";
    private static final String PREF_STORED_CREDENTIALS = "stored_credentials";
    
    private BiometricPrompt biometricPrompt;
    private BiometricPrompt.PromptInfo promptInfo;
    private Executor executor;
    private KeyStore keyStore;
    private Cipher cipher;
    
    // Configuration
    private long sessionDuration = 300000; // 5 minutes default
    private String encryptionSecret = "default-secret";
    private boolean allowDeviceCredential = true;
    private int maxAttempts = 3;
    private int lockoutDuration = 30000; // 30 seconds
    
    @Override
    public void load() {
        executor = ContextCompat.getMainExecutor(getContext());
        try {
            keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize keystore", e);
        }
    }
    
    @PluginMethod
    public void isAvailable(PluginCall call) {
        Context context = getContext();
        BiometricManager biometricManager = BiometricManager.from(context);
        
        JSObject result = new JSObject();
        boolean isAvailable = false;
        String reason = "";
        
        int canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG | 
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
        );
        
        switch (canAuthenticate) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                isAvailable = true;
                break;
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                reason = "NO_HARDWARE";
                break;
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                reason = "HARDWARE_UNAVAILABLE";
                break;
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                reason = "NOT_ENROLLED";
                break;
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                reason = "SECURITY_UPDATE_REQUIRED";
                break;
            case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:
                reason = "UNSUPPORTED";
                break;
            case BiometricManager.BIOMETRIC_STATUS_UNKNOWN:
                reason = "STATUS_UNKNOWN";
                break;
        }
        
        result.put("isAvailable", isAvailable);
        result.put("reason", reason);
        call.resolve(result);
    }
    
    @PluginMethod
    public void getSupportedBiometrics(PluginCall call) {
        Context context = getContext();
        BiometricManager biometricManager = BiometricManager.from(context);
        
        List<String> biometrics = new ArrayList<>();
        
        // Check for fingerprint
        if (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) 
            == BiometricManager.BIOMETRIC_SUCCESS) {
            biometrics.add("FINGERPRINT");
        }
        
        // On Android, we can't distinguish between different biometric types easily
        // So we'll just report generic biometric support
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) 
                == BiometricManager.BIOMETRIC_SUCCESS) {
                biometrics.add("FACE");
            }
        }
        
        JSObject result = new JSObject();
        result.put("biometrics", new JSONArray(biometrics));
        call.resolve(result);
    }
    
    @PluginMethod
    public void authenticate(PluginCall call) {
        String reason = call.getString("reason", "Please authenticate");
        String title = call.getString("title", "Authentication Required");
        String subtitle = call.getString("subtitle", "");
        String fallbackTitle = call.getString("fallbackTitle", "Use PIN");
        boolean disableBackup = call.getBoolean("disableBackup", false);
        
        Activity activity = getActivity();
        if (!(activity instanceof FragmentActivity)) {
            call.reject("Activity must be a FragmentActivity");
            return;
        }
        
        FragmentActivity fragmentActivity = (FragmentActivity) activity;
        
        // Check if there's a valid session
        if (isSessionValid()) {
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("sessionToken", getSessionToken());
            call.resolve(result);
            return;
        }
        
        // Create authentication callback
        BiometricPrompt.AuthenticationCallback authCallback = new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", mapErrorCode(errorCode));
                result.put("message", errString.toString());
                call.resolve(result);
            }
            
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                String sessionToken = createSession();
                JSObject response = new JSObject();
                response.put("success", true);
                response.put("sessionToken", sessionToken);
                call.resolve(response);
            }
            
            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                // Don't reject here, let the user try again
            }
        };
        
        // Create biometric prompt
        biometricPrompt = new BiometricPrompt(fragmentActivity, executor, authCallback);
        
        // Build prompt info
        BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setDescription(reason);
        
        if (disableBackup || !allowDeviceCredential) {
            builder.setNegativeButtonText("Cancel");
        } else {
            builder.setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG | 
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            );
        }
        
        promptInfo = builder.build();
        
        // Show biometric prompt
        getActivity().runOnUiThread(() -> {
            biometricPrompt.authenticate(promptInfo);
        });
    }
    
    @PluginMethod
    public void simpleAuthenticate(PluginCall call) {
        // For Android, this is the same as authenticate
        authenticate(call);
    }
    
    @PluginMethod
    public void storeCredential(PluginCall call) {
        String credentialId = call.getString("credentialId");
        String credentialData = call.getString("credentialData");
        
        if (credentialId == null || credentialData == null) {
            call.reject("Missing credentialId or credentialData");
            return;
        }
        
        try {
            // Generate or get encryption key
            if (!keyStore.containsAlias(KEY_ALIAS)) {
                generateSecretKey();
            }
            
            // Encrypt credential data
            String encryptedData = encryptData(credentialData);
            
            // Store encrypted data
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            // Get existing credentials
            String existingCreds = prefs.getString(PREF_STORED_CREDENTIALS, "{}");
            JSObject credentials = new JSObject(existingCreds);
            credentials.put(credentialId, encryptedData);
            
            editor.putString(PREF_STORED_CREDENTIALS, credentials.toString());
            editor.apply();
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to store credential", e);
            call.reject("Failed to store credential: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void getStoredCredential(PluginCall call) {
        String credentialId = call.getString("credentialId");
        
        if (credentialId == null) {
            call.reject("Missing credentialId");
            return;
        }
        
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingCreds = prefs.getString(PREF_STORED_CREDENTIALS, "{}");
            JSObject credentials = new JSObject(existingCreds);
            
            if (credentials.has(credentialId)) {
                String encryptedData = credentials.getString(credentialId);
                String decryptedData = decryptData(encryptedData);
                
                JSObject result = new JSObject();
                result.put("credentialData", decryptedData);
                call.resolve(result);
            } else {
                call.reject("Credential not found");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to retrieve credential", e);
            call.reject("Failed to retrieve credential: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void deleteStoredCredential(PluginCall call) {
        String credentialId = call.getString("credentialId");
        
        if (credentialId == null) {
            call.reject("Missing credentialId");
            return;
        }
        
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingCreds = prefs.getString(PREF_STORED_CREDENTIALS, "{}");
            JSObject credentials = new JSObject(existingCreds);
            
            if (credentials.has(credentialId)) {
                credentials.remove(credentialId);
                
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(PREF_STORED_CREDENTIALS, credentials.toString());
                editor.apply();
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Credential not found");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to delete credential", e);
            call.reject("Failed to delete credential: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void clearSession(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.remove(PREF_SESSION_TOKEN);
        editor.remove(PREF_SESSION_EXPIRY);
        editor.apply();
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void setConfiguration(PluginCall call) {
        JSObject config = call.getObject("config");
        
        if (config != null) {
            sessionDuration = config.getLong("sessionDuration", sessionDuration);
            encryptionSecret = config.getString("encryptionSecret", encryptionSecret);
            
            JSObject uiConfig = config.getJSObject("uiConfig");
            if (uiConfig != null) {
                // Android doesn't support these UI customizations
                // but we'll store them for consistency
            }
            
            JSObject fallbackConfig = config.getJSObject("fallbackConfig");
            if (fallbackConfig != null) {
                allowDeviceCredential = fallbackConfig.getBoolean("allowDeviceCredential", allowDeviceCredential);
            }
            
            maxAttempts = config.getInteger("maxAttempts", maxAttempts);
            lockoutDuration = config.getInteger("lockoutDuration", lockoutDuration);
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    // Helper methods
    
    private boolean isSessionValid() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long expiry = prefs.getLong(PREF_SESSION_EXPIRY, 0);
        return System.currentTimeMillis() < expiry;
    }
    
    private String getSessionToken() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(PREF_SESSION_TOKEN, null);
    }
    
    private String createSession() {
        String token = UUID.randomUUID().toString();
        long expiry = System.currentTimeMillis() + sessionDuration;
        
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(PREF_SESSION_TOKEN, token);
        editor.putLong(PREF_SESSION_EXPIRY, expiry);
        editor.apply();
        
        return token;
    }
    
    @RequiresApi(api = Build.VERSION_CODES.M)
    private void generateSecretKey() throws NoSuchAlgorithmException, NoSuchProviderException, InvalidAlgorithmParameterException {
        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        
        KeyGenParameterSpec keyGenParameterSpec = new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(false) // We handle auth separately
            .build();
        
        keyGenerator.init(keyGenParameterSpec);
        keyGenerator.generateKey();
    }
    
    private String encryptData(String data) throws Exception {
        SecretKey secretKey = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        
        byte[] iv = cipher.getIV();
        byte[] encryption = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));
        
        // Combine IV and encrypted data
        byte[] combined = new byte[iv.length + encryption.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encryption, 0, combined, iv.length, encryption.length);
        
        return Base64.encodeToString(combined, Base64.NO_WRAP);
    }
    
    private String decryptData(String encryptedData) throws Exception {
        byte[] combined = Base64.decode(encryptedData, Base64.NO_WRAP);
        
        // Extract IV and encrypted data
        byte[] iv = new byte[12]; // GCM IV is 12 bytes
        byte[] encrypted = new byte[combined.length - 12];
        System.arraycopy(combined, 0, iv, 0, 12);
        System.arraycopy(combined, 12, encrypted, 0, encrypted.length);
        
        SecretKey secretKey = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);
        
        byte[] decrypted = cipher.doFinal(encrypted);
        return new String(decrypted, StandardCharsets.UTF_8);
    }
    
    private String mapErrorCode(int errorCode) {
        switch (errorCode) {
            case BiometricPrompt.ERROR_CANCELED:
                return "USER_CANCELLED";
            case BiometricPrompt.ERROR_LOCKOUT:
                return "TOO_MANY_ATTEMPTS";
            case BiometricPrompt.ERROR_LOCKOUT_PERMANENT:
                return "LOCKOUT_PERMANENT";
            case BiometricPrompt.ERROR_NO_BIOMETRICS:
                return "NOT_ENROLLED";
            case BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL:
                return "NO_DEVICE_CREDENTIAL";
            case BiometricPrompt.ERROR_HW_NOT_PRESENT:
                return "NO_HARDWARE";
            case BiometricPrompt.ERROR_HW_UNAVAILABLE:
                return "HARDWARE_UNAVAILABLE";
            case BiometricPrompt.ERROR_NEGATIVE_BUTTON:
                return "USER_CANCELLED";
            case BiometricPrompt.ERROR_NO_SPACE:
                return "NO_SPACE";
            case BiometricPrompt.ERROR_TIMEOUT:
                return "TIMEOUT";
            case BiometricPrompt.ERROR_USER_CANCELED:
                return "USER_CANCELLED";
            case BiometricPrompt.ERROR_VENDOR:
                return "VENDOR_ERROR";
            default:
                return "UNKNOWN_ERROR";
        }
    }
}