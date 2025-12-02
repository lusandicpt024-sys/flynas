/**
 * File Manager - Core file and folder operations
 */

import { Device, Folder, File, FileMetadata, UploadProgress, DownloadProgress } from '../utils/models.js';

export interface FileSystemAdapter {
  listDirectory(path: string): Promise<FileInfo[]>;
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  deleteFile(path: string): Promise<void>;
  getFileStats(path: string): Promise<FileStats>;
  watchDirectory(path: string, callback: (event: string, filename: string) => void): void;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: Date;
  createdAt: Date;
}

export interface FileStats {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  modifiedAt: Date;
  createdAt: Date;
  mode: number;
}

// Simple EventEmitter implementation for cross-platform compatibility
export class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

export class FileManager extends EventEmitter {
  private adapter: FileSystemAdapter;
  private currentDevice: Device;
  private indexedFolders: Map<string, Folder> = new Map();
  private indexedFiles: Map<string, File> = new Map();

  constructor(adapter: FileSystemAdapter, device: Device) {
    super();
    this.adapter = adapter;
    this.currentDevice = device;
  }

  /**
   * Initialize file manager and index storage device
   */
  async initialize(): Promise<void> {
    try {
      await this.indexStorageDevice();
      this.emit('initialized', this.currentDevice);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(parentPath: string, folderName: string, ownerId: string): Promise<Folder> {
    const folderPath = this.joinPaths(parentPath, folderName);
    
    try {
      await this.adapter.createDirectory(folderPath);
      
      const folder: Folder = {
        folderId: this.generateId(),
        ownerId,
        deviceId: this.currentDevice.deviceId,
        folderName,
        path: folderPath,
        parentFolderId: this.findParentFolderId(parentPath),
        sharedWith: [],
        createdAt: new Date(),
        modifiedAt: new Date(),
        files: [],
        subfolders: [],
        isPublic: false
      };

      this.indexedFolders.set(folder.folderId, folder);
      this.emit('folderCreated', folder);
      
      return folder;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * List files and folders in a directory
   */
  async listDirectory(path: string): Promise<{ folders: Folder[], files: File[] }> {
    try {
      const items = await this.adapter.listDirectory(path);
      const folders: Folder[] = [];
      const files: File[] = [];

      for (const item of items) {
        if (item.isDirectory) {
          const folder = this.findFolderByPath(item.path) || await this.indexFolder(item);
          folders.push(folder);
        } else {
          const file = this.findFileByPath(item.path) || await this.indexFile(item);
          files.push(file);
        }
      }

      return { folders, files };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Upload a file to the storage device
   */
  async uploadFile(
    targetFolderPath: string, 
    fileName: string, 
    fileData: Uint8Array,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<File> {
    const filePath = this.joinPaths(targetFolderPath, fileName);
    const fileId = this.generateId();
    
    const progress: UploadProgress = {
      fileId,
      fileName,
      totalSize: fileData.length,
      uploadedSize: 0,
      progress: 0,
      status: 'pending'
    };

    try {
      progress.status = 'uploading';
      onProgress?.(progress);

      // Simulate chunked upload for large files
      const chunkSize = 64 * 1024; // 64KB chunks
      let uploadedBytes = 0;

      for (let i = 0; i < fileData.length; i += chunkSize) {
        const chunk = fileData.slice(i, i + chunkSize);
        // In a real implementation, this would be chunked upload
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate network delay
        
        uploadedBytes += chunk.length;
        progress.uploadedSize = uploadedBytes;
        progress.progress = (uploadedBytes / fileData.length) * 100;
        onProgress?.(progress);
      }

      await this.adapter.writeFile(filePath, fileData);

      const stats = await this.adapter.getFileStats(filePath);
      const file: File = {
        fileId,
        folderId: this.findFolderIdByPath(targetFolderPath) || '',
        fileName,
        fileType: this.getFileType(fileName),
        mimeType: this.getMimeType(fileName),
        size: stats.size,
        path: filePath,
        isDownloaded: true,
        previewAvailable: this.canPreview(fileName),
        createdAt: stats.createdAt,
        modifiedAt: stats.modifiedAt,
        checksum: await this.calculateChecksum(fileData),
        metadata: await this.extractMetadata(filePath, fileData)
      };

      this.indexedFiles.set(fileId, file);
      progress.status = 'completed';
      progress.progress = 100;
      onProgress?.(progress);

      this.emit('fileUploaded', file);
      return file;

    } catch (error) {
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'Upload failed';
      onProgress?.(progress);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Download a file from the storage device
   */
  async downloadFile(
    fileId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<Uint8Array> {
    const file = this.indexedFiles.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const progress: DownloadProgress = {
      fileId,
      fileName: file.fileName,
      totalSize: file.size,
      downloadedSize: 0,
      progress: 0,
      status: 'pending'
    };

    try {
      progress.status = 'downloading';
      onProgress?.(progress);

      // Simulate chunked download for large files
      const data = await this.adapter.readFile(file.path);
      
      // Simulate progressive download
      const chunkSize = 64 * 1024;
      let downloadedBytes = 0;

      for (let i = 0; i < data.length; i += chunkSize) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate network delay
        
        downloadedBytes += Math.min(chunkSize, data.length - i);
        progress.downloadedSize = downloadedBytes;
        progress.progress = (downloadedBytes / data.length) * 100;
        onProgress?.(progress);
      }

      // Mark file as downloaded
      file.isDownloaded = true;
      this.indexedFiles.set(fileId, file);

      progress.status = 'completed';
      progress.progress = 100;
      onProgress?.(progress);

      this.emit('fileDownloaded', file);
      return data;

    } catch (error) {
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'Download failed';
      onProgress?.(progress);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = this.indexedFiles.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    try {
      await this.adapter.deleteFile(file.path);
      this.indexedFiles.delete(fileId);
      this.emit('fileDeleted', file);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Delete a folder and all its contents
   */
  async deleteFolder(folderId: string): Promise<void> {
    const folder = this.indexedFolders.get(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    try {
      // Delete all files in the folder
      for (const fileId of folder.files) {
        await this.deleteFile(fileId);
      }

      // Recursively delete subfolders
      for (const subfolderId of folder.subfolders) {
        await this.deleteFolder(subfolderId);
      }

      await this.adapter.deleteDirectory(folder.path);
      this.indexedFolders.delete(folderId);
      this.emit('folderDeleted', folder);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get folder by ID
   */
  getFolder(folderId: string): Folder | undefined {
    return this.indexedFolders.get(folderId);
  }

  /**
   * Get file by ID
   */
  getFile(fileId: string): File | undefined {
    return this.indexedFiles.get(fileId);
  }

  /**
   * Search files by name or type
   */
  searchFiles(query: string, fileType?: string): File[] {
    const results: File[] = [];
    const queryLower = query.toLowerCase();

    for (const file of this.indexedFiles.values()) {
      const matchesName = file.fileName.toLowerCase().includes(queryLower);
      const matchesType = !fileType || file.fileType === fileType;

      if (matchesName && matchesType) {
        results.push(file);
      }
    }

    return results;
  }

  /**
   * Get storage device statistics
   */
  async getStorageStats(): Promise<{ totalSpace: number; availableSpace: number; usedSpace: number }> {
    // This would typically call platform-specific APIs
    return {
      totalSpace: this.currentDevice.totalSpace,
      availableSpace: this.currentDevice.availableSpace,
      usedSpace: this.currentDevice.totalSpace - this.currentDevice.availableSpace
    };
  }

  /**
   * Index the entire storage device
   */
  private async indexStorageDevice(): Promise<void> {
    await this.indexDirectoryRecursive(this.currentDevice.storagePath);
  }

  /**
   * Recursively index a directory
   */
  private async indexDirectoryRecursive(path: string): Promise<void> {
    try {
      const items = await this.adapter.listDirectory(path);

      for (const item of items) {
        if (item.isDirectory) {
          await this.indexFolder(item);
          await this.indexDirectoryRecursive(item.path);
        } else {
          await this.indexFile(item);
        }
      }
    } catch (error) {
      // Log error but continue indexing
      console.warn(`Failed to index directory ${path}:`, error);
    }
  }

  /**
   * Index a folder
   */
  private async indexFolder(item: FileInfo): Promise<Folder> {
    const folder: Folder = {
      folderId: this.generateId(),
      ownerId: this.currentDevice.owner,
      deviceId: this.currentDevice.deviceId,
      folderName: item.name,
      path: item.path,
      parentFolderId: this.findParentFolderId(item.path),
      sharedWith: [],
      createdAt: item.createdAt,
      modifiedAt: item.modifiedAt,
      files: [],
      subfolders: [],
      isPublic: false
    };

    this.indexedFolders.set(folder.folderId, folder);
    return folder;
  }

  /**
   * Index a file
   */
  private async indexFile(item: FileInfo): Promise<File> {
    const file: File = {
      fileId: this.generateId(),
      folderId: this.findFolderIdByPath(this.getDirectoryPath(item.path)) || '',
      fileName: item.name,
      fileType: this.getFileType(item.name),
      mimeType: this.getMimeType(item.name),
      size: item.size,
      path: item.path,
      isDownloaded: false,
      previewAvailable: this.canPreview(item.name),
      createdAt: item.createdAt,
      modifiedAt: item.modifiedAt
    };

    this.indexedFiles.set(file.fileId, file);
    return file;
  }

  /**
   * Helper methods
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private joinPaths(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/');
  }

  private getDirectoryPath(filePath: string): string {
    return filePath.substring(0, filePath.lastIndexOf('/'));
  }

  private normalizePath(path: string): string {
    // Normalize path separators to forward slashes for consistent comparison
    return path.replace(/\\/g, '/').replace(/\/+/g, '/');
  }

  private findFolderByPath(path: string): Folder | undefined {
    const normalizedPath = this.normalizePath(path);
    for (const folder of this.indexedFolders.values()) {
      if (this.normalizePath(folder.path) === normalizedPath) {
        return folder;
      }
    }
    return undefined;
  }

  private findFileByPath(path: string): File | undefined {
    const normalizedPath = this.normalizePath(path);
    for (const file of this.indexedFiles.values()) {
      if (this.normalizePath(file.path) === normalizedPath) {
        return file;
      }
    }
    return undefined;
  }

  private findParentFolderId(path: string): string | undefined {
    const parentPath = this.getDirectoryPath(path);
    return this.findFolderIdByPath(parentPath);
  }

  private findFolderIdByPath(path: string): string | undefined {
    for (const [id, folder] of this.indexedFolders.entries()) {
      if (folder.path === path) {
        return id;
      }
    }
    return undefined;
  }

  private getFileType(fileName: string): File['fileType'] {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
      return 'image';
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
      return 'video';
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
      return 'document';
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
      return 'audio';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
      return 'archive';
    }
    
    return 'other';
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'zip': 'application/zip'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private canPreview(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt'].includes(ext);
  }

  private async calculateChecksum(data: Uint8Array): Promise<string> {
    // This would use crypto.createHash in Node.js or Web Crypto API in browser
    return 'sha256-placeholder'; // Placeholder implementation
  }

  private async extractMetadata(filePath: string, data: Uint8Array): Promise<FileMetadata | undefined> {
    // This would extract metadata based on file type
    // For now, return undefined as placeholder
    return undefined;
  }
}