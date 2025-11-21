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
}

module.exports = CloudSyncService;
