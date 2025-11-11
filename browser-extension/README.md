# Flynas Browser Extensions

Cross-platform browser extensions for Chrome and Firefox that provide seamless access to your Flynas personal cloud storage directly from any webpage.

## Features

### 🚀 Core Functionality
- **Drag & Drop Upload**: Drop files from any webpage directly into Flynas
- **Sidebar File Manager**: Quick access to your cloud files with a dedicated sidebar
- **Context Menu Integration**: Right-click to save images, links, and text to Flynas
- **Keyboard Shortcuts**: Fast access with customizable keyboard shortcuts
- **Background Sync**: Automatic file synchronization in the background

### 🔒 Security & Authentication
- **OAuth Integration**: Secure authentication with Sign In App credentials
- **Encrypted Transfer**: All file transfers use AES-GCM encryption
- **Token Management**: Automatic token refresh and secure storage

### 📁 File Management
- **Browse Files**: Navigate your cloud storage structure
- **Create Folders**: Organize files with new folder creation
- **File Operations**: Download, share, rename, and delete files
- **Progress Tracking**: Real-time upload/download progress indicators
- **File Type Support**: Support for all file types with smart icons

### 🎯 User Experience
- **Quick Upload Dialog**: Floating dialog for bulk file uploads
- **Visual Feedback**: Drag overlay with clear drop zones
- **Responsive Design**: Optimized for all screen sizes
- **Toast Notifications**: Non-intrusive status updates
- **Settings Panel**: Customizable preferences and API configuration

## Installation

### Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `chrome/` directory
4. The Flynas extension icon will appear in your toolbar

### Firefox Extension
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on" and select the `firefox/manifest.json` file
4. The extension will be loaded temporarily

## Usage

### Getting Started
1. Click the Flynas extension icon in your toolbar
2. Sign in with your Flynas account credentials
3. Start uploading files by dragging them onto any webpage

### Keyboard Shortcuts
- **Ctrl+Shift+F** (Cmd+Shift+F on Mac): Toggle sidebar
- **Ctrl+Shift+U** (Cmd+Shift+U on Mac): Show quick upload dialog

### Uploading Files
1. **Drag & Drop**: Drag files from your computer onto any webpage
2. **Context Menu**: Right-click on images or links and select "Upload to Flynas"
3. **Quick Upload**: Use the keyboard shortcut or click the extension icon

### Managing Files
1. Open the sidebar by clicking the extension icon
2. Browse your folder structure
3. Create new folders with the "New Folder" button
4. Download files by clicking the download icon
5. Use right-click context menus for more options

## Development

### Project Structure
```
browser-extension/
├── chrome/                 # Chrome extension files
│   ├── manifest.json      # Chrome extension manifest (v3)
│   ├── background.js      # Service worker for background tasks
│   ├── sidebar.html       # Sidebar interface
│   ├── sidebar.css        # Sidebar styles
│   ├── sidebar.js         # Sidebar functionality
│   ├── dragDrop.js        # Drag and drop content script
│   └── assets/            # Icons and assets
├── firefox/               # Firefox extension files
│   ├── manifest.json      # Firefox extension manifest (v2)
│   └── [shared files]     # Same files as Chrome
└── README.md             # This file
```

### Key Components

#### Background Script (`background.js`)
- Handles API communication with Flynas server
- Manages authentication tokens
- Processes file uploads and downloads
- Creates context menus and keyboard shortcuts

#### Sidebar Interface (`sidebar.html`, `sidebar.css`, `sidebar.js`)
- Provides file browser interface
- Handles user authentication
- Manages file operations (upload, download, create folder)
- Settings and configuration panel

#### Content Script (`dragDrop.js`)
- Intercepts drag and drop events on webpages
- Shows visual feedback during file drops
- Provides quick upload dialog
- Handles keyboard shortcuts

### API Integration

The extension communicates with the Flynas backend API:

```javascript
// Authentication
POST /auth/login
GET /auth/profile

// File operations
POST /files/upload
GET /files/list?path={path}
GET /files/download/{fileId}
POST /files/create-folder

// User management
GET /users/profile
PUT /users/settings
```

### Configuration

Default settings can be modified in the sidebar settings panel:

```javascript
{
  apiUrl: 'https://api.flynas.com',
  autoSync: true,
  encryptionEnabled: true,
  notifications: true
}
```

### Permissions

#### Chrome Extension (Manifest V3)
- `storage`: Save settings and auth tokens
- `activeTab`: Access current tab for drag and drop
- `sidePanel`: Display sidebar interface
- `contextMenus`: Add right-click menu items
- `notifications`: Show upload/download notifications
- `downloads`: Trigger file downloads
- `scripting`: Inject content scripts

#### Firefox Extension (Manifest V2)
- `storage`: Save settings and auth tokens
- `activeTab`: Access current tab for drag and drop
- `contextMenus`: Add right-click menu items
- `notifications`: Show upload/download notifications
- `downloads`: Trigger file downloads
- `tabs`: Manage browser tabs

## Browser Compatibility

### Chrome Extension
- **Minimum Version**: Chrome 88+
- **Manifest Version**: V3
- **Features**: Full feature support including side panel

### Firefox Extension
- **Minimum Version**: Firefox 78+
- **Manifest Version**: V2
- **Features**: Full feature support with browser action popup

## Security

### Data Protection
- All authentication tokens are stored securely in browser storage
- File transfers use HTTPS with additional AES-GCM encryption
- No sensitive data is logged or stored locally

### Permissions
- Extensions only request necessary permissions
- File access is limited to user-initiated actions
- Background scripts follow minimal privilege principle

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check browser version compatibility
   - Ensure all manifest permissions are granted
   - Reload extension in developer mode

2. **Authentication failures**
   - Verify API URL in settings
   - Check network connectivity
   - Clear stored authentication data

3. **Upload failures**
   - Check file size limits
   - Verify network connection
   - Review browser console for errors

### Debug Mode
Enable debug logging by setting `localStorage.flynasDebug = true` in the browser console.

## Contributing

1. Follow the existing code style and patterns
2. Test changes in both Chrome and Firefox
3. Update documentation for new features
4. Ensure security best practices are followed

## License

This project is part of the Flynas ecosystem. See the main project LICENSE file for details.