#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BiometricAuthPlugin, "BiometricAuth",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSupportedBiometrics, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(authenticate, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(simpleAuthenticate, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(storeCredential, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getStoredCredential, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(deleteStoredCredential, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setConfiguration, CAPPluginReturnPromise);
)