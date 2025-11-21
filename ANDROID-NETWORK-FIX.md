# Android Network Security Fix

## ✅ Issue Resolved

**Problem:** Android app was blocking HTTP cleartext communication due to network security policies (Android 9+).

**Error:** `Cleartext communication to 10.0.0.2 not permitted by network security`

**Solution:** Added network security configuration to allow HTTP for local development/testing.

---

## Changes Made

### 1. Network Security Config
Created: `android/app/src/main/res/xml/network_security_config.xml`

Allows cleartext traffic to:
- `10.0.2.2` (Android emulator localhost)
- `localhost` / `127.0.0.1`
- `10.0.0.2` (your local network IP)
- `192.168.0.0` / `192.168.1.0` (common router ranges)

### 2. AndroidManifest.xml Update
Added to `<application>` tag:
```xml
android:networkSecurityConfig="@xml/network_security_config"
android:usesCleartextTraffic="true"
```

### 3. CloudSyncManager Comments
Updated with clearer instructions for physical device testing:
```kotlin
// Emulator: "http://10.0.2.2:3000"
// Physical device: "http://192.168.1.100:3000" or "http://10.0.0.2:3000"
```

---

## Testing Instructions

### On Android Emulator (Default)
```kotlin
// CloudSyncManager already configured for:
private const val BASE_URL = "http://10.0.2.2:3000"
```

1. Start backend: `cd api && npm run dev`
2. Install APK: `adb install app-debug.apk`
3. Open app and login
4. Test upload/download

### On Physical Android Device

#### Step 1: Find Your Computer's Local IP
```bash
# Linux/Mac
ip addr show | grep "inet "
# Or
ifconfig | grep "inet "

# Windows
ipconfig
```

Example output: `192.168.1.100`

#### Step 2: Update CloudSyncManager.kt
```kotlin
// Change this line:
private const val BASE_URL = "http://10.0.2.2:3000"
// To your computer's IP:
private const val BASE_URL = "http://192.168.1.100:3000"
```

#### Step 3: Ensure Same Network
- Computer and phone must be on same WiFi network
- Firewall must allow port 3000

#### Step 4: Test Backend Access
```bash
# On phone's browser, visit:
http://YOUR_IP:3000/health
# Should see: {"status":"ok"}
```

#### Step 5: Rebuild & Install
```bash
cd android
export JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## Security Note

⚠️ **For Production:** Remove cleartext traffic permission and use HTTPS only!

Update `network_security_config.xml`:
```xml
<base-config cleartextTrafficPermitted="false">
    <trust-anchors>
        <certificates src="system" />
    </trust-anchors>
</base-config>
```

And use a proper SSL certificate with your domain.

---

## Current Build

**APK Location:** `android/app/build/outputs/apk/debug/app-debug.apk`  
**APK Size:** 8.1 MB  
**Build Status:** ✅ SUCCESS  
**Network Security:** ✅ Configured for local testing  

---

## Next Steps

1. Install new APK on device/emulator
2. Test registration and login
3. Upload file from Android
4. Verify file appears on Linux (using `node test-sync.js list`)
5. Download file on Linux
6. Upload from Linux and verify on Android

The app is now ready for full cross-platform sync testing! 🚀
