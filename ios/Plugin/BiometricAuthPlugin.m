#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BiometricAuthPlugin, "BiometricAuth",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSupportedBiometrics, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(authenticate, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(deleteCredentials, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(configure, CAPPluginReturnPromise);
)