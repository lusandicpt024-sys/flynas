# Flynas Quick Start Guide

Get up and running with Flynas in minutes! This guide covers installation and basic usage for all platforms.

## Prerequisites

- **Node.js**: Version 16 or higher for desktop apps
- **Java**: JDK 17 for Android development
- **Android SDK**: API 34 for Android builds
- **Git**: To clone the repository

---

## Initial Setup

First, navigate to your Flynas project:

```bash
cd ~/Work/WebDev/flynas
```

Or clone if you haven't already:

```bash
git clone https://github.com/yourusername/flynas.git
cd flynas
```

---

## Choose Your Platform

- [Desktop (Linux/Windows)](#desktop-quick-start)
- [Android Mobile](#android-quick-start)
- [Browser Extension](#browser-extension-quick-start)

---

## Desktop Quick Start

### Installation

#### Linux
```bash
# From flynas project root
cd desktop/linux
npm install
npm start
```

**Launch from Applications Menu:**
- Press `Super` key and search for "Flynas"
- Desktop entry is installed system-wide

**Desktop Entry Details:**
- Location: `/usr/share/applications/flynas.desktop`
- Launcher script: `desktop/linux/flynas.sh`
- Icon: `assets/icons/app.png`

#### Windows
```bash
# From flynas project root
cd desktop/windows
npm install
npm start
```

### Build for Production
```bash
npm run build
# Output in dist/ folder
```

### First Run

1. **Sign In**: Click "Sign In" and authenticate with your Flynas account
2. **Browse Files**: Navigate your cloud storage in the main window
3. **Upload Files**: Drag files into the window or click "Upload"
4. **System Tray**: Minimize to system tray for background sync

### Common Tasks

**Create a Folder**
```
Click "New Folder" → Enter name → Press Enter
```

**Upload Files**
```
Method 1: Drag files into the window
Method 2: Click "Upload" button
Method 3: Right-click tray icon → "Upload Files"
```

**Download Files**
```
Right-click file → "Download" → Choose location
```

---

## Android Quick Start

### Prerequisites

Ensure your environment is set up:

```bash
# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

# Set ANDROID_HOME (if not in .bashrc)
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/cmdline-tools/bin:$ANDROID_HOME/platform-tools
```

### Installation

#### Build from Source
```bash
# From flynas project root
cd android

# Build debug APK
./gradlew assembleDebug

# APK will be in: app/build/outputs/apk/debug/app-debug.apk
```

#### Install APK
```bash
# Connect Android device via USB (enable USB debugging)
adb devices  # Verify device is connected

# Install the app
adb install app/build/outputs/apk/debug/app-debug.apk

# Or install from file manager on device
# Transfer APK to device and tap to install
```

### First Run

1. **Grant Permissions**: Allow storage and network access
2. **Sign In**: Authenticate with your Flynas credentials
3. **Browse**: Navigate your cloud files
4. **Upload**: Use the upload button to select files

### Common Tasks

**Upload Photos**
```
Tap "Upload" → Select "Photos" → Choose images → Confirm
```

**Download Files**
```
Long-press file → "Download" → File saved to Downloads/
```

**Create Folder**
```
Tap "+" button → "New Folder" → Enter name
```

---

## Browser Extension Quick Start

### Installation

#### Chrome
```bash
# No build needed - load directly

1. Open chrome://extensions/
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Navigate to: ~/Work/WebDev/flynas/browser-extension/chrome/
5. Click "Select Folder"
6. Pin extension to toolbar (puzzle icon → pin)
```

#### Firefox
```bash
# No build needed - load directly

1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on"
3. Navigate to: ~/Work/WebDev/flynas/browser-extension/firefox/
4. Select manifest.json
5. Extension loaded (temporary - reloads on browser restart)
```

### First Run

1. **Click Extension Icon**: Opens sidebar panel
2. **Sign In**: Authenticate with credentials
3. **Ready**: You can now upload files from any webpage

### Common Tasks

**Upload Files from Webpage**
```
Drag any file from your computer onto a webpage
→ Drop zone appears
→ Release to upload to Flynas
```

**Save Image from Website**
```
Right-click image → "Upload to Flynas" → Confirm
```

**Quick Upload**
```
Press Ctrl+Shift+U (Cmd+Shift+U on Mac)
→ Upload dialog appears
→ Select files → Upload
```

**Open Sidebar**
```
Method 1: Click extension icon
Method 2: Press Ctrl+Shift+F (Cmd+Shift+F on Mac)
```

---

## Authentication

All platforms use the same authentication system:

1. **Sign In**: Use your Flynas account credentials
2. **OAuth Flow**: Secure token-based authentication
3. **Stay Signed In**: Tokens are securely stored
4. **Sign Out**: Available in settings/menu

### Getting an Account

Currently in development mode. Future production will have:
- Account registration at flynas.com
- Device linking
- Storage configuration

---

## Basic Concepts

### Files and Folders
- **Cloud Storage**: All files stored on your connected device
- **Remote Access**: Access files without downloading
- **On-Demand Download**: Files downloaded only when requested

### Sharing
- **Private**: Default, only you can access
- **Shared Folders**: Share with linked Flynas users
- **Permissions**: View/download/upload permissions per user

### Security
- **Encrypted Transfer**: TLS encryption for all transfers
- **Authentication**: OAuth token-based (no passwords stored)
- **Access Control**: Role-based permissions system

---

## Keyboard Shortcuts

### Desktop
- `Ctrl/Cmd + N`: New folder
- `Ctrl/Cmd + U`: Upload files
- `Ctrl/Cmd + R`: Refresh
- `Ctrl/Cmd + ,`: Settings
- `Ctrl/Cmd + Q`: Quit

### Browser Extension
- `Ctrl/Cmd + Shift + F`: Toggle sidebar
- `Ctrl/Cmd + Shift + U`: Quick upload
- `Esc`: Close dialogs

---

## Troubleshooting

### Node.js Version Warnings

If you see `EBADENGINE` warnings during `npm install`:

```bash
# Check your current Node.js version
node --version

# If below v16, upgrade using nvm (Node Version Manager)
# Install nvm if not already installed:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js v18 (LTS)
nvm install 18
nvm use 18
nvm alias default 18

# Verify new version
node --version  # Should show v18.x.x

# Now reinstall dependencies
cd ~/Work/WebDev/flynas
rm -rf node_modules package-lock.json
npm install
```

**Note**: The project will work with Node.js v12+ but you may see warnings. For best results, use v16 or higher.

### Desktop App Won't Start

```bash
# Check Node.js version
node --version  # Should be v16 or higher

# Reinstall dependencies
cd ~/Work/WebDev/flynas/desktop/linux
rm -rf node_modules package-lock.json
npm install
npm start
```

### Android Build Fails

```bash
# Verify Java version
java -version  # Should be 17.x.x

# Verify Android SDK
echo $ANDROID_HOME
ls $ANDROID_HOME/platforms/android-34

# Clean and rebuild
cd ~/Work/WebDev/flynas/android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### Can't Install Android APK

```bash
# Check device connection
adb devices

# If no devices, enable USB debugging on phone:
# Settings → About Phone → Tap "Build Number" 7 times
# Settings → Developer Options → Enable "USB Debugging"

# Uninstall old version first
adb uninstall com.flynas.android

# Install fresh
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Browser Extension Not Loading

**Chrome:**
```
1. Check manifest.json exists in chrome/ folder
2. Reload extension: Extensions page → Reload button
3. Check browser console for errors
```

**Firefox:**
```
1. Extension is temporary - reload after browser restart
2. Check manifest.json path is correct
3. Use about:debugging to see errors
```

### Upload Fails

```
1. Check file size (default max: 5GB)
2. Verify internet connection
3. Check storage space on target device
4. Try smaller files first
5. Check browser/app console for errors
```

---

## Development Mode

### Desktop Development

```bash
cd ~/Work/WebDev/flynas/desktop/linux

# Development with hot reload
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Android Development

```bash
cd ~/Work/WebDev/flynas/android

# Development build
./gradlew assembleDebug

# Run tests
./gradlew test

# Check for issues
./gradlew lint
```

### Browser Extension Development

```bash
# No build step needed
# Edit files in browser-extension/chrome/ or firefox/
# Reload extension in browser to see changes
```

---

## Getting Help

### Documentation
- [Main README](README.md) - Project overview
- [Full Documentation](DOCUMENTATION.md) - Complete doc index
- [Desktop Guide](desktop/README.md) - Desktop app details
- [Android Guide](android/README.md) - Android app details
- [Browser Extension Guide](browser-extension/README.md) - Extension details
- [Contributing](CONTRIBUTING.md) - Development guide

### Support Channels
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions, get community help
- **Email**: support@flynas.com (coming soon)

### Common Issues
- Check [DOCUMENTATION.md](DOCUMENTATION.md) → Troubleshooting section
- Search existing GitHub issues
- Enable debug logging in app settings

---

## Next Steps

Once you're comfortable with the basics:

1. **Explore Features**: Try sharing files, creating folders
2. **Customize Settings**: Configure sync preferences
3. **Link Devices**: Connect all your devices
4. **Share Content**: Invite others to shared folders
5. **Read Full Docs**: Dive into [DOCUMENTATION.md](DOCUMENTATION.md)

---

## Quick Reference Card

### Essential Commands

```bash
# Navigate to project
cd ~/Work/WebDev/flynas

# Desktop (Linux)
cd desktop/linux && npm install && npm start

# Desktop (Windows)
cd desktop/windows && npm install && npm start

# Android
cd android && ./gradlew assembleDebug

# Install Android APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Browser Extension
# Chrome: chrome://extensions/ → Load unpacked → select chrome/
# Firefox: about:debugging → Load Temporary → select firefox/manifest.json
```

### Project Structure
```
flynas/
├── desktop/          # Electron desktop apps
│   ├── linux/
│   └── windows/
├── android/          # Android mobile app
│   └── app/
├── browser-extension/  # Browser extensions
│   ├── chrome/
│   └── firefox/
├── shared/           # Shared logic/modules
└── docs/            # Documentation
```

### File Locations

**Desktop Config:**
- Linux: `~/.config/flynas/`
- Windows: `%APPDATA%\flynas\`

**Android Data:**
- App data: `/data/data/com.flynas.android/`
- Downloads: `/sdcard/Download/`

**Browser Extension:**
- Chrome: Managed by browser
- Firefox: Temporary (clears on restart)

---

## Tips & Tricks

💡 **Desktop**: Use system tray icon for quick access

💡 **Android**: Enable "Stay awake" in Developer Options during testing

💡 **Browser**: Pin extension to toolbar for one-click access

💡 **All Platforms**: Check logs for debugging (browser console, logcat, terminal)

💡 **Development**: Use `--stacktrace` with Gradle for detailed error info

💡 **Performance**: Clear cache if app feels slow

---

## Environment Variables Quick Setup

Add to your `~/.bashrc`:

```bash
# Java for Android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

# Android SDK
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/cmdline-tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Node.js (if using nvm)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Then: `source ~/.bashrc`

---

**You're all set! Enjoy using Flynas!** 🚀

For detailed information, see [DOCUMENTATION.md](DOCUMENTATION.md)