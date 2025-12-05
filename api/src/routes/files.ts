import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { authenticateToken } from '../middleware/auth';
import { splitFileIntoChunks, calculateParity, selectDevicesForDistribution, calculateChunkHash } from '../utils/raid';

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

      // Insert file record
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

      // Check if user has RAID configured
      const raidConfig = await db.get<any>(
        'SELECT * FROM raid_config WHERE user_id = ? AND active = 1',
        [userId]
      );

      let chunkInfo = null;

      if (raidConfig) {
        try {
          // Read file data
          const fileData = fs.readFileSync(req.file.path);

          // Split into chunks
          const chunks = splitFileIntoChunks(fileData, raidConfig.chunk_size);

          // Get available devices
          const devices = await db.all<any>(
            `SELECT dr.* FROM device_registry dr
             JOIN raid_devices rd ON dr.device_id = rd.device_id
             WHERE rd.config_id = ? AND dr.status = 'online'`,
            [raidConfig.config_id]
          );

          if (devices.length >= raidConfig.min_devices) {
            // Select devices for distribution
            const distribution = selectDevicesForDistribution(
              devices,
              raidConfig.raid_level,
              chunks.length
            );

            // Store chunk metadata
            const chunkIds = [];
            for (let i = 0; i < chunks.length; i++) {
              const chunkId = uuidv4();
              const chunkHash = calculateChunkHash(chunks[i]);

              await db.run(
                `INSERT INTO file_chunks (chunk_id, file_id, chunk_index, chunk_size, chunk_hash, is_parity)
                 VALUES (?, ?, ?, ?, ?, 0)`,
                [chunkId, fileId, i, chunks[i].length, chunkHash]
              );

              // Store chunk locations
              const deviceIds = distribution.get(i) || [];
              for (const deviceId of deviceIds) {
                const locationId = uuidv4();
                await db.run(
                  `INSERT INTO chunk_locations (id, chunk_id, device_id, storage_path, status)
                   VALUES (?, ?, ?, ?, 'pending')`,
                  [locationId, chunkId, deviceId, '']
                );
              }

              chunkIds.push(chunkId);
            }

            // For RAID 5, calculate and store parity chunks
            if (raidConfig.raid_level === '5' && chunks.length >= 2) {
              const parityChunk = calculateParity(chunks);
              const parityChunkId = uuidv4();
              const parityHash = calculateChunkHash(parityChunk);

              await db.run(
                `INSERT INTO file_chunks (chunk_id, file_id, chunk_index, chunk_size, chunk_hash, is_parity)
                 VALUES (?, ?, ?, ?, ?, 1)`,
                [parityChunkId, fileId, chunks.length, parityChunk.length, parityHash]
              );

              // Distribute parity chunk
              const parityDeviceIds = distribution.get(chunks.length) || [devices[0].device_id];
              for (const deviceId of parityDeviceIds) {
                const locationId = uuidv4();
                await db.run(
                  `INSERT INTO chunk_locations (id, chunk_id, device_id, storage_path, status)
                   VALUES (?, ?, ?, ?, 'pending')`,
                  [locationId, parityChunkId, deviceId, '']
                );
              }

              chunkIds.push(parityChunkId);
            }

            chunkInfo = {
              raid_enabled: true,
              raid_level: raidConfig.raid_level,
              total_chunks: chunks.length,
              parity_chunks: raidConfig.raid_level === '5' ? 1 : 0,
              chunk_ids: chunkIds,
              distribution: Array.from(distribution.entries()).map(([index, deviceIds]) => ({
                chunk_index: index,
                devices: deviceIds
              }))
            };
          }
        } catch (error) {
          console.error('RAID chunking error:', error);
          // Continue without RAID if there's an error
        }
      }

      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          id: fileId,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          isEncrypted
        },
        raid: chunkInfo
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

      // Delete chunks (this will cascade to chunk_locations via foreign key)
      await db.run('DELETE FROM file_chunks WHERE file_id = ?', [fileId]);

      // Delete from database
      await db.run('DELETE FROM files WHERE id = ?', [fileId]);

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Create a new folder
router.post(
  '/folders',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { folderName, parentPath } = req.body;

      if (!folderName || typeof folderName !== 'string') {
        return res.status(400).json({ error: 'folderName is required and must be a string' });
      }

      // Validate folder name (no slashes or special characters)
      if (folderName.includes('/') || folderName.includes('\\') || folderName.length === 0) {
        return res.status(400).json({ error: 'Invalid folder name' });
      }

      // Construct full path
      const fullPath = parentPath ? `${parentPath}/${folderName}` : `/${folderName}`;

      // Check if folder already exists
      const existing = await db.get<any>(
        'SELECT id FROM folders WHERE user_id = ? AND path = ?',
        [userId, fullPath]
      );

      if (existing) {
        return res.status(409).json({ error: 'Folder already exists' });
      }

      // Find parent folder ID
      let parentId = null;
      if (parentPath && parentPath !== '/') {
        const parentFolder = await db.get<any>(
          'SELECT id FROM folders WHERE user_id = ? AND path = ?',
          [userId, parentPath]
        );
        parentId = parentFolder?.id || null;
      }

      // Create folder record
      const folderId = uuidv4();
      await db.run(
        `INSERT INTO folders (id, user_id, folder_name, parent_id, path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [folderId, userId, folderName, parentId, fullPath]
      );

      res.status(201).json({
        success: true,
        folder: {
          id: folderId,
          name: folderName,
          path: fullPath,
          parentId: parentId,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// List folders for current path
router.get(
  '/folders',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const currentPath = req.query.path as string || '/';

      const folders = await db.all<any>(
        `SELECT id, folder_name, path, created_at FROM folders 
         WHERE user_id = ? AND (path LIKE ? OR parent_id = (SELECT id FROM folders WHERE user_id = ? AND path = ?))
         ORDER BY folder_name ASC`,
        [userId, `${currentPath}/%`, userId, currentPath]
      );

      res.json({
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.folder_name,
          path: folder.path,
          createdAt: folder.created_at
        }))
      });
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
