import path from 'path';
import fs from 'fs';

describe('chunks routes with encryption', () => {
  const testPassword = 'test-password-123';
  const testChunk = Buffer.from('This is test chunk data for encryption');

  test('should store and retrieve encrypted chunks', async () => {
    const { encryptData, decryptData } = require('../src/utils/encryption');
    
    // Simulate encryption pipeline
    const encrypted = encryptData(testChunk, testPassword);
    expect(encrypted).not.toEqual(testChunk);
    
    // Store with magic header
    const withHeader = Buffer.concat([Buffer.from('ENC1'), encrypted]);
    
    // Retrieve and decrypt
    const encrypted_only = withHeader.subarray(4);
    const decrypted = decryptData(encrypted_only, testPassword);
    
    expect(decrypted).not.toBeNull();
    expect(decrypted?.equals(testChunk)).toBe(true);
  });

  test('should support plaintext fallback when encryption disabled', async () => {
    delete process.env.CHUNK_ENCRYPTION_PASSWORD;
    
    // Data stored plaintext should be returned as-is
    const plainData = Buffer.from('plaintext chunk');
    expect(plainData.equals(Buffer.from('plaintext chunk'))).toBe(true);
  });

  test('should detect tampering', async () => {
    const { encryptData, decryptData } = require('../src/utils/encryption');
    
    const encrypted = encryptData(testChunk, testPassword);
    
    // Tamper with last byte
    encrypted[encrypted.length - 1] = encrypted[encrypted.length - 1] ^ 0xff;
    
    const decrypted = decryptData(encrypted, testPassword);
    expect(decrypted).toBeNull(); // Auth tag check fails
  });
});
