import { Router, Request, Response } from 'express';
import { encryptFile, decryptFile, encryptData, decryptData } from '../utils/encryption';
import * as path from 'path';
import * as fs from 'fs/promises';

const router = Router();

/**
 * POST /api/encryption/encrypt-file
 * Encrypts an uploaded file
 */
router.post('/encrypt-file', async (req: Request, res: Response) => {
    try {
        const { fileId, password } = req.body;
        
        if (!fileId || !password) {
            return res.status(400).json({ error: 'Missing fileId or password' });
        }

        const inputPath = path.join(__dirname, '../../uploads', fileId);
        const outputPath = path.join(__dirname, '../../uploads', `${fileId}.enc`);

        const success = await encryptFile(inputPath, outputPath, password);

        if (success) {
            // Delete original file after encryption
            await fs.unlink(inputPath);
            res.json({ 
                success: true, 
                encryptedFileId: `${fileId}.enc`,
                message: 'File encrypted successfully'
            });
        } else {
            res.status(500).json({ error: 'Encryption failed' });
        }
    } catch (error) {
        console.error('Encrypt file error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/encryption/decrypt-file
 * Decrypts an encrypted file
 */
router.post('/decrypt-file', async (req: Request, res: Response) => {
    try {
        const { fileId, password } = req.body;
        
        if (!fileId || !password) {
            return res.status(400).json({ error: 'Missing fileId or password' });
        }

        const inputPath = path.join(__dirname, '../../uploads', fileId);
        const outputFileName = fileId.endsWith('.enc') ? fileId.slice(0, -4) : `${fileId}.dec`;
        const outputPath = path.join(__dirname, '../../uploads', outputFileName);

        const success = await decryptFile(inputPath, outputPath, password);

        if (success) {
            res.json({ 
                success: true, 
                decryptedFileId: outputFileName,
                message: 'File decrypted successfully'
            });
        } else {
            res.status(401).json({ error: 'Decryption failed - invalid password or corrupted file' });
        }
    } catch (error) {
        console.error('Decrypt file error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/encryption/encrypt-text
 * Encrypts text data
 */
router.post('/encrypt-text', async (req: Request, res: Response) => {
    try {
        const { text, password } = req.body;
        
        if (!text || !password) {
            return res.status(400).json({ error: 'Missing text or password' });
        }

        const plaintext = Buffer.from(text, 'utf8');
        const encrypted = encryptData(plaintext, password);
        const base64 = encrypted.toString('base64');

        res.json({ 
            success: true, 
            encrypted: base64 
        });
    } catch (error) {
        console.error('Encrypt text error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/encryption/decrypt-text
 * Decrypts text data
 */
router.post('/decrypt-text', async (req: Request, res: Response) => {
    try {
        const { encrypted, password } = req.body;
        
        if (!encrypted || !password) {
            return res.status(400).json({ error: 'Missing encrypted text or password' });
        }

        const ciphertext = Buffer.from(encrypted, 'base64');
        const decrypted = decryptData(ciphertext, password);

        if (decrypted) {
            const text = decrypted.toString('utf8');
            res.json({ 
                success: true, 
                text 
            });
        } else {
            res.status(401).json({ error: 'Decryption failed - invalid password' });
        }
    } catch (error) {
        console.error('Decrypt text error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
