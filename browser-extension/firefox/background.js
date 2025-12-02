// Background service worker for Chrome extension

class FlynasBackground {
    constructor() {
        this.setupEventListeners();
        this.contextMenus = [];
        this.heartbeatAlarm = 'flynas-heartbeat';
        this.heartbeatIntervalMinutes = 5;
        this.setupHeartbeat();
    }

    setupEventListeners() {
        // Extension installation/startup
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });

        // Context menu clicks
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });

        // Command shortcuts
        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });

        // Message handling
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                this.handleTabUpdate(tabId, tab);
            }
        });
    }

    async handleInstall(details) {
        console.log('Flynas extension installed:', details.reason);
        
        // Create context menus
        await this.createContextMenus();
        
        // Initialize storage
        await this.initializeStorage();
        
        // Check for existing auth
        await this.checkAuthStatus();
    }

    async handleStartup() {
        console.log('Flynas extension started');
        await this.createContextMenus();
        await this.checkAuthStatus();
    }

    async createContextMenus() {
        // Clear existing menus
        await chrome.contextMenus.removeAll();
        
        // File/image context menu
        chrome.contextMenus.create({
            id: 'upload-to-flynas',
            title: 'Upload to Flynas',
            contexts: ['image', 'video', 'audio', 'link'],
            documentUrlPatterns: ['<all_urls>']
        });

        // Text selection context menu
        chrome.contextMenus.create({
            id: 'save-text-to-flynas',
            title: 'Save text to Flynas',
            contexts: ['selection']
        });

        // Page context menu
        chrome.contextMenus.create({
            id: 'save-page-to-flynas',
            title: 'Save page to Flynas',
            contexts: ['page']
        });

        // Separator
        chrome.contextMenus.create({
            id: 'separator-1',
            type: 'separator',
            contexts: ['image', 'video', 'audio', 'link', 'selection', 'page']
        });

        // Open Flynas
        chrome.contextMenus.create({
            id: 'open-flynas',
            title: 'Open Flynas',
            contexts: ['all']
        });
    }

    async handleContextMenuClick(info, tab) {
        switch (info.menuItemId) {
            case 'upload-to-flynas':
                await this.uploadMediaToFlynas(info, tab);
                break;
            case 'save-text-to-flynas':
                await this.saveTextToFlynas(info, tab);
                break;
            case 'save-page-to-flynas':
                await this.savePageToFlynas(info, tab);
                break;
            case 'open-flynas':
                await this.openFlynasPanel(tab);
                break;
        }
    }

    async handleCommand(command) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        switch (command) {
            case 'toggle-sidebar':
                await this.toggleSidebar(tab);
                break;
            case 'quick-upload':
                await this.showQuickUpload(tab);
                break;
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'auth':
                    const authResult = await this.handleAuth(message.data);
                    sendResponse({ success: true, data: authResult });
                    break;
                    
                case 'upload':
                    const uploadResult = await this.handleUpload(message.data);
                    sendResponse({ success: true, data: uploadResult });
                    break;
                    
                case 'list-files':
                    const files = await this.listFiles(message.data);
                    sendResponse({ success: true, data: files });
                    break;
                    
                case 'download':
                    const downloadResult = await this.handleDownload(message.data);
                    sendResponse({ success: true, data: downloadResult });
                    break;
                    
                case 'get-config':
                    const config = await this.getConfig();
                    sendResponse({ success: true, data: config });
                    break;
                    
                case 'set-config':
                    await this.setConfig(message.data);
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background script error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleTabUpdate(tabId, tab) {
        // Check if we should show page action or inject content script
        if (tab.url && tab.url.startsWith('http')) {
            await this.injectDragDropHandler(tabId);
        }
    }

    async injectDragDropHandler(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['dragDrop.js']
            });
        } catch (error) {
            console.warn('Failed to inject drag drop handler:', error);
        }
    }

    async uploadMediaToFlynas(info, tab) {
        const mediaUrl = info.srcUrl || info.linkUrl;
        if (!mediaUrl) return;

        try {
            // Download the media file
            const response = await fetch(mediaUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
            // Upload to Flynas
            await this.uploadFileToFlynas({
                name: this.extractFileName(mediaUrl),
                data: arrayBuffer,
                type: blob.type
            });
            
            // Show success notification
            await this.showNotification('Upload successful', `File uploaded to Flynas`);
        } catch (error) {
            console.error('Upload failed:', error);
            await this.showNotification('Upload failed', error.message);
        }
    }

    async saveTextToFlynas(info, tab) {
        const text = info.selectionText;
        if (!text) return;

        try {
            const fileName = `selection_${Date.now()}.txt`;
            const blob = new Blob([text], { type: 'text/plain' });
            const arrayBuffer = await blob.arrayBuffer();
            
            await this.uploadFileToFlynas({
                name: fileName,
                data: arrayBuffer,
                type: 'text/plain'
            });
            
            await this.showNotification('Text saved', 'Selected text saved to Flynas');
        } catch (error) {
            console.error('Save text failed:', error);
            await this.showNotification('Save failed', error.message);
        }
    }

    async savePageToFlynas(info, tab) {
        try {
            // Get page content
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    return {
                        title: document.title,
                        url: window.location.href,
                        content: document.documentElement.outerHTML
                    };
                }
            });
            
            const pageData = result.result;
            const fileName = `${pageData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
            const blob = new Blob([pageData.content], { type: 'text/html' });
            const arrayBuffer = await blob.arrayBuffer();
            
            await this.uploadFileToFlynas({
                name: fileName,
                data: arrayBuffer,
                type: 'text/html'
            });
            
            await this.showNotification('Page saved', 'Page saved to Flynas');
        } catch (error) {
            console.error('Save page failed:', error);
            await this.showNotification('Save failed', error.message);
        }
    }

    async toggleSidebar(tab) {
        try {
            // Toggle side panel for the current window
            const window = await chrome.windows.get(tab.windowId);
            await chrome.sidePanel.setOptions({
                tabId: tab.id,
                enabled: true,
                path: 'sidebar.html'
            });
            await chrome.sidePanel.open({ tabId: tab.id });
        } catch (error) {
            console.error('Failed to toggle sidebar:', error);
        }
    }

    async showQuickUpload(tab) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    window.postMessage({ type: 'FLYNAS_SHOW_UPLOAD' }, '*');
                }
            });
        } catch (error) {
            console.error('Failed to show quick upload:', error);
        }
    }

    async openFlynasPanel(tab) {
        await this.toggleSidebar(tab);
    }

    // API Communication methods
    async handleAuth(authData) {
        // Implement authentication with Flynas server
        const config = await this.getConfig();
        const authUrl = `${config.apiUrl}/auth/login`;
        
        // Store auth token
        await chrome.storage.sync.set({ authToken: authData.token });
        return { authenticated: true };
    }

    async uploadFileToFlynas(fileData) {
        const config = await this.getConfig();
        const authToken = await this.getAuthToken();
        
        if (!authToken) {
            throw new Error('Not authenticated');
        }
        
        const formData = new FormData();
        formData.append('file', new Blob([fileData.data], { type: fileData.type }), fileData.name);
        
        const response = await fetch(`${config.apiUrl}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        return await response.json();
    }

    async listFiles(path = '/') {
        const config = await this.getConfig();
        const authToken = await this.getAuthToken();
        
        if (!authToken) {
            throw new Error('Not authenticated');
        }
        
        const response = await fetch(`${config.apiUrl}/files/list?path=${encodeURIComponent(path)}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to list files: ${response.statusText}`);
        }
        
        return await response.json();
    }

    async handleDownload(fileId) {
        const config = await this.getConfig();
        const authToken = await this.getAuthToken();
        
        if (!authToken) {
            throw new Error('Not authenticated');
        }
        
        const response = await fetch(`${config.apiUrl}/files/download/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Trigger download
        await chrome.downloads.download({
            url: url,
            filename: `flynas_${fileId}`
        });
        
        return { success: true };
    }

    // Storage methods
    async initializeStorage() {
        const defaultConfig = {
            apiUrl: 'https://api.flynas.com',
            autoSync: true,
            encryptionEnabled: true,
            notifications: true
        };
        
        const stored = await chrome.storage.sync.get(['config']);
        if (!stored.config) {
            await chrome.storage.sync.set({ config: defaultConfig });
        }
    }

    async getConfig() {
        const result = await chrome.storage.sync.get(['config']);
        return result.config || {};
    }

    async setConfig(config) {
        await chrome.storage.sync.set({ config });
    }

    async getAuthToken() {
        const result = await chrome.storage.sync.get(['authToken']);
        return result.authToken;
    }

    async checkAuthStatus() {
        const authToken = await this.getAuthToken();
        // Validate token with server if exists
        return !!authToken;
    }

    // Utility methods
    extractFileName(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
            return fileName || `file_${Date.now()}`;
        } catch {
            return `file_${Date.now()}`;
        }
    }

    async showNotification(title, message) {
        const config = await this.getConfig();
        if (!config.notifications) return;
        
        try {
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: '../../assets/icons/icon48.png',
                title,
                message
            });
        } catch (error) {
            console.warn('Failed to show notification:', error);
        }
    }

    // Heartbeat service methods
    setupHeartbeat() {
        // Listen for alarm events
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === this.heartbeatAlarm) {
                this.sendHeartbeat();
            }
        });

        // Create alarm for periodic heartbeat
        chrome.alarms.create(this.heartbeatAlarm, {
            periodInMinutes: this.heartbeatIntervalMinutes
        });

        // Send initial heartbeat
        this.sendHeartbeat();

        console.log(`Heartbeat service started (interval: ${this.heartbeatIntervalMinutes} minutes)`);
    }

    async sendHeartbeat() {
        try {
            const authToken = await this.getAuthToken();
            if (!authToken) {
                return; // Not authenticated
            }

            // Get storage quota info
            let storageInfo = { total: 0, available: 0 };
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                storageInfo.total = estimate.quota || 0;
                storageInfo.available = (estimate.quota || 0) - (estimate.usage || 0);
            }

            const heartbeatData = {
                deviceId: null, // Will be set by server based on device registration
                status: 'online',
                capacity: storageInfo.total,
                available: storageInfo.available,
                lastSeen: new Date().toISOString()
            };

            const config = await this.getConfig();
            const apiUrl = config.apiUrl || 'http://localhost:3000';

            const response = await fetch(`${apiUrl}/api/raid/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(heartbeatData)
            });

            if (response.ok) {
                console.log('Heartbeat sent successfully');
            } else {
                console.warn('Failed to send heartbeat:', response.status);
            }
        } catch (error) {
            console.error('Error sending heartbeat:', error);
        }
    }

    stopHeartbeat() {
        chrome.alarms.clear(this.heartbeatAlarm);
        console.log('Heartbeat service stopped');
    }
}

// Initialize background script
const flynasBackground = new FlynasBackground();