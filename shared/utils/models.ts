/**
 * User Model - Represents a Flynas user with authentication and device linking
 */

export interface User {
  userId: string;
  username: string;
  email: string;
  signInAppId: string;
  linkedDevices: string[];
  linkedUsers: string[];
  permissions: UserPermissions;
  createdAt: Date;
  lastLogin?: Date;
}

export interface UserPermissions {
  canView: boolean;
  canDownload: boolean;
  canUpload: boolean;
  canShare: boolean;
  canCreateFolders: boolean;
}

export interface Device {
  deviceId: string;
  deviceType: 'linux' | 'windows' | 'android' | 'browser';
  deviceName: string;
  storagePath: string;
  availableSpace: number;
  totalSpace: number;
  connected: boolean;
  lastSeen: Date;
  owner: string; // userId
}

export interface Folder {
  folderId: string;
  ownerId: string;
  deviceId: string;
  folderName: string;
  path: string;
  parentFolderId?: string;
  sharedWith: SharedUser[];
  createdAt: Date;
  modifiedAt: Date;
  files: string[]; // fileIds
  subfolders: string[]; // folderIds
  isPublic: boolean;
}

export interface SharedUser {
  userId: string;
  permissions: UserPermissions;
  sharedAt: Date;
}

export interface File {
  fileId: string;
  folderId: string;
  fileName: string;
  fileType: 'image' | 'video' | 'document' | 'audio' | 'archive' | 'other';
  mimeType: string;
  size: number;
  path: string;
  isDownloaded: boolean;
  previewAvailable: boolean;
  thumbnailUrl?: string;
  createdAt: Date;
  modifiedAt: Date;
  checksum?: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  author?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  totalSize: number;
  uploadedSize: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface DownloadProgress {
  fileId: string;
  fileName: string;
  totalSize: number;
  downloadedSize: number;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}