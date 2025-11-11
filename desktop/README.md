# Flynas Desktop Applications

Cross-platform desktop applications for Linux and Windows that provide native access to your Flynas personal cloud storage with system tray integration.

## Features

### 🖥️ Core Functionality
- **Native Integration**: System tray icon with quick actions
- **File Management**: Browse, upload, download, and organize files
- **Drag & Drop**: Drag files directly into the app window
- **Local Indexing**: Index local folders for cloud sync
- **Cross-Platform**: Works on Linux and Windows

### 🔒 Security
- **OAuth Authentication**: Secure sign-in with token management
- **Encrypted Transfer**: AES-GCM encryption for all file transfers
- **Local Encryption**: Optional encryption for cached files
- **Secure Storage**: Credentials stored in system keychain

### ⚡ Performance
- **Background Sync**: Automatic file synchronization
- **Incremental Updates**: Only sync changed files
- **Progress Tracking**: Real-time upload/download progress
- **Efficient Caching**: Smart local file caching

## Requirements

### System Requirements
- **Linux**: Ubuntu 18.04+, Fedora 32+, or equivalent
- **Windows**: Windows 10 or later
- **Node.js**: 16.x or later
- **npm**: 7.x or later

### Dependencies
- Electron 26.x
- Node.js native modules for file system access
- System tray support

## Installation

### From Source

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

### Building Distributables

#### Linux Packages
```bash
cd desktop/linux
npm run build:linux
# Creates .deb, .rpm, and .AppImage in dist/
```

#### Windows Installer
```bash
cd desktop/windows
npm run build:windows
# Creates .exe installer in dist/
```

## Project Structure

```
desktop/
├── linux/
│   ├── main.js              # Main Electron process
│   ├── preload.js           # Preload script for renderer
│   ├── renderer.html        # Main window UI
│   ├── renderer.css         # Application styles
│   ├── renderer.js          # Renderer process logic
│   ├── package.json         # Dependencies and scripts
│   └── assets/              # Icons and resources
└── windows/
    ├── main.js              # Main Electron process
    ├── preload.js           # Preload script for renderer
    ├── renderer.html        # Main window UI
    ├── renderer.css         # Application styles
    ├── renderer.js          # Renderer process logic
    ├── package.json         # Dependencies and scripts
    └── assets/              # Icons and resources
```

## Development

### Running in Development Mode

```bash
# Linux
cd desktop/linux
npm install
npm run dev

# Windows
cd desktop/windows
npm install
npm run dev
```

### Building for Distribution

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:linux    # Creates .deb, .rpm, AppImage
npm run build:windows  # Creates .exe installer
```

## Configuration

### Application Settings

Settings are stored in platform-specific locations:
- **Linux**: `~/.config/flynas/settings.json`
- **Windows**: `%APPDATA%\flynas\settings.json`

```json
{
  "apiUrl": "https://api.flynas.com",
  "autoSync": true,
  "syncInterval": 300000,
  "encryptionEnabled": true,
  "startMinimized": false,
  "showNotifications": true
}
```

### Environment Variables

```bash
# Development mode
FLYNAS_DEV=true

# Custom API endpoint
FLYNAS_API_URL=https://api.example.com

# Debug logging
FLYNAS_DEBUG=true
```

## Features

### System Tray Integration
- Quick access to common actions
- Upload files from context menu
- View sync status
- Open application window
- Quit application

### File Operations
- Browse cloud storage hierarchy
- Create new folders
- Upload files and folders
- Download files
- Delete files and folders
- Share files with other users

### Synchronization
- Automatic background sync
- Selective folder sync
- Conflict resolution
- Bandwidth throttling
- Pause/resume sync

## Technical Stack

### Core Technologies
- **Electron**: 26.x (Chromium + Node.js)
- **Node.js**: 16.x with native modules
- **IPC**: Inter-process communication for renderer ↔ main
- **File System**: Node.js fs module with async operations

### Key Dependencies
```json
{
  "electron": "^26.0.0",
  "electron-builder": "^24.0.0",
  "electron-store": "^8.0.0",
  "electron-updater": "^6.0.0"
}
```

### Shared Modules
The desktop apps use shared TypeScript modules from `../shared/`:
- `authManager.ts` - Authentication handling
- `fileManager.ts` - File operations
- `encryptionManager.ts` - Encryption services
- `utils/` - Common utilities

## IPC API

### Main Process → Renderer

```javascript
// File list updated
ipcRenderer.on('files-updated', (event, files) => {
  updateFileList(files);
});

// Upload progress
ipcRenderer.on('upload-progress', (event, { filename, progress }) => {
  updateProgress(filename, progress);
});

// Authentication status
ipcRenderer.on('auth-status', (event, { authenticated, user }) => {
  updateAuthUI(authenticated, user);
});
```

### Renderer → Main Process

```javascript
// Upload files
ipcRenderer.send('upload-files', { files, path });

// Create folder
ipcRenderer.send('create-folder', { name, path });

// Download file
ipcRenderer.send('download-file', { fileId, destination });

// Sign out
ipcRenderer.send('sign-out');
```

## Security

### Context Isolation
- Preload scripts with context isolation enabled
- No Node.js access in renderer process
- Secure IPC communication

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'">
```

### Credential Storage
- Use system keychain (keytar/electron-store)
- Never store plain text passwords
- Encrypted token storage

## Troubleshooting

### Common Issues

1. **App won't start**
   ```bash
   # Clear cache
   rm -rf ~/.config/flynas
   npm run dev
   ```

2. **Build fails**
   ```bash
   # Clean and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

3. **File system permissions (Linux)**
   ```bash
   # Check AppArmor/SELinux
   # May need to run with --no-sandbox in development
   ```

### Debug Mode

Enable debug logging:
```bash
export FLYNAS_DEBUG=true
npm run dev
```

Check logs:
- **Linux**: `~/.config/flynas/logs/`
- **Windows**: `%APPDATA%\flynas\logs\`

## Platform-Specific Notes

### Linux
- Requires GTK3+ for system tray
- AppImage doesn't require installation
- `.deb` for Debian/Ubuntu
- `.rpm` for Fedora/RHEL

### Windows
- NSIS installer with auto-update support
- Start menu integration
- File association support
- Windows Defender may flag first run

## Keyboard Shortcuts

- **Ctrl+N** / **Cmd+N**: New folder
- **Ctrl+U** / **Cmd+U**: Upload files
- **Ctrl+R** / **Cmd+R**: Refresh file list
- **Ctrl+,** / **Cmd+,**: Open settings
- **Ctrl+Q** / **Cmd+Q**: Quit application

## Contributing

1. Follow Electron security best practices
2. Test on both Linux and Windows
3. Ensure proper IPC communication
4. Update documentation for new features
5. Use shared modules when possible

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [Node.js API](https://nodejs.org/api/)

## License

This is part of the Flynas ecosystem. See the main project LICENSE file for details.
