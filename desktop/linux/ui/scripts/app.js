// Flynas Desktop Application JavaScript

class FlynasApp {
    constructor() {
        this.currentPath = '/';
        this.currentUser = null;
        this.selectedFiles = [];
        this.dragCounter = 0;
        this.allItems = { folders: [], files: [] };
        this.searchQuery = '';
        this.sortCriteria = 'name';
        this.sortAscending = true;

        // Editor state
        this.editor = {
            file: null,
            dirty: false,
            autosaveDelayMs: 2000,
            autosaveTimer: null,
            undoStack: [],
            redoStack: [],
            maxHistory: 50
        };
        
        this.init();
    }

    async init() {
        // Initialize event listeners
        this.setupEventListeners();
        
        // Initialize drag and drop
        this.setupDragAndDrop();
        
        // Check authentication status
        await this.checkAuthStatus();
        
        // Load initial file list
        await this.loadFiles();
    }

    setupEventListeners() {
        // Title bar controls
        document.getElementById('minimize-btn').addEventListener('click', () => {
            window.electronAPI.window.minimize();
        });

        document.getElementById('maximize-btn').addEventListener('click', () => {
            window.electronAPI.window.maximize();
        });

        document.getElementById('close-btn').addEventListener('click', () => {
            window.electronAPI.window.close();
        });

        // Authentication
        document.getElementById('login-btn').addEventListener('click', () => {
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
            });
        });

        // Toolbar actions
        document.getElementById('upload-btn').addEventListener('click', () => {
            this.handleUpload();
        });

        document.getElementById('new-folder-btn').addEventListener('click', () => {
            this.showNewFolderModal();
        });

        // New folder modal
        document.getElementById('create-folder-btn').addEventListener('click', () => {
            this.createFolder();
        });

        document.getElementById('cancel-folder-btn').addEventListener('click', () => {
            this.hideNewFolderModal();
        });

        // Settings
        document.getElementById('browse-storage-btn').addEventListener('click', () => {
            this.browseStorage();
        });

        // RAID Device Management
        document.getElementById('register-device-btn').addEventListener('click', () => {
            this.registerDevice();
        });
        document.getElementById('refresh-devices-btn').addEventListener('click', () => {
            this.loadDevices();
        });

        // RAID Configuration
        document.getElementById('configure-raid-btn').addEventListener('click', () => {
            this.configureRaid();
        });
        document.getElementById('delete-raid-btn').addEventListener('click', () => {
            this.deleteRaidConfig();
        });
        document.getElementById('raid-level').addEventListener('change', () => {
            this.updateRaidConfigUI();
        });

        // RAID Maintenance
        document.getElementById('heal-raid-btn').addEventListener('click', () => {
            this.healRaid();
        });
        document.getElementById('verify-chunks-btn').addEventListener('click', () => {
            this.verifyAllChunks();
        });

        // Search and sort
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applyFilterAndSort();
        });
        document.getElementById('sort-criteria').addEventListener('change', (e) => {
            this.sortCriteria = e.target.value;
            this.applyFilterAndSort();
        });
        document.getElementById('sort-direction-btn').addEventListener('click', () => {
            this.sortAscending = !this.sortAscending;
            document.getElementById('sort-direction-indicator').textContent = this.sortAscending ? '⬇️' : '⬆️';
            this.applyFilterAndSort();
        });

        // Menu event listeners
        window.electronAPI.on('menu-new-folder', () => {
            this.showNewFolderModal();
        });

        window.electronAPI.on('menu-settings', () => {
            this.switchSection('settings');
        });

        window.electronAPI.on('files:upload-start', (event, files) => {
            this.handleUploadStart(files);
        });

        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // Folder name input enter key
        document.getElementById('folder-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createFolder();
            }
        });
        // Editor modal
        document.getElementById('editor-cancel-btn').addEventListener('click', () => {
            this.closeEditor();
        });
        document.getElementById('editor-save-btn').addEventListener('click', () => {
            this.saveEditorFile();
        });
        document.getElementById('editor-undo-btn').addEventListener('click', () => {
            this.editorUndo();
        });
        document.getElementById('editor-redo-btn').addEventListener('click', () => {
            this.editorRedo();
        });
        document.getElementById('editor-text').addEventListener('input', (e) => {
            this.onEditorChange(e.target.value);
        });
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        const fileGrid = document.getElementById('file-grid');

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop zone when items are dragged over the page
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, () => {
                this.dragCounter++;
                dropZone.classList.add('active');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, () => {
                this.dragCounter--;
                if (this.dragCounter === 0) {
                    dropZone.classList.remove('active');
                }
            });
        });

        // Handle dropped files
        document.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFilesDrop(files);
            }
        });
    }

    async checkAuthStatus() {
        try {
            const result = await window.electronAPI.auth.getUser();
            if (result.success && result.user) {
                this.currentUser = result.user;
                this.updateUserUI();
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
        }
    }

    async handleLogin() {
        try {
            const result = await window.electronAPI.auth.login();
            if (result.success) {
                this.showStatus('Opening authentication page...', 'info');
                // The auth flow continues in the browser
                // We would need to implement a callback handler
            }
        } catch (error) {
            this.showStatus('Login failed: ' + error.message, 'error');
        }
    }

    updateUserUI() {
        if (this.currentUser) {
            document.querySelector('.user-name').textContent = this.currentUser.username;
            document.querySelector('.user-status').textContent = 'Connected';
            document.getElementById('login-btn').textContent = 'Logout';
            document.getElementById('login-btn').onclick = () => this.handleLogout();
            
            // Update avatar
            const avatar = document.getElementById('user-avatar');
            avatar.innerHTML = `<img src="https://api.dicebear.com/7.x/initials/svg?seed=${this.currentUser.username}" alt="Avatar">`;
        } else {
            document.querySelector('.user-name').textContent = 'Not logged in';
            document.querySelector('.user-status').textContent = 'Disconnected';
            document.getElementById('login-btn').textContent = 'Login';
            document.getElementById('login-btn').onclick = () => this.handleLogin();
            
            // Reset avatar
            const avatar = document.getElementById('user-avatar');
            avatar.innerHTML = '<i class="icon-user"></i>';
        }
    }

    async handleLogout() {
        try {
            const result = await window.electronAPI.auth.logout();
            if (result.success) {
                this.currentUser = null;
                this.updateUserUI();
                this.showStatus('Logged out successfully', 'success');
            }
        } catch (error) {
            this.showStatus('Logout failed: ' + error.message, 'error');
        }
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Load section-specific content
        switch (sectionName) {
            case 'files':
                this.loadFiles();
                break;
            case 'shared':
                this.loadSharedFolders();
                break;
            case 'devices':
                this.loadDevices();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadFiles() {
        try {
            const result = await window.electronAPI.fs.listDirectory(this.currentPath);
            if (result.success) {
                this.allItems = { folders: result.folders, files: result.files };
                this.applyFilterAndSort();
            } else {
                this.showStatus('Failed to load files: ' + result.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error loading files: ' + error.message, 'error');
        }
    }

    applyFilterAndSort() {
        const q = this.searchQuery;
        const filterFn = (name) => !q || name.toLowerCase().includes(q);

        const folders = this.allItems.folders.filter(f => filterFn(f.folderName));
        const files = this.allItems.files.filter(f => filterFn(f.fileName));

        const compare = (a, b) => {
            let va, vb;
            switch (this.sortCriteria) {
                case 'size':
                    va = (a.size || 0); vb = (b.size || 0); break;
                case 'date':
                    va = new Date(a.modifiedAt || a.createdAt || 0).getTime();
                    vb = new Date(b.modifiedAt || b.createdAt || 0).getTime();
                    break;
                case 'type':
                    va = (a.fileType || '').toString(); vb = (b.fileType || '').toString(); break;
                case 'name':
                default:
                    va = (a.fileName || a.folderName || '').toString().toLowerCase();
                    vb = (b.fileName || b.folderName || '').toString().toLowerCase();
            }
            const diff = va < vb ? -1 : va > vb ? 1 : 0;
            return this.sortAscending ? diff : -diff;
        };

        folders.sort((a, b) => compare(a, b));
        files.sort((a, b) => compare(a, b));

        this.displayFiles(folders, files);
    }

    displayFiles(folders, files) {
        const fileGrid = document.getElementById('file-grid');
        fileGrid.innerHTML = '';

        // Display folders
        folders.forEach(folder => {
            const folderElement = this.createFileElement(folder, 'folder');
            fileGrid.appendChild(folderElement);
        });

        // Display files
        files.forEach(file => {
            const fileElement = this.createFileElement(file, file.fileType);
            fileGrid.appendChild(fileElement);
        });
    }

    createFileElement(item, type) {
        const element = document.createElement('div');
        element.className = 'file-item';
        element.dataset.id = item.fileId || item.folderId;
        element.dataset.type = type;

        const icon = document.createElement('div');
        icon.className = `file-icon ${type}`;
        icon.innerHTML = this.getFileIcon(type);

        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = item.fileName || item.folderName;

        element.appendChild(icon);
        element.appendChild(name);

        // Add click handler
        element.addEventListener('click', () => {
            this.selectFile(element);
        });

        element.addEventListener('dblclick', () => {
            if (type === 'folder') {
                this.openFolder(item);
            } else {
                this.openFile(item);
            }
        });

        return element;
    }

    getFileIcon(type) {
        const icons = {
            folder: '📁',
            image: '🖼️',
            video: '🎥',
            document: '📄',
            audio: '🎵',
            archive: '📦',
            other: '📄'
        };
        return icons[type] || icons.other;
    }

    selectFile(element) {
        // Clear previous selections
        document.querySelectorAll('.file-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Select current item
        element.classList.add('selected');
        this.selectedFiles = [element.dataset.id];
    }

    async openFolder(folder) {
        this.currentPath = folder.path;
        await this.loadFiles();
        this.updateBreadcrumb();
    }

    async openFile(file) {
        const name = file.fileName || '';
        if (name.toLowerCase().endsWith('.txt')) {
            await this.openInEditor(file);
        } else {
            this.showStatus(`Opening ${file.fileName}...`, 'info');
        }
    }

    updateBreadcrumb() {
        const breadcrumb = document.querySelector('.breadcrumb');
        const pathParts = this.currentPath.split('/').filter(part => part);
        
        breadcrumb.innerHTML = '<span class="breadcrumb-item active">Home</span>';
        
        pathParts.forEach((part, index) => {
            const item = document.createElement('span');
            item.className = 'breadcrumb-item';
            item.textContent = part;
            
            if (index < pathParts.length - 1) {
                item.addEventListener('click', () => {
                    this.currentPath = '/' + pathParts.slice(0, index + 1).join('/');
                    this.loadFiles();
                    this.updateBreadcrumb();
                });
            } else {
                item.classList.add('active');
            }
            
            breadcrumb.appendChild(item);
        });
    }

    async handleUpload() {
        try {
            const result = await window.electronAPI.fs.uploadFiles();
            if (result.success && !result.canceled) {
                this.handleUploadStart(result.files);
            }
        } catch (error) {
            this.showStatus('Upload failed: ' + error.message, 'error');
        }
    }

    handleUploadStart(files) {
        this.showStatus(`Uploading ${files.length} file(s)...`, 'info');
        this.showProgressModal('Uploading Files', files);
        
        // Simulate upload progress
        files.forEach((filePath, index) => {
            this.simulateUploadProgress(filePath, index);
        });
    }

    handleFilesDrop(files) {
        const filePaths = files.map(file => file.path);
        this.handleUploadStart(filePaths);
    }

    simulateUploadProgress(filePath, index) {
        const fileName = filePath.split('/').pop();
        const progressItem = this.createProgressItem(fileName);
        document.getElementById('progress-list').appendChild(progressItem);

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }

            this.updateProgressItem(progressItem, progress);
            
            if (progress === 100) {
                setTimeout(() => {
                    progressItem.style.opacity = '0.5';
                }, 500);
            }
        }, 200);
    }

    createProgressItem(fileName) {
        const item = document.createElement('div');
        item.className = 'progress-item';
        item.innerHTML = `
            <div class="progress-name">${fileName}</div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: 0%"></div>
            </div>
            <div class="progress-text">
                <span class="progress-percent">0%</span>
                <span class="progress-status">Uploading...</span>
            </div>
        `;
        return item;
    }

    updateProgressItem(item, progress) {
        const progressBar = item.querySelector('.progress-bar');
        const progressPercent = item.querySelector('.progress-percent');
        const progressStatus = item.querySelector('.progress-status');

        progressBar.style.width = `${progress}%`;
        progressPercent.textContent = `${Math.round(progress)}%`;
        
        if (progress === 100) {
            progressStatus.textContent = 'Complete';
        }
    }

    showProgressModal(title, files) {
        const modal = document.getElementById('progress-modal');
        const titleElement = document.getElementById('progress-title');
        const progressList = document.getElementById('progress-list');
        
        titleElement.textContent = title;
        progressList.innerHTML = '';
        modal.classList.add('active');
    }

    showNewFolderModal() {
        const modal = document.getElementById('new-folder-modal');
        const input = document.getElementById('folder-name-input');
        
        modal.classList.add('active');
        input.focus();
        input.value = '';
    }

    hideNewFolderModal() {
        const modal = document.getElementById('new-folder-modal');
        modal.classList.remove('active');
    }

    async createFolder() {
        const input = document.getElementById('folder-name-input');
        const folderName = input.value.trim();

        if (!folderName) {
            this.showStatus('Please enter a folder name', 'warning');
            return;
        }

        try {
            const result = await window.electronAPI.fs.createFolder(this.currentPath, folderName);
            if (result.success) {
                this.hideNewFolderModal();
                this.showStatus(`Folder "${folderName}" created successfully`, 'success');
                await this.loadFiles();
            } else {
                this.showStatus('Failed to create folder: ' + result.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error creating folder: ' + error.message, 'error');
        }
    }

    async browseStorage() {
        try {
            const result = await window.electronAPI.fs.selectStoragePath();
            if (result.success && !result.canceled) {
                document.getElementById('storage-path').value = result.path;
                this.showStatus('Storage path updated', 'success');
            }
        } catch (error) {
            this.showStatus('Failed to select storage path: ' + error.message, 'error');
        }
    }

    loadSharedFolders() {
        // Implement shared folders loading
        this.showStatus('Loading shared folders...', 'info');
    }

    loadDevices() {
        // Implement devices loading
        this.showStatus('Loading connected devices...', 'info');
    }

    async loadSettings() {
        // Load current settings
        this.showStatus('Settings loaded', 'info');
        
        // Load RAID status and devices
        await this.loadRaidStatus();
        await this.loadDevices();
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-${type}`;

        // Clear status after 5 seconds
        setTimeout(() => {
            statusElement.textContent = 'Ready';
            statusElement.className = '';
        }, 5000);
    }

    // Editor features
    async openInEditor(file) {
        this.editor.file = file;
        this.editor.dirty = false;
        this.editor.undoStack = [];
        this.editor.redoStack = [];
        clearTimeout(this.editor.autosaveTimer);

        document.getElementById('editor-title').textContent = file.fileName || 'Editor';

        try {
            const res = await window.electronAPI.fs.readFile(file.path);
            if (res.success) {
                const text = res.content || '';
                document.getElementById('editor-text').value = text;
                // Initialize undo history baseline
                this.editor.undoStack.push(text);
                document.getElementById('editor-status').textContent = 'Loaded';
            } else {
                document.getElementById('editor-text').value = '';
                document.getElementById('editor-status').textContent = 'Failed to load';
            }
        } catch (e) {
            document.getElementById('editor-text').value = '';
            document.getElementById('editor-status').textContent = 'Error loading file';
        }

        document.getElementById('text-editor-modal').classList.add('active');
    }

    closeEditor() {
        clearTimeout(this.editor.autosaveTimer);
        this.editor.file = null;
        this.editor.dirty = false;
        document.getElementById('text-editor-modal').classList.remove('active');
    }

    onEditorChange(text) {
        this.editor.dirty = true;
        const last = this.editor.undoStack[this.editor.undoStack.length - 1];
        if (last !== text) {
            this.editor.undoStack.push(text);
            if (this.editor.undoStack.length > this.editor.maxHistory) {
                this.editor.undoStack.shift();
            }
            // Clear redo on new input
            this.editor.redoStack = [];
        }

        document.getElementById('editor-status').textContent = 'Unsaved changes';
        clearTimeout(this.editor.autosaveTimer);
        this.editor.autosaveTimer = setTimeout(() => {
            this.saveEditorFile(true);
        }, this.editor.autosaveDelayMs);
    }

    async saveEditorFile(isAutosave = false) {
        if (!this.editor.file) return;
        const text = document.getElementById('editor-text').value;
        try {
            const res = await window.electronAPI.fs.writeFile(this.editor.file.path, text);
            if (res.success) {
                this.editor.dirty = false;
                document.getElementById('editor-status').textContent = isAutosave ? 'Autosaved' : 'Saved';
            } else {
                document.getElementById('editor-status').textContent = 'Save failed';
            }
        } catch (e) {
            document.getElementById('editor-status').textContent = 'Error saving';
        }
    }

    editorUndo() {
        if (this.editor.undoStack.length > 1) {
            const current = this.editor.undoStack.pop();
            this.editor.redoStack.push(current);
            const prev = this.editor.undoStack[this.editor.undoStack.length - 1];
            document.getElementById('editor-text').value = prev;
            this.editor.dirty = true;
            document.getElementById('editor-status').textContent = 'Undo';
            clearTimeout(this.editor.autosaveTimer);
            this.editor.autosaveTimer = setTimeout(() => this.saveEditorFile(true), this.editor.autosaveDelayMs);
        }
    }

    editorRedo() {
        if (this.editor.redoStack.length > 0) {
            const next = this.editor.redoStack.pop();
            document.getElementById('editor-text').value = next;
            this.editor.undoStack.push(next);
            this.editor.dirty = true;
            document.getElementById('editor-status').textContent = 'Redo';
            clearTimeout(this.editor.autosaveTimer);
            this.editor.autosaveTimer = setTimeout(() => this.saveEditorFile(true), this.editor.autosaveDelayMs);
        }
    }

    // ===== RAID Management Methods =====

    async registerDevice() {
        try {
            const os = await window.electronAPI.system.getOS();
            const hostname = await window.electronAPI.system.getHostname();
            const storage = await window.electronAPI.system.getStorageInfo();

            const result = await window.electronAPI.raid.registerDevice({
                deviceName: hostname || 'Linux Desktop',
                deviceType: 'desktop',
                platform: os || 'linux',
                storageCapacity: storage?.total || null,
                storageAvailable: storage?.available || null
            });

            if (result.success) {
                this.showStatus('Device registered successfully', 'success');
                await this.loadDevices();
                await this.loadRaidStatus();
            } else {
                this.showStatus(`Failed to register device: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`Error registering device: ${error.message}`, 'error');
        }
    }

    async loadDevices() {
        try {
            const result = await window.electronAPI.raid.listDevices();

            if (result.success && result.devices) {
                this.renderDevicesTable(result.devices);
                this.updateDeviceSelection(result.devices);
                this.updateRaidConfigUI();
            } else {
                this.renderDevicesTable([]);
            }
        } catch (error) {
            console.error('Error loading devices:', error);
            this.showStatus(`Error loading devices: ${error.message}`, 'error');
        }
    }

    renderDevicesTable(devices) {
        const tbody = document.getElementById('devices-table-body');
        
        if (devices.length === 0) {
            tbody.innerHTML = '<tr class="no-data"><td colspan="6">No devices registered</td></tr>';
            return;
        }

        tbody.innerHTML = devices.map(device => {
            const statusClass = device.status === 'online' ? 'device-status-online' : 'device-status-offline';
            const storage = device.storage_capacity 
                ? `${this.formatBytes(device.storage_available || 0)} / ${this.formatBytes(device.storage_capacity)}`
                : 'N/A';

            return `
                <tr>
                    <td>${this.escapeHtml(device.device_name)}</td>
                    <td>${this.escapeHtml(device.device_type)}</td>
                    <td>${this.escapeHtml(device.platform)}</td>
                    <td><span class="device-status-badge ${statusClass}">${device.status}</span></td>
                    <td>${storage}</td>
                    <td>
                        <button class="device-action-btn" onclick="flynasApp.sendHeartbeat('${device.device_id}')">Heartbeat</button>
                        <button class="device-action-btn" onclick="flynasApp.unregisterDevice('${device.device_id}')">Remove</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateDeviceSelection(devices) {
        const container = document.getElementById('device-selection-list');
        const onlineDevices = devices.filter(d => d.status === 'online');

        if (onlineDevices.length === 0) {
            container.innerHTML = '<p class="muted">No online devices available</p>';
            return;
        }

        container.innerHTML = onlineDevices.map(device => `
            <div class="device-selection-item">
                <input type="checkbox" id="device-${device.device_id}" value="${device.device_id}">
                <label for="device-${device.device_id}">
                    <div class="device-info">
                        <span class="device-info-name">${this.escapeHtml(device.device_name)}</span>
                        <span class="device-info-meta">${device.platform} • ${device.device_type}</span>
                    </div>
                </label>
            </div>
        `).join('');
    }

    async sendHeartbeat(deviceId) {
        try {
            const storage = await window.electronAPI.system.getStorageInfo();
            const result = await window.electronAPI.raid.sendHeartbeat(deviceId, storage?.available);

            if (result.success) {
                this.showStatus('Heartbeat sent', 'success');
                await this.loadDevices();
            } else {
                this.showStatus(`Heartbeat failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`Error sending heartbeat: ${error.message}`, 'error');
        }
    }

    async unregisterDevice(deviceId) {
        if (!confirm('Are you sure you want to unregister this device?')) {
            return;
        }

        try {
            const result = await window.electronAPI.raid.unregisterDevice(deviceId);

            if (result.success) {
                this.showStatus('Device unregistered', 'success');
                await this.loadDevices();
                await this.loadRaidStatus();
            } else {
                this.showStatus(`Failed to unregister device: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`Error unregistering device: ${error.message}`, 'error');
        }
    }

    async loadRaidStatus() {
        try {
            const result = await window.electronAPI.raid.getRaidStatus();

            if (result.success && result.status) {
                this.renderRaidStatus(result.status);
            }
        } catch (error) {
            console.error('Error loading RAID status:', error);
        }
    }

    renderRaidStatus(status) {
        const badge = document.getElementById('raid-health-badge');
        const details = document.getElementById('raid-status-details');

        if (!status.configured) {
            badge.textContent = 'Not Configured';
            badge.className = 'badge badge-gray';
            details.innerHTML = '<p class="muted">No RAID configuration found. Register devices and configure RAID for multi-device redundancy.</p>';
            document.getElementById('delete-raid-btn').disabled = true;
            document.getElementById('heal-raid-btn').disabled = true;
            document.getElementById('verify-chunks-btn').disabled = true;
            return;
        }

        const config = status.config;
        const health = status.health || 'unknown';
        
        // Update badge
        badge.textContent = health.toUpperCase();
        badge.className = `badge badge-${health === 'healthy' ? 'success' : health === 'degraded' ? 'warning' : 'danger'}`;

        // Update details
        details.innerHTML = `
            <p><strong>RAID Level:</strong> ${config.raid_level}</p>
            <p><strong>Chunk Size:</strong> ${this.formatBytes(config.chunk_size)}</p>
            <p><strong>Devices:</strong> ${status.online_devices} online / ${status.total_devices} total</p>
            <p><strong>Status:</strong> ${config.active ? 'Active' : 'Inactive'}</p>
        `;

        document.getElementById('delete-raid-btn').disabled = false;
        document.getElementById('heal-raid-btn').disabled = false;
        document.getElementById('verify-chunks-btn').disabled = false;
    }

    updateRaidConfigUI() {
        const raidLevel = document.getElementById('raid-level').value;
        const selectedDevices = document.querySelectorAll('#device-selection-list input[type="checkbox"]:checked');
        const configureBtn = document.getElementById('configure-raid-btn');

        let minDevices = 0;
        if (raidLevel === '1') minDevices = 2;
        else if (raidLevel === '5') minDevices = 3;
        else if (raidLevel === '10') minDevices = 4;

        const canConfigure = raidLevel && selectedDevices.length >= minDevices;
        configureBtn.disabled = !canConfigure;

        if (raidLevel && selectedDevices.length < minDevices) {
            this.showStatus(`RAID ${raidLevel} requires at least ${minDevices} devices`, 'warning');
        }
    }

    async configureRaid() {
        const raidLevel = document.getElementById('raid-level').value;
        const chunkSize = parseInt(document.getElementById('chunk-size').value);
        const selectedDevices = Array.from(
            document.querySelectorAll('#device-selection-list input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        if (!raidLevel || selectedDevices.length === 0) {
            this.showStatus('Please select RAID level and devices', 'error');
            return;
        }

        try {
            const result = await window.electronAPI.raid.configureRaid(raidLevel, chunkSize, selectedDevices);

            if (result.success) {
                this.showStatus('RAID configured successfully', 'success');
                await this.loadRaidStatus();
            } else {
                this.showStatus(`RAID configuration failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`Error configuring RAID: ${error.message}`, 'error');
        }
    }

    async deleteRaidConfig() {
        if (!confirm('Are you sure you want to delete the RAID configuration? This will not delete your files, but RAID redundancy will be disabled.')) {
            return;
        }

        try {
            const result = await window.electronAPI.raid.deleteRaidConfig();

            if (result.success) {
                this.showStatus('RAID configuration deleted', 'success');
                await this.loadRaidStatus();
            } else {
                this.showStatus(`Failed to delete RAID configuration: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`Error deleting RAID configuration: ${error.message}`, 'error');
        }
    }

    async healRaid() {
        this.showStatus('Starting RAID healing...', 'info');

        try {
            const result = await window.electronAPI.raid.healRaid();

            if (result.success) {
                this.showStatus('RAID healing completed', 'success');
                await this.loadRaidStatus();
            } else {
                this.showStatus(`RAID healing failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`Error during RAID healing: ${error.message}`, 'error');
        }
    }

    async verifyAllChunks() {
        this.showStatus('Verifying all chunks...', 'info');

        try {
            const result = await window.electronAPI.raid.verifyChunks();

            if (result.success) {
                this.showStatus(`Verification complete: ${result.valid} valid, ${result.invalid} invalid`, 'success');
            } else {
                this.showStatus(`Chunk verification failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`Error verifying chunks: ${error.message}`, 'error');
        }
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.flynasApp = new FlynasApp();
});