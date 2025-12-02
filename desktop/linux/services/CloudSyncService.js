const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { app } = require('electron');

/**
 * Cloud Sync Service for Linux Desktop App
 * Handles authentication and file synchronization with Flynas backend
 */
class CloudSyncService {
  constructor() {
    this.baseURL = process.env.FLYNAS_API_URL || 'http://localhost:3000/api';
    this.token = null;
    this.user = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to all requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Load saved token
    this.loadToken();
  }

  /**
   * Load saved authentication token
   */
  loadToken() {
    try {
      const userDataPath = app.getPath('userData');
      const authPath = path.join(userDataPath, 'auth.json');
      
      if (fs.existsSync(authPath)) {
        const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        this.token = authData.token;
        this.user = authData.user;
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  /**
   * Save authentication token
   */
  saveToken() {
    try {
      const userDataPath = app.getPath('userData');
      const authPath = path.join(userDataPath, 'auth.json');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      
      fs.writeFileSync(authPath, JSON.stringify({
        token: this.token,
        user: this.user
      }), 'utf8');
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Register new user
   */
  async register(username, email, password) {
    try {
      const response = await this.client.post('/auth/register', {
        username,
        email,
        password
      });

      this.token = response.data.token;
      this.user = response.data.user;
      this.saveToken();

      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Login user
   */
  async login(username, password) {
    try {
      const response = await this.client.post('/auth/login', {
        username,
        password
      });

      this.token = response.data.token;
      this.user = response.data.user;
      this.saveToken();

      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Verify if current token is valid
   */
  async verifyToken() {
    if (!this.token) return false;

    try {
      await this.client.get('/auth/verify');
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  /**
   * Logout user
   */
  logout() {
    this.token = null;
    this.user = null;
    
    try {
      const userDataPath = app.getPath('userData');
      const authPath = path.join(userDataPath, 'auth.json');
      if (fs.existsSync(authPath)) {
        fs.unlinkSync(authPath);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Upload file to cloud
   */
  async uploadFile(filePath, isEncrypted = false) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('isEncrypted', isEncrypted.toString());

      const response = await this.client.post('/files/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return {
        success: true,
        file: response.data.file
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * List all files from cloud
   */
  async listFiles() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.get('/files');
      return {
        success: true,
        files: response.data.files
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Download file from cloud
   */
  async downloadFile(fileId, destinationPath) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.get(`/files/${fileId}`, {
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(destinationPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve({ success: true }));
        writer.on('error', (error) => reject({ success: false, error: error.message }));
      });
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Delete file from cloud
   */
  async deleteFile(fileId) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.delete(`/files/${fileId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Sync changes since last sync
   */
  async syncChanges(since = null) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const url = since ? `/files/sync/changes?since=${since}` : '/files/sync/changes';
      const response = await this.client.get(url);
      
      return {
        success: true,
        timestamp: response.data.timestamp,
        changes: response.data.changes
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.token !== null;
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.user;
  }

  // ===== RAID Device Management =====

  /**
   * Register this device for RAID
   */
  async registerDevice(deviceName, deviceType, platform, storageCapacity, storageAvailable) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.post('/devices/register', {
        device_name: deviceName,
        device_type: deviceType,
        platform: platform,
        storage_capacity: storageCapacity,
        storage_available: storageAvailable
      });

      return {
        success: true,
        device: response.data.device
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * List all registered devices
   */
  async listDevices() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.get('/devices/list');
      return {
        success: true,
        devices: response.data.devices
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Send heartbeat for device
   */
  async sendHeartbeat(deviceId, storageAvailable) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.put(`/devices/${deviceId}/heartbeat`, {
        storage_available: storageAvailable
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(deviceId) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.delete(`/devices/${deviceId}/unregister`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // ===== RAID Configuration =====

  /**
   * Configure RAID for user
   */
  async configureRaid(raidLevel, chunkSize, deviceIds) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.post('/raid/configure', {
        raid_level: raidLevel,
        chunk_size: chunkSize,
        device_ids: deviceIds
      });

      return {
        success: true,
        config: response.data.config
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get RAID status
   */
  async getRaidStatus() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.get('/raid/status');
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Heal RAID array
   */
  async healRaid() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.put('/raid/heal');
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Reconstruct file from RAID
   */
  async reconstructFile(fileId) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.post('/raid/reconstruct', {
        file_id: fileId
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Delete RAID configuration
   */
  async deleteRaidConfig() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.delete('/raid/configure');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // ===== Chunk Management =====

  /**
   * Upload chunk to device
   */
  async uploadChunk(chunkId, fileId, chunkIndex, deviceId, chunkData) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const formData = new FormData();
      formData.append('chunk_id', chunkId);
      formData.append('file_id', fileId);
      formData.append('chunk_index', chunkIndex);
      formData.append('device_id', deviceId);
      formData.append('chunk', chunkData);

      const response = await this.client.post('/chunks/upload', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Download chunk from device
   */
  async downloadChunk(chunkId, deviceId) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.get(`/chunks/${chunkId}/download`, {
        params: { device_id: deviceId },
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        data: Buffer.from(response.data),
        hash: response.headers['x-chunk-hash']
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Verify chunk integrity
   */
  async verifyChunk(chunkId, deviceId) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.post('/chunks/verify', {
        chunk_id: chunkId,
        device_id: deviceId
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Delete chunk
   */
  async deleteChunk(chunkId, deviceId) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.delete(`/chunks/${chunkId}`, {
        params: { device_id: deviceId }
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * List chunks for a file
   */
  async listFileChunks(fileId) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.get(`/chunks/file/${fileId}`);
      return {
        success: true,
        chunks: response.data.chunks
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get chunks needing reconstruction
   */
  async getNeedsReconstruction() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.get('/chunks/needs-reconstruction');
      return {
        success: true,
        chunks: response.data.chunks
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = CloudSyncService;
