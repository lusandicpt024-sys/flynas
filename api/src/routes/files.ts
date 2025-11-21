import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

interface FileRecord {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  is_encrypted: boolean;
  is_synced: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req as AuthRequest).user?.userId;
    const userDir = path.join(UPLOAD_DIR, userId || 'temp');
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
  }
});

// Upload file
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileId = uuidv4();
      const userId = req.user!.userId;
      const isEncrypted = req.body.isEncrypted === 'true';

      await db.run(
        `INSERT INTO files (id, user_id, filename, original_name, file_path, file_size, mime_type, is_encrypted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          userId,
          req.file.filename,
          req.file.originalname,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          isEncrypted ? 1 : 0
        ]
      );

      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          id: fileId,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          isEncrypted
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// List user's files
router.get(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const files = await db.all<FileRecord>(
        `SELECT id, filename, original_name, file_size, mime_type, is_encrypted, is_synced, created_at, updated_at
         FROM files WHERE user_id = ? ORDER BY updated_at DESC`,
        [userId]
      );

      res.json({
        files: files.map(file => ({
          id: file.id,
          name: file.original_name,
          size: file.file_size,
          mimeType: file.mime_type,
          isEncrypted: Boolean(file.is_encrypted),
          isSynced: Boolean(file.is_synced),
          createdAt: file.created_at,
          updatedAt: file.updated_at
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

// Download file
router.get(
  '/:fileId',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;
      const userId = req.user!.userId;

      const file = await db.get<FileRecord>(
        'SELECT * FROM files WHERE id = ? AND user_id = ?',
        [fileId, userId]
      );

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (!fs.existsSync(file.file_path)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      
      const fileStream = fs.createReadStream(file.file_path);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Delete file
router.delete(
  '/:fileId',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;
      const userId = req.user!.userId;

      const file = await db.get<FileRecord>(
        'SELECT * FROM files WHERE id = ? AND user_id = ?',
        [fileId, userId]
      );

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete file from filesystem
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      // Delete from database
      await db.run('DELETE FROM files WHERE id = ?', [fileId]);

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Sync endpoint - get changes since timestamp
router.get(
  '/sync/changes',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const since = req.query.since as string || '1970-01-01';

      const files = await db.all<FileRecord>(
        `SELECT id, filename, original_name, file_size, mime_type, is_encrypted, is_synced, created_at, updated_at
         FROM files WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC`,
        [userId, since]
      );

      res.json({
        timestamp: new Date().toISOString(),
        changes: files.map(file => ({
          id: file.id,
          name: file.original_name,
          size: file.file_size,
          mimeType: file.mime_type,
          isEncrypted: Boolean(file.is_encrypted),
          isSynced: Boolean(file.is_synced),
          createdAt: file.created_at,
          updatedAt: file.updated_at
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
