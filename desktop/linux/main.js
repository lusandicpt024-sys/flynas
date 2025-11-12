const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { FileSystemAdapter } = require('../../shared/dist/fileManager/fileManager.js');
const { AuthManager } = require('../../shared/dist/auth/authManager.js');
const { EncryptionManager } = require('../../shared/dist/encryption/encryptionManager.js');

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

class FlynasDesktop {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.fileManager = null;
    this.authManager = null;
    this.encryptionManager = null;
    this.isDevMode = process.argv.includes('--dev');
    
    this.init();
  }

  async init() {
    // Initialize shared modules
    this.authManager = new AuthManager({
      clientId: process.env.FLYNAS_CLIENT_ID || 'flynas-desktop-linux',
      clientSecret: process.env.FLYNAS_CLIENT_SECRET || '',
      redirectUri: 'http://localhost:8080/auth/callback',
      scope: ['read', 'write', 'share'],
      apiBaseUrl: process.env.FLYNAS_API_URL || 'https://api.flynas.com'
    });

    this.encryptionManager = new EncryptionManager();

    // Set up Electron app events
    app.whenReady().then(() => this.createWindow());
    app.on('window-all-closed', () => this.onWindowAllClosed());
    app.on('activate', () => this.onActivate());
    
    // Set up IPC handlers
    this.setupIPCHandlers();
  }

  async createWindow() {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'ui/preload.js')
      },
      icon: path.join(__dirname, '../../assets/icons/app.png'),
      titleBarStyle: 'default',
      show: false // Don't show until ready-to-show
    });

    // Load the app
    await this.mainWindow.loadFile('ui/index.html');

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      if (this.isDevMode) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Create application menu
    this.createMenu();

    // Create system tray
    this.createTray();

    // Handle window events
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('minimize', (event) => {
      if (process.platform === 'linux') {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });
  }

  createMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Folder',
            accelerator: 'CmdOrCtrl+Shift+N',
            click: () => this.mainWindow.webContents.send('menu-new-folder')
          },
          {
            label: 'Upload Files',
            accelerator: 'CmdOrCtrl+U',
            click: () => this.handleFileUpload()
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.mainWindow.webContents.send('menu-settings')
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'toggledevtools' },
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Flynas',
            click: () => this.showAbout()
          },
          {
            label: 'Learn More',
            click: () => shell.openExternal('https://github.com/flynas/flynas')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  createTray() {
    this.tray = new Tray(path.join(__dirname, '../../assets/icons/tray.png'));
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Flynas',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      },
      {
        label: 'Upload Files',
        click: () => this.handleFileUpload()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('Flynas - Personal Cloud Server');

    this.tray.on('click', () => {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  setupIPCHandlers() {
    // Authentication handlers
    ipcMain.handle('auth:login', async () => {
      try {
        const authUrl = this.authManager.getAuthUrl();
        await shell.openExternal(authUrl);
        return { success: true, authUrl };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:logout', async () => {
      try {
        await this.authManager.logout();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auth:get-user', async () => {
      try {
        const user = this.authManager.getCurrentUser();
        return { success: true, user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // File system handlers
    ipcMain.handle('fs:select-storage-path', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: ['openDirectory'],
          title: 'Select Storage Directory'
        });

        if (!result.canceled && result.filePaths.length > 0) {
          return { success: true, path: result.filePaths[0] };
        }
        
        return { success: false, canceled: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('fs:upload-files', async () => {
      return await this.handleFileUpload();
    });

    ipcMain.handle('fs:create-folder', async (event, parentPath, folderName) => {
      try {
        if (!this.fileManager) {
          throw new Error('File manager not initialized');
        }

        const user = this.authManager.getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const folder = await this.fileManager.createFolder(parentPath, folderName, user.userId);
        return { success: true, folder };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('fs:list-directory', async (event, path) => {
      try {
        if (!this.fileManager) {
          throw new Error('File manager not initialized');
        }

        const result = await this.fileManager.listDirectory(path);
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Window control handlers
    ipcMain.handle('window:minimize', () => {
      this.mainWindow.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.handle('window:close', () => {
      this.mainWindow.close();
    });
  }

  async handleFileUpload() {
    try {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile', 'multiSelections'],
        title: 'Select Files to Upload',
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] },
          { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'] },
          { name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv'] },
          { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        this.mainWindow.webContents.send('files:upload-start', result.filePaths);
        return { success: true, files: result.filePaths };
      }

      return { success: false, canceled: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About Flynas',
      message: 'Flynas',
      detail: `Version: 1.0.0
Personal Cloud Server Application

Turn any internet-capable device into your personal cloud server.

© 2025 Flynas Team`,
      buttons: ['OK']
    });
  }

  onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  onActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    }
  }
}

// Linux-specific file system adapter
class LinuxFileSystemAdapter {
  async listDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        items.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
          isDirectory: entry.isDirectory(),
          modifiedAt: stats.mtime,
          createdAt: stats.ctime
        });
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  async createDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  async deleteDirectory(dirPath) {
    try {
      await fs.rmdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to delete directory: ${error.message}`);
    }
  }

  async readFile(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      return new Uint8Array(buffer);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(filePath, data) {
    try {
      const buffer = Buffer.from(data);
      await fs.writeFile(filePath, buffer);
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        modifiedAt: stats.mtime,
        createdAt: stats.ctime,
        mode: stats.mode
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }

  watchDirectory(dirPath, callback) {
    // Implementation would use fs.watch
    console.log(`Watching directory: ${dirPath}`);
  }
}

// Initialize the application
const flynasApp = new FlynasDesktop();