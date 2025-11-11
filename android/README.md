# Flynas Android Application

Native Android application that transforms your Android device into a personal cloud server and provides seamless access to your Flynas cloud storage.

## Features

### 📱 Core Functionality
- **Personal Cloud Server**: Turn your Android device into a cloud storage server
- **File Management**: Browse, upload, download, and manage cloud files
- **Material Design**: Modern Android UI with Material Design 3
- **Offline Support**: Local file caching for offline access
- **Background Sync**: Automatic file synchronization in the background

### 🔒 Security
- **Encrypted Storage**: Secure local storage with Android Security Crypto
- **OAuth Authentication**: Secure sign-in with token-based authentication
- **Encrypted Transfer**: All network transfers use TLS with AES encryption
- **Permission Management**: Granular Android permissions model

## Requirements

### Development Environment
- **Android Studio**: Arctic Fox or newer
- **JDK**: Java 17 (OpenJDK recommended)
- **Android SDK**: API Level 34 (Android 14)
- **Build Tools**: 34.0.0
- **Gradle**: 8.3+ (included via wrapper)

### Device Requirements
- **Minimum SDK**: API 24 (Android 7.0)
- **Target SDK**: API 34 (Android 14)
- **Permissions**: Internet, Storage, Foreground Service

## Installation

### Building from Source

1. **Setup Android SDK**
   ```bash
   # Set ANDROID_HOME environment variable
   export ANDROID_HOME=~/android-sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

2. **Build Debug APK**
   ```bash
   cd android
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   ./gradlew assembleDebug
   ```

3. **Install on Device**
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

### Build Output
- **Debug APK**: `app/build/outputs/apk/debug/app-debug.apk`
- **Size**: ~8.2MB
- **Package Name**: `com.flynas.android`

## Project Structure

```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/flynas/android/
│   │   │   │   └── ui/main/MainActivity.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/activity_main.xml
│   │   │   │   ├── mipmap-*/ic_launcher.png
│   │   │   │   └── values/
│   │   │   └── AndroidManifest.xml
│   │   └── test/
│   └── build.gradle
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── build.gradle
├── settings.gradle
├── gradle.properties
├── gradlew
└── gradlew.bat
```

## Technical Stack

### Core Technologies
- **Language**: Kotlin 1.9.10
- **UI Framework**: Android SDK 34, Material Components
- **Architecture**: MVVM with ViewModels and LiveData
- **Networking**: Retrofit 2.9.0 with OkHttp
- **Database**: Room 2.6.1 for local caching
- **Dependency Injection**: Manual DI (simplified)
- **Async Operations**: Kotlin Coroutines

### Key Dependencies
```gradle
// Core Android
androidx.core:core-ktx:1.12.0
androidx.appcompat:appcompat:1.6.1
com.google.android.material:material:1.11.0

// Architecture Components
androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0
androidx.lifecycle:lifecycle-livedata-ktx:2.7.0
androidx.navigation:navigation-fragment-ktx:2.7.6

// Networking
com.squareup.retrofit2:retrofit:2.9.0
com.squareup.retrofit2:converter-gson:2.9.0

// Security
androidx.security:security-crypto:1.1.0-alpha06

// Background Work
androidx.work:work-runtime-ktx:2.9.0
```

## Configuration

### Gradle Properties
```properties
# Enable AndroidX
android.useAndroidX=true
android.enableJetifier=true

# JVM settings
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
```

### Build Configuration
```gradle
android {
    compileSdk 34
    
    defaultConfig {
        applicationId "com.flynas.android"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = '17'
    }
}
```

## Development

### Building Variants
```bash
# Debug build (with debugging enabled)
./gradlew assembleDebug

# Release build (optimized, requires signing)
./gradlew assembleRelease

# Clean build
./gradlew clean assembleDebug
```

### Running Tests
```bash
# Unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest
```

### Code Style
- Follow [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
- Use Material Design guidelines for UI
- Implement proper error handling and logging

## Troubleshooting

### Common Build Issues

1. **Java Version Mismatch**
   ```bash
   # Ensure Java 17 is used
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   java -version
   ```

2. **SDK Not Found**
   ```bash
   # Set ANDROID_HOME
   export ANDROID_HOME=~/android-sdk
   ```

3. **Gradle Sync Failed**
   ```bash
   # Clear Gradle cache
   ./gradlew clean
   rm -rf ~/.gradle/caches
   ./gradlew assembleDebug
   ```

4. **Build Tools Missing**
   ```bash
   # Install via sdkmanager
   sdkmanager "build-tools;34.0.0" "platforms;android-34"
   ```

### Runtime Issues

1. **App Crashes on Launch**
   - Check logcat for stack traces: `adb logcat | grep Flynas`
   - Verify all permissions are granted
   - Check AndroidManifest.xml configuration

2. **Network Errors**
   - Verify internet permission in manifest
   - Check API endpoint configuration
   - Review TLS/SSL certificate issues

## Permissions

### Required Permissions
```xml
<!-- Network access -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Storage access -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- System overlay (for future floating window feature) -->
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

<!-- Background work -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## Architecture

### Current Implementation
- **MainActivity**: Simple launcher activity displaying app info
- **Material Design**: Using Material components for UI
- **Simplified Structure**: Basic working version for initial release

### Future Enhancements
- Fragment-based navigation (Files, Shared, Devices)
- Floating window service for drag-and-drop
- File preview and download
- Background file synchronization
- Push notifications for file updates
- OAuth integration with Sign In App

## Version History

### Version 1.0.0 (Current)
- ✅ Initial release
- ✅ Basic UI with Material Design
- ✅ Android SDK 34 support
- ✅ Gradle 8.3 build system
- ✅ Java 17 compatibility

## Contributing

1. Follow Android development best practices
2. Test on multiple Android versions (API 24+)
3. Ensure proper permission handling
4. Update documentation for new features
5. Write unit tests for business logic

## License

This is part of the Flynas ecosystem. See the main project LICENSE file for details.

## Support

For issues and questions:
- Check the main Flynas repository
- Review Android documentation
- Submit issues via GitHub
