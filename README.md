# Flynas - Personal Cloud Server Platform

Transform any internet-capable device into a personal cloud server by connecting a storage device. Access your files securely from anywhere with our comprehensive cross-platform applications.

## 🚀 Overview

Flynas is a revolutionary personal cloud platform that enables users to:

- **Transform Devices**: Turn any Linux, Windows, or Android device into a personal cloud server
- **Universal Access**: Access files through desktop apps, mobile apps, and browser extensions
- **Secure Storage**: Connect external storage devices with encrypted file transfer
- **Remote Collaboration**: Share folders and files with linked Flynas users
- **Cross-Platform Sync**: Seamless synchronization across all your devices

## 📱 Platform Support

### Desktop Applications
- **Linux**: Native Electron-based application with system tray integration
- **Windows**: Full-featured desktop app with file system integration
- **Features**: Local file indexing, drag-and-drop uploads, encrypted transfers

### Mobile Application
- **Android**: Kotlin-based app with floating window support
- **Features**: Drag-and-drop to floating window, background sync, material design

### Browser Extensions
- **Chrome**: Manifest V3 extension with side panel integration
- **Firefox**: Manifest V2 compatible extension
- **Features**: Webpage drag-and-drop, context menus, quick upload dialog

## 🏗️ Architecture

### Shared Core (`shared/`)
Cross-platform TypeScript modules providing:
- Authentication management with OAuth2 flow
- File operations with progress tracking
- Encryption services (AES-GCM, RSA-OAEP)
- Event-driven architecture with custom EventEmitter
- Cross-platform utilities and logging

### Platform-Specific Implementations
Each platform leverages the shared core while providing native user experiences:
- **Desktop**: Electron with Node.js file system APIs
- **Android**: Kotlin with Android SDK integration
- **Browser**: WebExtension APIs with content scripts

## 📁 Project Structure

```
flynas/
├── shared/                    # Cross-platform core modules
│   ├── auth/                 # Authentication management
│   ├── fileManager/          # File operations and sync
│   ├── encryption/           # Security and encryption
│   └── utils/                # Utilities and helpers
├── desktop/                  # Desktop applications
│   ├── linux/               # Linux Electron app
│   └── windows/             # Windows Electron app
├── android/                  # Android mobile application
│   ├── app/                 # Kotlin source code
│   └── gradle/              # Build configuration
├── browser-extension/        # Browser extensions
│   ├── chrome/              # Chrome extension (Manifest V3)
│   └── firefox/             # Firefox extension (Manifest V2)
└── docs/                    # Documentation and guides
```

## 🔧 Development Setup

### Prerequisites
- **Node.js 16+** (for desktop and browser extensions)
- **Java 17** (for Android builds)
- **Gradle 8.3+** (for Android app, included via wrapper)
- **Android SDK 34** (with build-tools 34.0.0)
- Sign In App credentials for authentication

### Quick Start

#### Desktop Applications (Linux/Windows)
```bash
cd desktop/linux  # or desktop/windows
npm install
npm start
```

#### Android Application
```bash
cd android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # or your Java 17 path
./gradlew assembleDebug
# Install APK: adb install app/build/outputs/apk/debug/app-debug.apk
```

#### Browser Extensions
**Chrome:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `browser-extension/chrome/` folder

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `browser-extension/firefox/manifest.json`

### Build Status
✅ Desktop (Electron) - Ready  
✅ Android (APK) - Built successfully (8.2MB)  
✅ Chrome Extension - Ready to load  
✅ Firefox Extension - Ready to load

## 📱 Platform Features

### Desktop (Linux/Windows)
- Folder creation and management
- File preview and download
- Drag-and-drop upload
- System tray integration
- Sync with browser extension

### Android
- Floating window for drag-and-drop
- Touch-optimized interface
- Background file access
- Remote NAS connectivity

### Browser Extension
- Sidebar panel interface
- Drag-and-drop support
- Copy-paste functionality
- Cross-tab file access

## 🔐 Security

- **Authentication**: OAuth/token-based via Sign In App
- **Encryption**: TLS for transfers, optional at-rest encryption
- **Access Control**: Role-based permissions for shared folders
- **Privacy**: Files listed remotely, downloaded only on request

## 🛠️ Technical Stack

- **Desktop**: Electron, Node.js, TypeScript
- **Android**: Kotlin, Android SDK 34, Material Design
- **Browser**: WebExtension APIs, TypeScript
- **Shared Core**: TypeScript, Web Crypto API
- **Build Tools**: Gradle 8.3, npm, webpack

## 📖 Documentation

Comprehensive documentation is available for all platforms:

- **[📋 Documentation Index](DOCUMENTATION.md)** - Complete documentation overview and navigation
- **[🚀 Quick Start Guide](QUICKSTART.md)** - Get started in 5 minutes
- **[🤝 Contributing Guide](CONTRIBUTING.md)** - Development guidelines and workflows

### Platform-Specific Documentation
- **[Desktop Apps](desktop/README.md)** - Linux and Windows Electron applications
- **[Android App](android/README.md)** - Native Android mobile application  
- **[Browser Extensions](browser-extension/README.md)** - Chrome and Firefox extensions

**Total Documentation**: 1,979 lines across 7 comprehensive guides

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.