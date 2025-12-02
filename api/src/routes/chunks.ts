import { Router, Request, Response } from 'express';
import { Database } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { calculateChunkHash, verifyChunkIntegrity } from '../utils/raid';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();
const db = new Database();

const CHUNKS_DIR = process.env.CHUNKS_DIR || './data/chunks';

// Ensure chunks directory exists
fs.mkdir(CHUNKS_DIR, { recursive: true }).catch(console.error);

// Upload a chunk to this device
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { chunk_id, file_id, chunk_index, device_id } = req.body;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!chunk_id || !file_id || chunk_index === undefined || !device_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: chunk_id, file_id, chunk_index, device_id' 
      });
    }

    // Verify device belongs to user
    const device = await db.get<any>(
      'SELECT * FROM device_registry WHERE device_id = ? AND user_id = ?',
      [device_id, user_id]
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get chunk data from request
    const chunkData = (req as any).files?.chunk;
    if (!chunkData) {
      return res.status(400).json({ error: 'No chunk data provided' });
    }

    // Calculate hash
    const hash = calculateChunkHash(chunkData.data);

    // Get or create chunk record
    let chunk = await db.get<any>(
      'SELECT * FROM file_chunks WHERE chunk_id = ?',
      [chunk_id]
    );

    if (!chunk) {
      // Create new chunk record
      await db.run(
        `INSERT INTO file_chunks (chunk_id, file_id, chunk_index, chunk_size, chunk_hash, is_parity)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [chunk_id, file_id, chunk_index, chunkData.data.length, hash]
      );
    }

    // Store chunk file
    const chunkPath = path.join(CHUNKS_DIR, user_id, device_id);
    await fs.mkdir(chunkPath, { recursive: true });
    const chunkFile = path.join(chunkPath, `${chunk_id}.chunk`);
    await fs.writeFile(chunkFile, chunkData.data);

    // Record chunk location
    const location_id = uuidv4();
    await db.run(
      `INSERT INTO chunk_locations (id, chunk_id, device_id, storage_path, status, verified_at)
       VALUES (?, ?, ?, ?, 'stored', CURRENT_TIMESTAMP)`,
      [location_id, chunk_id, device_id, chunkFile]
    );

    res.status(201).json({
      success: true,
      chunk_id,
      location_id,
      hash,
      size: chunkData.data.length
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

// Download a chunk from this device
router.get('/:chunk_id/download', async (req: Request, res: Response) => {
  try {
    const { chunk_id } = req.params;
    const { device_id } = req.query;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get chunk location
    const location = await db.get<any>(
      `SELECT cl.*, fc.chunk_hash
       FROM chunk_locations cl
       JOIN file_chunks fc ON cl.chunk_id = fc.chunk_id
       JOIN files f ON fc.file_id = f.id
       WHERE cl.chunk_id = ? AND cl.device_id = ? AND f.user_id = ? AND cl.status = 'stored'`,
      [chunk_id, device_id, user_id]
    );

    if (!location) {
      return res.status(404).json({ error: 'Chunk not found on this device' });
    }

    // Read chunk file
    const chunkData = await fs.readFile(location.storage_path);

    // Verify integrity
    if (!verifyChunkIntegrity(chunkData, location.chunk_hash)) {
      // Mark chunk as corrupted
      await db.run(
        `UPDATE chunk_locations SET status = 'corrupted' WHERE id = ?`,
        [location.id]
      );
      return res.status(500).json({ error: 'Chunk data is corrupted' });
    }

    // Update verified timestamp
    await db.run(
      `UPDATE chunk_locations SET verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [location.id]
    );

    res.set('Content-Type', 'application/octet-stream');
    res.set('X-Chunk-Hash', location.chunk_hash);
    res.send(chunkData);
  } catch (error) {
    console.error('Chunk download error:', error);
    res.status(500).json({ error: 'Failed to download chunk' });
  }
});

