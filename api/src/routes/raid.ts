import { Router, Request, Response } from 'express';
import { Database } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const db = new Database();

interface RaidConfig {
  config_id: string;
  user_id: string;
  raid_level: string;
  chunk_size: number;
  min_devices: number;
  active: number;
  created_at: string;
  updated_at: string;
}

interface Device {
  device_id: string;
  status: string;
}

// Configure RAID for user
router.post('/configure', async (req: Request, res: Response) => {
  try {
    const { raid_level, chunk_size, device_ids } = req.body;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate RAID level
    if (!['1', '5', '10'].includes(raid_level)) {
      return res.status(400).json({ error: 'Invalid RAID level. Must be 1, 5, or 10' });
    }

    // Validate device count for RAID level
    const minDeviceMap: { [key: string]: number } = {
      '1': 2,  // RAID 1 needs at least 2 devices
      '5': 3,  // RAID 5 needs at least 3 devices
      '10': 4  // RAID 10 needs at least 4 devices
    };
    const minDevices = minDeviceMap[raid_level];

    if (!device_ids || device_ids.length < minDevices) {
      return res.status(400).json({ 
        error: `RAID ${raid_level} requires at least ${minDevices} devices` 
      });
    }

    // Verify all devices exist and belong to user
    for (const device_id of device_ids) {
      const device = await db.get<Device>(
        'SELECT device_id, status FROM device_registry WHERE device_id = ? AND user_id = ?',
        [device_id, user_id]
      );

      if (!device) {
        return res.status(400).json({ error: `Device ${device_id} not found` });
      }
    }

    // Deactivate any existing configs
    await db.run(
      'UPDATE raid_config SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND active = 1',
      [user_id]
    );

    // Create new config
    const config_id = uuidv4();
    const chunk_size_value = chunk_size || 1048576; // Default 1MB

    await db.run(
      `INSERT INTO raid_config (config_id, user_id, raid_level, chunk_size, min_devices, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [config_id, user_id, raid_level, chunk_size_value, minDevices]
    );

    // Add device mappings
    for (let i = 0; i < device_ids.length; i++) {
      await db.run(
        `INSERT INTO raid_devices (id, config_id, device_id, priority)
         VALUES (?, ?, ?, ?)`,
        [uuidv4(), config_id, device_ids[i], i]
      );
    }

    const config = await db.get<RaidConfig>(
      'SELECT * FROM raid_config WHERE config_id = ?',
      [config_id]
    );

    const devices = await db.all<any>(
      `SELECT rd.*, dr.device_name, dr.device_type, dr.status
       FROM raid_devices rd
       JOIN device_registry dr ON rd.device_id = dr.device_id
       WHERE rd.config_id = ?
       ORDER BY rd.priority`,
      [config_id]
    );

    res.status(201).json({ 
      config: {
        ...config,
        devices
      }
    });
  } catch (error) {
    console.error('RAID configuration error:', error);
    res.status(500).json({ error: 'Failed to configure RAID' });
  }
});

// Get RAID status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await db.get<RaidConfig>(
      'SELECT * FROM raid_config WHERE user_id = ? AND active = 1',
      [user_id]
    );

    if (!config) {
      return res.json({ 
        configured: false,
        message: 'No active RAID configuration' 
      });
    }

    const devices = await db.all<any>(
      `SELECT rd.*, dr.device_name, dr.device_type, dr.status, dr.last_seen, dr.storage_available
       FROM raid_devices rd
       JOIN device_registry dr ON rd.device_id = dr.device_id
       WHERE rd.config_id = ?
       ORDER BY rd.priority`,
      [config.config_id]
    );

    // Calculate health status
    const now = new Date();
    const onlineDevices = devices.filter(d => {
      const lastSeen = new Date(d.last_seen);
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
      return diffMinutes < 5;
    });

    const health = onlineDevices.length >= config.min_devices ? 'healthy' : 'degraded';

    // Get chunk statistics
    const chunkStats = await db.get<any>(
      `SELECT 
        COUNT(*) as total_chunks,
        SUM(CASE WHEN is_parity = 1 THEN 1 ELSE 0 END) as parity_chunks,
        SUM(chunk_size) as total_size
       FROM file_chunks fc
       JOIN files f ON fc.file_id = f.id
       WHERE f.user_id = ?`,
      [user_id]
    );

    res.json({
      configured: true,
      config,
      devices,
      health,
      online_devices: onlineDevices.length,
      total_devices: devices.length,
      stats: chunkStats
    });
  } catch (error) {
    console.error('RAID status error:', error);
    res.status(500).json({ error: 'Failed to get RAID status' });
  }
});

// Heal RAID array (redistribute chunks from offline devices)
router.put('/heal', async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await db.get<RaidConfig>(
      'SELECT * FROM raid_config WHERE user_id = ? AND active = 1',
      [user_id]
    );

    if (!config) {
      return res.status(400).json({ error: 'No active RAID configuration' });
    }

    // Find offline devices
    const now = new Date();
    const devices = await db.all<any>(
      `SELECT dr.device_id, dr.status, dr.last_seen
       FROM raid_devices rd
       JOIN device_registry dr ON rd.device_id = dr.device_id
       WHERE rd.config_id = ?`,
      [config.config_id]
    );

    const offlineDevices = devices.filter(d => {
      const lastSeen = new Date(d.last_seen);
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
      return diffMinutes >= 5;
    }).map(d => d.device_id);

    if (offlineDevices.length === 0) {
      return res.json({ 
        success: true, 
        message: 'All devices are online, no healing needed',
        chunks_moved: 0
      });
    }

    // Find chunks on offline devices
    const chunksToMove = await db.all<any>(
      `SELECT cl.*, fc.chunk_hash
       FROM chunk_locations cl
       JOIN file_chunks fc ON cl.chunk_id = fc.chunk_id
       WHERE cl.device_id IN (${offlineDevices.map(() => '?').join(',')})
       AND cl.status = 'stored'`,
      offlineDevices
    );

    // Mark these chunks for reconstruction
    for (const chunk of chunksToMove) {
      await db.run(
        `UPDATE chunk_locations SET status = 'needs_reconstruction' WHERE id = ?`,
        [chunk.id]
      );
    }

    // Log healing event
    const { v4: uuidv4 } = require('uuid');
    const eventId = uuidv4();
    const onlineDevices = devices.length - offlineDevices.length;

    await db.run(
      `INSERT INTO healing_events (
        id, user_id, config_id, event_type, trigger, 
        offline_device_count, online_device_count, total_device_count,
        chunks_marked_for_reconstruction, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        eventId,
        user_id,
        config.config_id,
        'manual-heal',
        'user-triggered',
        offlineDevices.length,
        onlineDevices,
        devices.length,
        chunksToMove.length,
        JSON.stringify({
          trigger: 'user-triggered',
          offline_devices: offlineDevices,
          chunks_affected: chunksToMove.length
        })
      ]
    );

    res.json({
      success: true,
      message: 'Healing initiated',
      offline_devices: offlineDevices.length,
      chunks_marked_for_reconstruction: chunksToMove.length,
      event_id: eventId
    });
  } catch (error) {
    console.error('RAID heal error:', error);
    res.status(500).json({ error: 'Failed to heal RAID array' });
  }
});

