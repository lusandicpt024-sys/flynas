# Flynas Quick Start Guide

Get up and running with Flynas in minutes! This guide covers installation and basic usage for all platforms.

## Choose Your Platform

- [Desktop (Linux/Windows)](#desktop-quick-start)
- [Android Mobile](#android-quick-start)
- [Browser Extension](#browser-extension-quick-start)

---

## Desktop Quick Start

### Installation

#### Linux
```bash
cd desktop/linux
npm install
npm start
```

#### Windows
```bash
cd desktop/windows
npm install
npm start
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

### Installation

#### Build from Source
```bash
cd android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew assembleDebug
```

#### Install APK
```bash
# Connect device via USB
adb install app/build/outputs/apk/debug/app-debug.apk
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
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `flynas/browser-extension/chrome/`
5. Pin extension to toolbar

#### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `flynas/browser-extension/firefox/manifest.json`
4. Extension loaded temporarily

### First Run

1. **Click Extension Icon**: Opens sidebar
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

Visit [flynas.com](https://flynas.com) to:
- Create a free account
- Link your devices
- Configure storage settings

---

## Basic Concepts

### Files and Folders
- **Cloud Storage**: All files stored in Flynas cloud
- **Local Cache**: Recently accessed files cached locally
- **Sync**: Automatic synchronization across devices

### Sharing
- **Private**: Default, only you can access
- **Shared**: Share folders with other Flynas users
- **Links**: Generate shareable download links

### Security
- **Encrypted Transfer**: All uploads/downloads encrypted
- **Secure Storage**: Files encrypted at rest
- **Authentication**: OAuth tokens, never plain passwords

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

### Can't Sign In
```
1. Check internet connection
2. Verify credentials
3. Clear browser cache/app data
4. Try again
```

### Upload Fails
```
1. Check file size (max 5GB per file)
2. Verify internet connection
3. Check available storage space
4. Try smaller files first
```

### App Won't Start
```
Desktop: Delete ~/.config/flynas and restart
Android: Clear app data in Settings
Browser: Reload extension
```

---

## Getting Help

### Documentation
- [Main README](README.md) - Project overview
- [Desktop Guide](desktop/README.md) - Desktop app details
- [Android Guide](android/README.md) - Android app details
- [Browser Extension Guide](browser-extension/README.md) - Extension details
- [Contributing](CONTRIBUTING.md) - Development guide

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community help
- **Email**: support@flynas.com

---

## Next Steps

Once you're comfortable with the basics:

1. **Explore Features**: Try sharing files, creating folders
2. **Customize Settings**: Configure sync preferences
3. **Link Devices**: Connect all your devices
4. **Share Content**: Invite others to shared folders
5. **Advanced Features**: Explore API integration

---

## Quick Reference

### Common Commands

```bash
# Desktop Development
npm install          # Install dependencies
npm start           # Run in development
npm run build       # Build for production

# Android Development
./gradlew assembleDebug    # Build debug APK
./gradlew test             # Run tests
adb install app.apk        # Install on device

# Browser Extension
# Just load unpacked in browser - no build step needed
```

### File Locations

**Desktop Config:**
- Linux: `~/.config/flynas/`
- Windows: `%APPDATA%\flynas\`

**Android Data:**
- App data: `/data/data/com.flynas.android/`
- Downloads: `/sdcard/Download/`

**Browser Extension:**
- Settings: Browser's extension storage
- Cache: Browser cache

---

## Tips & Tricks

💡 **Tip**: Pin the browser extension to your toolbar for quick access

💡 **Tip**: Use keyboard shortcuts to save time

💡 **Tip**: Enable auto-sync in settings for seamless experience

💡 **Tip**: Create folders to organize your files

💡 **Tip**: Right-click items for more options

---

**You're all set! Enjoy using Flynas!** 🚀
