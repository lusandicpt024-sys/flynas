import * as crypto from 'crypto';

/**
 * AES-256 GCM encryption utilities for API backend
 * Compatible with Android/Desktop implementations
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH_BITS = 256;
const PBKDF2_ITERATIONS = 100_000;
const GCM_TAG_LENGTH = 16;

/**
 * Derives a key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BITS / 8, 'sha256');
}

/**
 * Encrypts data using AES-256-GCM
 * Returns: [salt][iv][ciphertext + tag]
 */
export function encryptData(plaintext: Buffer, password: string): Buffer {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(password, salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, encrypted, tag]);
}

/**
 * Decrypts data encrypted with encryptData
 */
export function decryptData(ciphertext: Buffer, password: string): Buffer | null {
    try {
        const salt = ciphertext.subarray(0, SALT_LENGTH);
        const iv = ciphertext.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const encrypted = ciphertext.subarray(SALT_LENGTH + IV_LENGTH, -GCM_TAG_LENGTH);
        const tag = ciphertext.subarray(-GCM_TAG_LENGTH);

        const key = deriveKey(password, salt);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

/**
 * Encrypts a file stream
 */
export async function encryptFile(
    inputPath: string,
    outputPath: string,
    password: string
): Promise<boolean> {
    const fs = require('fs').promises;
    try {
        const plaintext = await fs.readFile(inputPath);
        const encrypted = encryptData(plaintext, password);
        await fs.writeFile(outputPath, encrypted);
        return true;
    } catch (error) {
        console.error('File encryption failed:', error);
        return false;
    }
}

/**
 * Decrypts a file stream
 */
export async function decryptFile(
    inputPath: string,
    outputPath: string,
    password: string
): Promise<boolean> {
    const fs = require('fs').promises;
    try {
        const ciphertext = await fs.readFile(inputPath);
        const decrypted = decryptData(ciphertext, password);
        if (!decrypted) return false;
        await fs.writeFile(outputPath, decrypted);
        return true;
    } catch (error) {
        console.error('File decryption failed:', error);
        return false;
    }
}
