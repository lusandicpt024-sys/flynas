const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication methods
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:get-user')
  },

  // File system methods
  fs: {
    selectStoragePath: () => ipcRenderer.invoke('fs:select-storage-path'),
    uploadFiles: () => ipcRenderer.invoke('fs:upload-files'),
    createFolder: (parentPath, folderName) => 
      ipcRenderer.invoke('fs:create-folder', parentPath, folderName),
    listDirectory: (path) => ipcRenderer.invoke('fs:list-directory', path)
  },

  // Window control methods
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  // System info methods
  system: {
    getOS: () => ipcRenderer.invoke('system:get-os'),
    getHostname: () => ipcRenderer.invoke('system:get-hostname'),
    getStorageInfo: () => ipcRenderer.invoke('system:get-storage-info')
  },

  // RAID methods
  raid: {
    // Device management
    registerDevice: (deviceInfo) => ipcRenderer.invoke('raid:register-device', deviceInfo),
    listDevices: () => ipcRenderer.invoke('raid:list-devices'),
    sendHeartbeat: (deviceId, storageAvailable) => 
      ipcRenderer.invoke('raid:send-heartbeat', deviceId, storageAvailable),
    unregisterDevice: (deviceId) => ipcRenderer.invoke('raid:unregister-device', deviceId),

    // RAID configuration
    configureRaid: (raidLevel, chunkSize, deviceIds) => 
      ipcRenderer.invoke('raid:configure', raidLevel, chunkSize, deviceIds),
    getRaidStatus: () => ipcRenderer.invoke('raid:get-status'),
    healRaid: () => ipcRenderer.invoke('raid:heal'),
    deleteRaidConfig: () => ipcRenderer.invoke('raid:delete-config'),

    // Chunk operations
    verifyChunks: () => ipcRenderer.invoke('raid:verify-chunks')
  },

  // Event listeners
  on: (channel, callback) => {
    const validChannels = [
      'menu-new-folder',
      'menu-settings',
      'files:upload-start'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // Remove event listeners
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});