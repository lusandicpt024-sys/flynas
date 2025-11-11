// Sidebar JavaScript for Flynas Chrome Extension

class FlynasSidebar {
    constructor() {
        this.currentPath = '/';
        this.files = [];
        this.selectedFile = null;
        this.isAuthenticated = false;
        this.authToken = null;
        this.config = {};

        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.checkAuthStatus();
        this.setupEventListeners();
        this.setupDropzone();
        
        if (this.isAuthenticated) {
            this.showMainContent();
            await this.loadFiles();
        } else {
            this.showAuthSection();
        }
    }

    setupEventListeners() {
        // Auth
        document.getElementById('sign-in-btn').addEventListener('click', () => {
            this.handleSignIn();
        });

        // Header actions
        document.getElementById('sync-btn').addEventListener('click', () => {
            this.handleSync();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });

        // File upload
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        document.getElementById('dropzone').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // Navigation
        document.getElementById('new-folder-btn').addEventListener('click', () => {
            this.showNewFolderModal();
        });

        // Modals
        this.setupModalHandlers();

        // Context menu
        document.addEventListener('click', (e) => {
            this.hideContextMenu();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // File list
        document.getElementById('file-list').addEventListener('scroll', (e) => {
            this.handleScroll(e);
        });
    }

    setupDropzone() {
        const dropzone = document.getElementById('dropzone');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('drag-over');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelect(files);
        }, false);
    }

