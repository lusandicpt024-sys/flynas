/**
 * Flynas API Service for Browser Extensions
 * Handles all API communication including RAID operations
 */
class FlynasAPIService {
    constructor(baseURL = 'http://localhost:3000/api') {
        this.baseURL = baseURL;
        this.token = null;
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.blob();
            }
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // ===== Authentication =====

    async register(username, email, password) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.token = response.token;
        return response;
    }

    async verifyToken() {
        return await this.request('/auth/verify');
    }

    // ===== File Operations =====

    async uploadFile(file, isEncrypted = false) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('isEncrypted', isEncrypted.toString());

        return await this.request('/files/upload', {
            method: 'POST',
            headers: {}, // Let browser set Content-Type with boundary
            body: formData
        });
    }

    async listFiles() {
        return await this.request('/files');
    }

    async downloadFile(fileId) {
        return await this.request(`/files/${fileId}`);
    }

    async deleteFile(fileId) {
        return await this.request(`/files/${fileId}`, {
            method: 'DELETE'
        });
    }

    async syncChanges(since = null) {
        const url = since ? `/files/sync/changes?since=${since}` : '/files/sync/changes';
        return await this.request(url);
    }

    // ===== Folder Operations =====

    async createFolder(folderName, parentPath = '/') {
        return await this.request('/files/folders', {
            method: 'POST',
            body: JSON.stringify({
                folderName: folderName,
                parentPath: parentPath
            })
        });
    }

    async listFolders(currentPath = '/') {
        return await this.request(`/files/folders?path=${encodeURIComponent(currentPath)}`);
    }

    // ===== RAID Device Management =====

    /**
     * Register this browser as a RAID device
     */
    async registerDevice(deviceName, deviceType, platform, storageCapacity, storageAvailable) {
        return await this.request('/devices/register', {
            method: 'POST',
            body: JSON.stringify({
                device_name: deviceName,
                device_type: deviceType,
                platform: platform,
                storage_capacity: storageCapacity,
                storage_available: storageAvailable
            })
        });
    }

    /**
     * List all registered devices
     */
    async listDevices() {
        return await this.request('/devices/list');
    }

    /**
     * Send heartbeat for device
     */
    async sendHeartbeat(deviceId, storageAvailable) {
        return await this.request(`/devices/${deviceId}/heartbeat`, {
            method: 'PUT',
            body: JSON.stringify({ storage_available: storageAvailable })
        });
    }

    /**
     * Unregister a device
     */
    async unregisterDevice(deviceId) {
        return await this.request(`/devices/${deviceId}/unregister`, {
            method: 'DELETE'
        });
    }

    /**
     * Get device details
     */
    async getDevice(deviceId) {
        return await this.request(`/devices/${deviceId}`);
    }

    // ===== RAID Configuration =====

    /**
     * Configure RAID for user
     */
    async configureRaid(raidLevel, chunkSize, deviceIds) {
        return await this.request('/raid/configure', {
            method: 'POST',
            body: JSON.stringify({
                raid_level: raidLevel,
                chunk_size: chunkSize,
                device_ids: deviceIds
            })
        });
    }

    /**
     * Get RAID status
     */
    async getRaidStatus() {
        return await this.request('/raid/status');
    }

    /**
     * Heal RAID array
     */
    async healRaid() {
        return await this.request('/raid/heal', {
            method: 'PUT'
        });
    }

    /**
     * Reconstruct file from RAID
     */
    async reconstructFile(fileId) {
        return await this.request('/raid/reconstruct', {
            method: 'POST',
            body: JSON.stringify({ file_id: fileId })
        });
    }

    /**
     * Delete RAID configuration
     */
    async deleteRaidConfig() {
        return await this.request('/raid/configure', {
            method: 'DELETE'
        });
    }

    // ===== Chunk Management =====

    /**
     * Upload chunk to device
     */
    async uploadChunk(chunkId, fileId, chunkIndex, deviceId, chunkData) {
        const formData = new FormData();
        formData.append('chunk_id', chunkId);
        formData.append('file_id', fileId);
        formData.append('chunk_index', chunkIndex.toString());
        formData.append('device_id', deviceId);
        formData.append('chunk', new Blob([chunkData]));

        return await this.request('/chunks/upload', {
            method: 'POST',
            headers: {}, // Let browser set Content-Type
            body: formData
        });
    }

    /**
     * Download chunk from device
     */
    async downloadChunk(chunkId, deviceId) {
        const response = await fetch(`${this.baseURL}/chunks/${chunkId}/download?device_id=${deviceId}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return {
            data: await response.arrayBuffer(),
            hash: response.headers.get('x-chunk-hash')
        };
    }

    /**
     * Verify chunk integrity
     */
    async verifyChunk(chunkId, deviceId) {
        return await this.request('/chunks/verify', {
            method: 'POST',
            body: JSON.stringify({
                chunk_id: chunkId,
                device_id: deviceId
            })
        });
    }

    /**
     * Delete chunk
     */
    async deleteChunk(chunkId, deviceId) {
        return await this.request(`/chunks/${chunkId}?device_id=${deviceId}`, {
            method: 'DELETE'
        });
    }

    /**
     * List chunks for a file
     */
    async listFileChunks(fileId) {
        return await this.request(`/chunks/file/${fileId}`);
    }

    /**
     * Get chunks needing reconstruction
     */
    async getNeedsReconstruction() {
        return await this.request('/chunks/needs-reconstruction');
    }

    // ===== Encryption Operations =====

    async encryptFile(file, password) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('password', password);

        return await this.request('/encryption/encrypt-file', {
            method: 'POST',
            headers: {},
            body: formData
        });
    }

    async decryptFile(file, password) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('password', password);

        return await this.request('/encryption/decrypt-file', {
            method: 'POST',
            headers: {},
            body: formData
        });
    }

    async encryptText(text, password) {
        return await this.request('/encryption/encrypt-text', {
            method: 'POST',
            body: JSON.stringify({ text, password })
        });
    }

    async decryptText(encryptedData, password) {
        return await this.request('/encryption/decrypt-text', {
            method: 'POST',
            body: JSON.stringify({ encryptedData, password })
        });
    }
}

// Make available globally for browser extensions
if (typeof window !== 'undefined') {
    window.FlynasAPIService = FlynasAPIService;
}
