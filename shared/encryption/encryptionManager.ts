/**
 * Encryption module for secure file transfer and storage
 */

export interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'AES-CBC';
  keyLength: 128 | 192 | 256;
  ivLength: number;
}

export interface EncryptedData {
  data: Uint8Array;
  iv: Uint8Array;
  authTag?: Uint8Array;
  salt?: Uint8Array;
}

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export class EncryptionManager {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig = {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12
  }) {
    this.config = config;
  }

  /**
   * Generate a random encryption key
   */
  async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.config.algorithm,
        length: this.config.keyLength,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate key pair for asymmetric encryption
   */
  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Derive key from password using PBKDF2
   */
  async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.config.algorithm, length: this.config.keyLength },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using symmetric encryption
   */
  async encryptData(data: Uint8Array, key: CryptoKey): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.config.algorithm,
        iv: iv,
      },
      key,
      data
    );

    const result: EncryptedData = {
      data: new Uint8Array(encryptedData),
      iv: iv,
    };

    // For AES-GCM, the authentication tag is included in the encrypted data
    if (this.config.algorithm === 'AES-GCM') {
      // The last 16 bytes are the authentication tag
      const dataLength = result.data.length - 16;
      result.authTag = result.data.slice(dataLength);
      result.data = result.data.slice(0, dataLength);
    }

    return result;
  }

  /**
   * Decrypt data using symmetric encryption
   */
  async decryptData(encryptedData: EncryptedData, key: CryptoKey): Promise<Uint8Array> {
    let dataToDecrypt = encryptedData.data;

    // For AES-GCM, append the authentication tag
    if (this.config.algorithm === 'AES-GCM' && encryptedData.authTag) {
      const combined = new Uint8Array(encryptedData.data.length + encryptedData.authTag.length);
      combined.set(encryptedData.data);
      combined.set(encryptedData.authTag, encryptedData.data.length);
      dataToDecrypt = combined;
    }

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: this.config.algorithm,
        iv: encryptedData.iv,
      },
      key,
      dataToDecrypt
    );

    return new Uint8Array(decryptedData);
  }

  /**
   * Encrypt data with RSA public key
   */
  async encryptWithPublicKey(data: Uint8Array, publicKey: CryptoKey): Promise<Uint8Array> {
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      data
    );

    return new Uint8Array(encryptedData);
  }

  /**
   * Decrypt data with RSA private key
   */
  async decryptWithPrivateKey(encryptedData: Uint8Array, privateKey: CryptoKey): Promise<Uint8Array> {
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedData
    );

    return new Uint8Array(decryptedData);
  }

  /**
   * Generate random salt
   */
  generateSalt(length: number = 16): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Calculate hash of data
   */
  async calculateHash(data: Uint8Array, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Export key to raw format
   */
  async exportKey(key: CryptoKey): Promise<Uint8Array> {
    const keyData = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(keyData);
  }

  /**
   * Import key from raw format
   */
  async importKey(keyData: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.config.algorithm },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export public key to SPKI format
   */
  async exportPublicKey(publicKey: CryptoKey): Promise<Uint8Array> {
    const keyData = await crypto.subtle.exportKey('spki', publicKey);
    return new Uint8Array(keyData);
  }

  /**
   * Import public key from SPKI format
   */
  async importPublicKey(keyData: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt']
    );
  }

  /**
   * Export private key to PKCS8 format
   */
  async exportPrivateKey(privateKey: CryptoKey): Promise<Uint8Array> {
    const keyData = await crypto.subtle.exportKey('pkcs8', privateKey);
    return new Uint8Array(keyData);
  }

  /**
   * Import private key from PKCS8 format
   */
  async importPrivateKey(keyData: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt']
    );
  }

  /**
   * Create digital signature
   */
  async sign(data: Uint8Array, privateKey: CryptoKey): Promise<Uint8Array> {
    const signature = await crypto.subtle.sign(
      'RSA-PSS',
      privateKey,
      data
    );

    return new Uint8Array(signature);
  }

  /**
   * Verify digital signature
   */
  async verify(data: Uint8Array, signature: Uint8Array, publicKey: CryptoKey): Promise<boolean> {
    return await crypto.subtle.verify(
      'RSA-PSS',
      publicKey,
      signature,
      data
    );
  }

  /**
   * Encrypt file with password
   */
  async encryptFileWithPassword(fileData: Uint8Array, password: string): Promise<EncryptedData> {
    const salt = this.generateSalt();
    const key = await this.deriveKeyFromPassword(password, salt);
    const encrypted = await this.encryptData(fileData, key);
    
    encrypted.salt = salt;
    return encrypted;
  }

  /**
   * Decrypt file with password
   */
  async decryptFileWithPassword(encryptedData: EncryptedData, password: string): Promise<Uint8Array> {
    if (!encryptedData.salt) {
      throw new Error('Salt is required for password-based decryption');
    }

    const key = await this.deriveKeyFromPassword(password, encryptedData.salt);
    return await this.decryptData(encryptedData, key);
  }
}

/**
 * Secure random string generator
 */
export function generateSecureToken(length: number = 32): string {
  const array = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert Uint8Array to base64
 */
export function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

/**
 * Convert base64 to Uint8Array
 */
export function base64ToArray(base64: string): Uint8Array {
  return new Uint8Array(atob(base64).split('').map(char => char.charCodeAt(0)));
}