// Verify chunk integrity
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { chunk_id, device_id } = req.body;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get chunk location
    const location = await db.get<any>(
      `SELECT cl.*, fc.chunk_hash
       FROM chunk_locations cl
       JOIN file_chunks fc ON cl.chunk_id = fc.chunk_id
       JOIN files f ON fc.file_id = f.id
       WHERE cl.chunk_id = ? AND cl.device_id = ? AND f.user_id = ?`,
      [chunk_id, device_id, user_id]
    );

    if (!location) {
      return res.status(404).json({ error: 'Chunk not found' });
    }

    try {
      // Read chunk file
      const chunkData = await fs.readFile(location.storage_path);

      // Verify integrity
      const isValid = verifyChunkIntegrity(chunkData, location.chunk_hash);

      if (isValid) {
        await db.run(
          `UPDATE chunk_locations SET status = 'stored', verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [location.id]
        );
      } else {
        await db.run(
          `UPDATE chunk_locations SET status = 'corrupted' WHERE id = ?`,
          [location.id]
        );
      }

      res.json({
        valid: isValid,
        chunk_id,
        device_id,
        hash: location.chunk_hash
      });
    } catch (error) {
      // File not found or read error
      await db.run(
        `UPDATE chunk_locations SET status = 'missing' WHERE id = ?`,
        [location.id]
      );
      res.json({
        valid: false,
        chunk_id,
        device_id,
        error: 'Chunk file missing'
      });
    }
  } catch (error) {
    console.error('Chunk verify error:', error);
    res.status(500).json({ error: 'Failed to verify chunk' });
  }
});

// Delete a chunk
router.delete('/:chunk_id', async (req: Request, res: Response) => {
  try {
    const { chunk_id } = req.params;
    const { device_id } = req.query;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get chunk location
    const location = await db.get<any>(
      `SELECT cl.*
       FROM chunk_locations cl
       JOIN file_chunks fc ON cl.chunk_id = fc.chunk_id
       JOIN files f ON fc.file_id = f.id
       WHERE cl.chunk_id = ? AND cl.device_id = ? AND f.user_id = ?`,
      [chunk_id, device_id, user_id]
    );

    if (!location) {
      return res.status(404).json({ error: 'Chunk not found' });
    }

    // Delete chunk file
    try {
      await fs.unlink(location.storage_path);
    } catch (error) {
      console.warn('Failed to delete chunk file:', error);
    }

    // Delete location record
    await db.run('DELETE FROM chunk_locations WHERE id = ?', [location.id]);

    res.json({ success: true, message: 'Chunk deleted' });
  } catch (error) {
    console.error('Chunk delete error:', error);
    res.status(500).json({ error: 'Failed to delete chunk' });
  }
});

// List chunks for a file
router.get('/file/:file_id', async (req: Request, res: Response) => {
  try {
    const { file_id } = req.params;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify file belongs to user
    const file = await db.get<any>(
      'SELECT * FROM files WHERE id = ? AND user_id = ?',
      [file_id, user_id]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get all chunks
    const chunks = await db.all<any>(
      `SELECT fc.*,
        (SELECT COUNT(*) FROM chunk_locations WHERE chunk_id = fc.chunk_id) as location_count,
        (SELECT GROUP_CONCAT(device_id) FROM chunk_locations WHERE chunk_id = fc.chunk_id) as device_ids,
        (SELECT GROUP_CONCAT(status) FROM chunk_locations WHERE chunk_id = fc.chunk_id) as statuses
       FROM file_chunks fc
       WHERE fc.file_id = ?
       ORDER BY fc.chunk_index`,
      [file_id]
    );

    res.json({ chunks });
  } catch (error) {
    console.error('Chunk list error:', error);
    res.status(500).json({ error: 'Failed to list chunks' });
  }
});

// Get chunks needing reconstruction
router.get('/needs-reconstruction', async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chunks = await db.all<any>(
      `SELECT DISTINCT fc.*, f.filename, cl.device_id, cl.status
       FROM file_chunks fc
       JOIN files f ON fc.file_id = f.id
       LEFT JOIN chunk_locations cl ON fc.chunk_id = cl.chunk_id
       WHERE f.user_id = ? AND (cl.status = 'needs_reconstruction' OR cl.status = 'corrupted' OR cl.status = 'missing')`,
      [user_id]
    );

    res.json({ chunks });
  } catch (error) {
    console.error('Reconstruction list error:', error);
    res.status(500).json({ error: 'Failed to list chunks needing reconstruction' });
  }
});

export default router;