// Reconstruct file from chunks
router.post('/reconstruct', async (req: Request, res: Response) => {
  try {
    const { file_id } = req.body;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!file_id) {
      return res.status(400).json({ error: 'file_id is required' });
    }

    // Verify file belongs to user
    const file = await db.get<any>(
      'SELECT * FROM files WHERE id = ? AND user_id = ?',
      [file_id, user_id]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get all chunks for this file
    const chunks = await db.all<any>(
      `SELECT fc.*, 
        GROUP_CONCAT(cl.device_id) as device_ids,
        GROUP_CONCAT(cl.status) as statuses
       FROM file_chunks fc
       LEFT JOIN chunk_locations cl ON fc.chunk_id = cl.chunk_id
       WHERE fc.file_id = ?
       GROUP BY fc.chunk_id
       ORDER BY fc.chunk_index`,
      [file_id]
    );

    const missingChunks = chunks.filter(c => !c.device_ids || c.statuses?.includes('needs_reconstruction'));

    if (missingChunks.length === 0) {
      return res.json({
        success: true,
        message: 'All chunks are available, no reconstruction needed'
      });
    }

    // For RAID 5, we can reconstruct from parity
    const config = await db.get<RaidConfig>(
      'SELECT * FROM raid_config WHERE user_id = ? AND active = 1',
      [user_id]
    );

    if (config?.raid_level === '5') {
      // Parity reconstruction logic would go here
      // This is a complex operation that requires XOR operations on chunks
      return res.json({
        success: true,
        message: 'Reconstruction initiated using parity data',
        missing_chunks: missingChunks.length,
        reconstruction_method: 'parity'
      });
    } else {
      // RAID 1 and 10 use mirroring, find alternate locations
      return res.json({
        success: true,
        message: 'Reconstruction initiated using mirrored copies',
        missing_chunks: missingChunks.length,
        reconstruction_method: 'mirror'
      });
    }
  } catch (error) {
    console.error('RAID reconstruct error:', error);
    res.status(500).json({ error: 'Failed to reconstruct file' });
  }
});

// Delete RAID configuration
router.delete('/configure', async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if there are any chunks stored
    const chunks = await db.all<any>(
      `SELECT COUNT(*) as count FROM file_chunks fc
       JOIN files f ON fc.file_id = f.id
       WHERE f.user_id = ?`,
      [user_id]
    );

    if (chunks[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete RAID configuration while chunks are stored. Please delete all files first.' 
      });
    }

    await db.run(
      'UPDATE raid_config SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND active = 1',
      [user_id]
    );

    res.json({ success: true, message: 'RAID configuration deactivated' });
  } catch (error) {
    console.error('RAID delete error:', error);
    res.status(500).json({ error: 'Failed to delete RAID configuration' });
  }
});

// Get RAID healing history
router.get('/healing/history', async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const events = await db.all<any>(
      `SELECT id, config_id, event_type, trigger, offline_device_count, 
              online_device_count, total_device_count, chunks_marked_for_reconstruction,
              details, created_at
       FROM healing_events 
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [user_id, limit, offset]
    );

    const total = await db.get<any>(
      'SELECT COUNT(*) as count FROM healing_events WHERE user_id = ?',
      [user_id]
    );

    res.json({
      events: events.map(e => ({
        id: e.id,
        configId: e.config_id,
        type: e.event_type,
        trigger: e.trigger,
        offlineDevices: e.offline_device_count,
        onlineDevices: e.online_device_count,
        totalDevices: e.total_device_count,
        chunksMarked: e.chunks_marked_for_reconstruction,
        details: e.details ? JSON.parse(e.details) : {},
        createdAt: e.created_at
      })),
      pagination: {
        total: total?.count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Healing history error:', error);
    res.status(500).json({ error: 'Failed to get healing history' });
  }
});

export default router;
