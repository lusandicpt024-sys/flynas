// Flynas Desktop Application JavaScript

class FlynasApp {
    constructor() {
        this.currentPath = '/';
        this.currentUser = null;
        this.selectedFiles = [];
        this.dragCounter = 0;
        
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
                this.displayFiles(result.folders, result.files);
            } else {
                this.showStatus('Failed to load files: ' + result.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error loading files: ' + error.message, 'error');
        }
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
        // Implement file opening logic
        this.showStatus(`Opening ${file.fileName}...`, 'info');
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

    loadSettings() {
        // Load current settings
        this.showStatus('Settings loaded', 'info');
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlynasApp();
});