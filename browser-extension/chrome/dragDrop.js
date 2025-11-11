// Drag and Drop Content Script for Flynas Chrome Extension

class FlynasDragDrop {
    constructor() {
        this.isActive = false;
        this.dragOverlay = null;
        this.quickUploadDialog = null;
        this.isDragging = false;
        this.dragCounter = 0;
        
        this.init();
    }

    init() {
        this.createDragOverlay();
        this.setupEventListeners();
        this.setupMessageListener();
    }

    createDragOverlay() {
        // Create drag overlay
        this.dragOverlay = document.createElement('div');
        this.dragOverlay.id = 'flynas-drag-overlay';
        this.dragOverlay.innerHTML = `
            <div class="flynas-drop-area">
                <div class="flynas-drop-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        <path d="M12,11L16,15H13V19H11V15H8L12,11Z"/>
                    </svg>
                </div>
                <div class="flynas-drop-text">
                    <h3>Drop files to upload to Flynas</h3>
                    <p>Release to save files to your personal cloud</p>
                </div>
            </div>
        `;

        // Style the overlay
        this.dragOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 123, 255, 0.9);
            color: white;
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(4px);
            animation: fadeIn 0.2s ease;
        `;

        // Style the drop area
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .flynas-drop-area {
                text-align: center;
                padding: 48px;
                border: 3px dashed rgba(255, 255, 255, 0.8);
                border-radius: 16px;
                max-width: 400px;
                animation: pulse 2s infinite;
            }
            
            .flynas-drop-icon {
                margin-bottom: 24px;
                opacity: 0.9;
            }
            
            .flynas-drop-text h3 {
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 600;
            }
            
            .flynas-drop-text p {
                margin: 0;
                font-size: 16px;
                opacity: 0.8;
            }
            
            .flynas-quick-upload {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                z-index: 999998;
                min-width: 300px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideIn 0.3s ease;
            }
            
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
            
            .flynas-quick-upload-header {
                padding: 16px;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .flynas-quick-upload-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .flynas-close-btn {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
                padding: 4px;
                border-radius: 4px;
                line-height: 1;
            }
            
            .flynas-close-btn:hover {
                background: #f0f0f0;
                color: #333;
            }
            
            .flynas-quick-upload-content {
                padding: 16px;
            }
            
            .flynas-quick-dropzone {
                border: 2px dashed #ddd;
                border-radius: 8px;
                padding: 24px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
                background: #fafafa;
            }
            
            .flynas-quick-dropzone:hover {
                border-color: #007bff;
                background: #f0f8ff;
            }
            
            .flynas-quick-dropzone.drag-over {
                border-color: #007bff;
                background: #e7f3ff;
                transform: scale(1.02);
            }
            
            .flynas-quick-dropzone svg {
                color: #666;
                margin-bottom: 12px;
            }
            
            .flynas-quick-dropzone-text {
                color: #333;
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .flynas-quick-dropzone-subtext {
                color: #666;
                font-size: 12px;
            }
            
            .flynas-file-list {
                margin-top: 16px;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .flynas-file-item {
                display: flex;
                align-items: center;
                padding: 8px;
                border-radius: 4px;
                margin-bottom: 4px;
                background: #f8f9fa;
                font-size: 14px;
            }
            
            .flynas-file-icon {
                width: 16px;
                height: 16px;
                margin-right: 8px;
                color: #666;
                flex-shrink: 0;
            }
            
            .flynas-file-name {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-right: 8px;
            }
            
            .flynas-file-size {
                font-size: 12px;
                color: #666;
                margin-right: 8px;
            }
            
            .flynas-file-status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 12px;
                white-space: nowrap;
            }
            
            .flynas-file-status.uploading {
                background: #fff3cd;
                color: #856404;
            }
            
            .flynas-file-status.success {
                background: #d4edda;
                color: #155724;
            }
            
            .flynas-file-status.error {
                background: #f8d7da;
                color: #721c24;
            }
            
            .flynas-upload-actions {
                margin-top: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .flynas-upload-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s ease;
            }
            
            .flynas-upload-btn:hover {
                background: #0056b3;
            }
            
            .flynas-upload-btn:disabled {
                background: #6c757d;
                cursor: not-allowed;
            }
            
            .flynas-progress {
                flex: 1;
                margin-right: 12px;
            }
            
            .flynas-progress-bar {
                width: 100%;
                height: 6px;
                background: #e9ecef;
                border-radius: 3px;
                overflow: hidden;
            }
            
            .flynas-progress-fill {
                height: 100%;
                background: #007bff;
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .flynas-progress-text {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
            }
        `;