    setupModalHandlers() {
        // New folder modal
        document.getElementById('cancel-folder-btn').addEventListener('click', () => {
            this.hideNewFolderModal();
        });

        document.getElementById('create-folder-btn').addEventListener('click', () => {
            this.createFolder();
        });

        document.getElementById('folder-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createFolder();
            } else if (e.key === 'Escape') {
                this.hideNewFolderModal();
            }
        });

        // Settings modal
        document.getElementById('close-settings-btn').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Click outside to close modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Authentication methods
    async handleSignIn() {
        try {
            // Implement OAuth flow with Flynas server
            const response = await this.sendMessage('auth', { action: 'login' });
            if (response.success) {
                this.isAuthenticated = true;
                this.authToken = response.data.token;
                this.showMainContent();
                await this.loadFiles();
            }
        } catch (error) {
            console.error('Sign in failed:', error);
            this.showError('Sign in failed. Please try again.');
        }
    }

    async checkAuthStatus() {
        try {
            const response = await this.sendMessage('get-config');
            if (response.success) {
                this.config = response.data;
                this.isAuthenticated = !!this.config.authToken;
                this.authToken = this.config.authToken;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    // UI State methods
    showAuthSection() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }

    showMainContent() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
    }

    showSettings() {
        const modal = document.getElementById('settings-modal');
        
        // Populate current settings
        document.getElementById('auto-sync').checked = this.config.autoSync || false;
        document.getElementById('encryption-enabled').checked = this.config.encryptionEnabled || false;
        document.getElementById('notifications').checked = this.config.notifications || false;
        document.getElementById('api-url').value = this.config.apiUrl || '';
        
        modal.classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settings-modal').classList.add('hidden');
    }

    async saveSettings() {
        const newConfig = {
            ...this.config,
            autoSync: document.getElementById('auto-sync').checked,
            encryptionEnabled: document.getElementById('encryption-enabled').checked,
            notifications: document.getElementById('notifications').checked,
            apiUrl: document.getElementById('api-url').value
        };

        try {
            await this.sendMessage('set-config', newConfig);
            this.config = newConfig;
            this.hideSettings();
            this.showSuccess('Settings saved');
        } catch (error) {
            console.error('Save settings failed:', error);
            this.showError('Failed to save settings');
        }
    }

    showNewFolderModal() {
        const modal = document.getElementById('new-folder-modal');
        const input = document.getElementById('folder-name-input');
        input.value = '';
        modal.classList.remove('hidden');
        input.focus();
    }

    hideNewFolderModal() {
        document.getElementById('new-folder-modal').classList.add('hidden');
    }

    // File operations
    async handleFileSelect(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        try {
            this.showUploadProgress(true);
            
            const arrayBuffer = await file.arrayBuffer();
            const response = await this.sendMessage('upload', {
                name: file.name,
                data: arrayBuffer,
                type: file.type,
                path: this.currentPath
            });

            if (response.success) {
                this.showUploadProgress(false);
                await this.loadFiles();
                this.showSuccess(`${file.name} uploaded successfully`);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            this.showUploadProgress(false);
            this.showError(`Failed to upload ${file.name}`);
        }
    }

    async loadFiles() {
        try {
            this.showLoading(true);
            const response = await this.sendMessage('list-files', { path: this.currentPath });
            
            if (response.success) {
                this.files = response.data;
                this.renderFileList();
            }
        } catch (error) {
            console.error('Failed to load files:', error);
            this.showError('Failed to load files');
        } finally {
            this.showLoading(false);
        }
    }

    renderFileList() {
        const fileList = document.getElementById('file-list');
        const loading = document.getElementById('loading');
        loading.classList.add('hidden');

        if (this.files.length === 0) {
            fileList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="color: #6c757d; margin-bottom: 16px;">
                        <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
                    </svg>
                    <p style="color: #6c757d;">This folder is empty</p>
                </div>
            `;
            return;
        }

        fileList.innerHTML = this.files.map(file => this.renderFileItem(file)).join('');
        
        // Add event listeners to file items
        fileList.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleFileClick(e, item.dataset.fileId);
            });

            item.addEventListener('dblclick', (e) => {
                this.handleFileDoubleClick(e, item.dataset.fileId);
            });

            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, item.dataset.fileId);
            });
        });
    }

    renderFileItem(file) {
        const icon = this.getFileIcon(file);
        const formattedSize = this.formatFileSize(file.size);
        const formattedDate = new Date(file.modified).toLocaleDateString();

        return `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-icon ${file.type}">${icon}</div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">
                        <span>${formattedSize}</span>
                        <span>${formattedDate}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); flynasSidebar.downloadFile('${file.id}')" title="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                        </svg>
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); flynasSidebar.shareFile('${file.id}')" title="Share">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A1.84,1.84 0 0,0 18,16.08Z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    getFileIcon(file) {
        const icons = {
            folder: `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
            </svg>`,
            image: `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
            </svg>`,
            video: `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
            </svg>`,
            audio: `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13A3,3 0 0,0 7,16A3,3 0 0,0 10,19A3,3 0 0,0 13,16V7H18V5H12Z"/>
            </svg>`,
            default: `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>`
        };

        if (file.type === 'folder') return icons.folder;
        if (file.mimeType?.startsWith('image/')) return icons.image;
        if (file.mimeType?.startsWith('video/')) return icons.video;
        if (file.mimeType?.startsWith('audio/')) return icons.audio;
        return icons.default;
    }

    // File interaction handlers
    handleFileClick(e, fileId) {
        const item = e.currentTarget;
        
        // Clear previous selections
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select current item
        item.classList.add('selected');
        this.selectedFile = this.files.find(f => f.id === fileId);
    }

    handleFileDoubleClick(e, fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file?.type === 'folder') {
            this.navigateToFolder(file.path || `${this.currentPath}/${file.name}`);
        } else {
            this.downloadFile(fileId);
        }
    }

    async navigateToFolder(path) {
        this.currentPath = path;
        this.updateBreadcrumb();
        await this.loadFiles();
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const pathParts = this.currentPath.split('/').filter(part => part);
        
        let html = '<span class="breadcrumb-item" data-path="/">Home</span>';
        let currentPath = '';
        
        pathParts.forEach(part => {
            currentPath += `/${part}`;
            html += `<span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`;
        });
        
        breadcrumb.innerHTML = html;
        
        // Add click listeners to breadcrumb items
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToFolder(item.dataset.path);
            });
        });
        
        // Mark last item as active
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.classList.remove('active');
        });
        breadcrumb.lastElementChild?.classList.add('active');
    }

    // Context menu
    showContextMenu(e, fileId) {
        e.preventDefault();
        const contextMenu = document.getElementById('context-menu');
        const file = this.files.find(f => f.id === fileId);
        
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.remove('hidden');
        
        // Add click handlers for context menu items
        contextMenu.querySelectorAll('.context-item').forEach(item => {
            item.onclick = () => {
                this.handleContextAction(item.dataset.action, file);
                this.hideContextMenu();
            };
        });
    }

    hideContextMenu() {
        document.getElementById('context-menu').classList.add('hidden');
    }

    handleContextAction(action, file) {
        switch (action) {
            case 'download':
                this.downloadFile(file.id);
                break;
            case 'share':
                this.shareFile(file.id);
                break;
            case 'rename':
                this.renameFile(file.id);
                break;
            case 'delete':
                this.deleteFile(file.id);
                break;
        }
    }

    // File actions
    async downloadFile(fileId) {
        try {
            const response = await this.sendMessage('download', { fileId });
            if (response.success) {
                this.showSuccess('Download started');
            }
        } catch (error) {
            console.error('Download failed:', error);
            this.showError('Download failed');
        }
    }

    async shareFile(fileId) {
        // Implement file sharing
        console.log('Sharing file:', fileId);
        this.showInfo('Share feature coming soon');
    }

    async createFolder() {
        const input = document.getElementById('folder-name-input');
        const folderName = input.value.trim();
        
        if (!folderName) {
            this.showError('Please enter a folder name');
            return;
        }
        
        try {
            const response = await this.sendMessage('create-folder', {
                name: folderName,
                path: this.currentPath
            });
            
            if (response.success) {
                this.hideNewFolderModal();
                await this.loadFiles();
                this.showSuccess(`Folder "${folderName}" created`);
            }
        } catch (error) {
            console.error('Create folder failed:', error);
            this.showError('Failed to create folder');
        }
    }

    // Utility methods
    async handleSync() {
        try {
            this.showInfo('Syncing...');
            await this.loadFiles();
            this.showSuccess('Sync completed');
        } catch (error) {
            console.error('Sync failed:', error);
            this.showError('Sync failed');
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.hideContextMenu();
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
        
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    this.handleSync();
                    break;
            }
        }
    }

    handleScroll(e) {
        // Implement infinite scroll if needed
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showUploadProgress(show, progress = 0) {
        const uploadProgress = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (show) {
            uploadProgress.classList.remove('hidden');
            progressFill.style.width = `${progress}%`;
            progressText.textContent = progress === 100 ? 'Upload complete' : `Uploading... ${progress}%`;
        } else {
            uploadProgress.classList.add('hidden');
        }
    }

    async loadConfig() {
        try {
            const response = await this.sendMessage('get-config');
            if (response.success) {
                this.config = response.data;
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }

    // Communication with background script
    async sendMessage(action, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action, data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response?.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Unknown error'));
                }
            });
        });
    }

    // Notification methods
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Add toast styles
        toast.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            padding: 12px 16px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            border-radius: 4px;
            z-index: 3000;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
    }
`;
document.head.appendChild(style);

// Initialize sidebar when DOM is ready
const flynasSidebar = new FlynasSidebar();