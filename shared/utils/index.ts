/**
 * Common utilities for Flynas application
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Configuration interface
 */
export interface FlynasConfig {
  apiBaseUrl: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  encryptionEnabled: boolean;
  auth: {
    clientId: string;
    redirectUri: string;
    scope: string[];
  };
  storage: {
    defaultPath: string;
    maxDevices: number;
  };
  network: {
    port: number;
    host: string;
    useHttps: boolean;
  };
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Simple logger implementation
 */
export class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(prefix: string = 'Flynas') {
    this.prefix = prefix;
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[${this.prefix}] DEBUG: ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[${this.prefix}] INFO: ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] WARN: ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] ERROR: ${message}`, ...args);
  }
}

/**
 * Utility functions
 */
export class Utils {
  /**
   * Format file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate unique ID
   */
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: any;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (typeof obj === 'object') {
      const clonedObj = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  /**
   * Check if string is valid JSON
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize filename for cross-platform compatibility
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * Extract file extension
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file type is supported
   */
  static isFileTypeSupported(filename: string, allowedTypes: string[]): boolean {
    const extension = this.getFileExtension(filename);
    return allowedTypes.includes(extension);
  }

  /**
   * Convert bytes to hex string
   */
  static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to bytes
   */
  static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * Calculate progress percentage
   */
  static calculateProgress(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  }

  /**
   * Format time duration
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get relative time string
   */
  static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Validate email address
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create error response
   */
  static createErrorResponse(message: string, error?: any): ApiResponse {
    return {
      success: false,
      error: message,
      data: error
    };
  }

  /**
   * Create success response
   */
  static createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Check if running in browser environment
   */
  static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * Check if running in Node.js environment
   */
  static isNode(): boolean {
    try {
      return typeof (globalThis as any).process !== 'undefined' && 
             (globalThis as any).process.versions && 
             (globalThis as any).process.versions.node;
    } catch {
      return false;
    }
  }

  /**
   * Get platform type
   */
  static getPlatform(): 'browser' | 'node' | 'unknown' {
    if (this.isBrowser()) return 'browser';
    if (this.isNode()) return 'node';
    return 'unknown';
  }

  /**
   * Safe JSON parse
   */
  static safeJsonParse<T>(json: string, defaultValue: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Safe JSON stringify
   */
  static safeJsonStringify(obj: any, defaultValue: string = '{}'): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return defaultValue;
    }
  }
}

/**
 * Environment configuration manager
 */
export class Config {
  private config: Partial<FlynasConfig> = {};

  constructor(initialConfig?: Partial<FlynasConfig>) {
    if (initialConfig) {
      this.config = Utils.deepClone(initialConfig);
    }
  }

  get<K extends keyof FlynasConfig>(key: K): FlynasConfig[K] | undefined {
    return this.config[key];
  }

  set<K extends keyof FlynasConfig>(key: K, value: FlynasConfig[K]): void {
    this.config[key] = value;
  }

  merge(config: Partial<FlynasConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getAll(): Partial<FlynasConfig> {
    return Utils.deepClone(this.config);
  }

  reset(): void {
    this.config = {};
  }
}