        if (!document.getElementById('flynas-drag-drop-styles')) {
            style.id = 'flynas-drag-drop-styles';
            document.head.appendChild(style);
        }

        document.body.appendChild(this.dragOverlay);
    }

    setupEventListeners() {
        // Global drag events
        document.addEventListener('dragenter', (e) => {
            this.handleDragEnter(e);
        });

        document.addEventListener('dragover', (e) => {
            this.handleDragOver(e);
        });

        document.addEventListener('dragleave', (e) => {
            this.handleDragLeave(e);
        });

        document.addEventListener('drop', (e) => {
            this.handleDrop(e);
        });

        // Prevent default drag behavior on images and links
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
                e.preventDefault();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'U') {
                e.preventDefault();
                this.showQuickUpload();
            }
        });
    }

    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'FLYNAS_SHOW_UPLOAD') {
                this.showQuickUpload();
            }
        });
    }

    handleDragEnter(e) {
        e.preventDefault();
        this.dragCounter++;
        
        if (this.hasFiles(e.dataTransfer) && this.dragCounter === 1) {
            this.showDragOverlay();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        
        if (this.hasFiles(e.dataTransfer)) {
            this.showDragOverlay();
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dragCounter--;
        
        if (this.dragCounter === 0) {
            this.hideDragOverlay();
        }
    }

    handleDrop(e) {
        e.preventDefault();
        this.dragCounter = 0;
        this.hideDragOverlay();
        
        if (this.hasFiles(e.dataTransfer)) {
            const files = Array.from(e.dataTransfer.files);
            this.uploadFiles(files);
        }
    }

    hasFiles(dataTransfer) {
        return dataTransfer && dataTransfer.types && dataTransfer.types.includes('Files');
    }

    showDragOverlay() {
        if (this.dragOverlay) {
            this.dragOverlay.style.display = 'flex';
            this.isDragging = true;
        }
    }

    hideDragOverlay() {
        if (this.dragOverlay) {
            this.dragOverlay.style.display = 'none';
            this.isDragging = false;
        }
    }

    async uploadFiles(files) {
        for (const file of files) {
            try {
                await this.uploadFile(file);
            } catch (error) {
                console.error('Failed to upload file:', error);
                this.showNotification(`Failed to upload ${file.name}`, 'error');
            }
        }
    }

    async uploadFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Send to background script
            const response = await this.sendMessage('upload', {
                name: file.name,
                data: arrayBuffer,
                type: file.type
            });

            if (response.success) {
                this.showNotification(`${file.name} uploaded successfully`, 'success');
            } else {
                throw new Error(response.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    showQuickUpload() {
        if (this.quickUploadDialog) {
            this.hideQuickUpload();
        }

        this.quickUploadDialog = document.createElement('div');
        this.quickUploadDialog.className = 'flynas-quick-upload';
        this.quickUploadDialog.innerHTML = `
            <div class="flynas-quick-upload-header">
                <h3 class="flynas-quick-upload-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    Quick Upload to Flynas
                </h3>
                <button class="flynas-close-btn">&times;</button>
            </div>
            <div class="flynas-quick-upload-content">
                <div class="flynas-quick-dropzone">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        <path d="M12,11L16,15H13V19H11V15H8L12,11Z"/>
                    </svg>
                    <div class="flynas-quick-dropzone-text">Drop files here or click to browse</div>
                    <div class="flynas-quick-dropzone-subtext">Upload files to your Flynas cloud</div>
                    <input type="file" style="display: none;" multiple accept="*/*">
                </div>
                <div class="flynas-file-list"></div>
                <div class="flynas-upload-actions">
                    <div class="flynas-progress" style="display: none;">
                        <div class="flynas-progress-bar">
                            <div class="flynas-progress-fill"></div>
                        </div>
                        <div class="flynas-progress-text">Uploading...</div>
                    </div>
                    <button class="flynas-upload-btn" style="display: none;">Upload All</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.quickUploadDialog);

        // Setup event listeners for quick upload
        this.setupQuickUploadListeners();
    }

    setupQuickUploadListeners() {
        if (!this.quickUploadDialog) return;

        const closeBtn = this.quickUploadDialog.querySelector('.flynas-close-btn');
        const dropzone = this.quickUploadDialog.querySelector('.flynas-quick-dropzone');
        const fileInput = this.quickUploadDialog.querySelector('input[type="file"]');
        const uploadBtn = this.quickUploadDialog.querySelector('.flynas-upload-btn');

        closeBtn.addEventListener('click', () => {
            this.hideQuickUpload();
        });

        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.addFilesToQuickUpload(Array.from(e.target.files));
        });

        // Drag and drop for quick upload
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('drag-over');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.addFilesToQuickUpload(files);
        });

        uploadBtn.addEventListener('click', () => {
            this.uploadAllQuickFiles();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.quickUploadDialog.contains(e.target)) {
                this.hideQuickUpload();
            }
        });
    }

    addFilesToQuickUpload(files) {
        if (!this.quickUploadDialog || !files.length) return;

        const fileList = this.quickUploadDialog.querySelector('.flynas-file-list');
        const uploadBtn = this.quickUploadDialog.querySelector('.flynas-upload-btn');

        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flynas-file-item';
            fileItem.innerHTML = `
                <div class="flynas-file-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                </div>
                <div class="flynas-file-name">${file.name}</div>
                <div class="flynas-file-size">${this.formatFileSize(file.size)}</div>
                <div class="flynas-file-status">Ready</div>
            `;
            
            fileItem.dataset.fileData = JSON.stringify({
                name: file.name,
                size: file.size,
                type: file.type
            });

            // Store file object reference
            fileItem._file = file;

            fileList.appendChild(fileItem);
        });

        uploadBtn.style.display = 'block';
    }

    async uploadAllQuickFiles() {
        if (!this.quickUploadDialog) return;

        const fileItems = this.quickUploadDialog.querySelectorAll('.flynas-file-item');
        const uploadBtn = this.quickUploadDialog.querySelector('.flynas-upload-btn');
        const progress = this.quickUploadDialog.querySelector('.flynas-progress');

        uploadBtn.disabled = true;
        progress.style.display = 'block';

        let completed = 0;
        const total = fileItems.length;

        for (const fileItem of fileItems) {
            const file = fileItem._file;
            const status = fileItem.querySelector('.flynas-file-status');

            try {
                status.textContent = 'Uploading...';
                status.className = 'flynas-file-status uploading';

                await this.uploadFile(file);

                status.textContent = 'Success';
                status.className = 'flynas-file-status success';
            } catch (error) {
                status.textContent = 'Failed';
                status.className = 'flynas-file-status error';
            }

            completed++;
            const progressPercent = (completed / total) * 100;
            this.updateQuickUploadProgress(progressPercent, `${completed}/${total} files uploaded`);
        }

        // Hide after a delay
        setTimeout(() => {
            this.hideQuickUpload();
        }, 2000);
    }

    updateQuickUploadProgress(percent, text) {
        if (!this.quickUploadDialog) return;

        const progressFill = this.quickUploadDialog.querySelector('.flynas-progress-fill');
        const progressText = this.quickUploadDialog.querySelector('.flynas-progress-text');

        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    }

    hideQuickUpload() {
        if (this.quickUploadDialog) {
            document.body.removeChild(this.quickUploadDialog);
            this.quickUploadDialog = null;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

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

    showNotification(message, type = 'info') {
        // Create notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize drag and drop functionality
if (!window.flynasDragDrop) {
    window.flynasDragDrop = new FlynasDragDrop();
}