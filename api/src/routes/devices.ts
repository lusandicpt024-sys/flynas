import { Router, Request, Response } from 'express';
import { Database } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const db = new Database();

interface Device {
  device_id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  platform: string;
  status: string;
  storage_capacity?: number;
  storage_available?: number;
  last_seen: string;
  created_at: string;
}

// Register a new device
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { device_name, device_type, platform, storage_capacity, storage_available } = req.body;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!device_name || !device_type || !platform) {
      return res.status(400).json({ error: 'Missing required fields: device_name, device_type, platform' });
    }

    const device_id = uuidv4();

    await db.run(
      `INSERT INTO device_registry (device_id, user_id, device_name, device_type, platform, storage_capacity, storage_available, status, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'online', CURRENT_TIMESTAMP)`,
      [device_id, user_id, device_name, device_type, platform, storage_capacity, storage_available]
    );

    const device = await db.get<Device>(
      'SELECT * FROM device_registry WHERE device_id = ?',
      [device_id]
    );

    res.status(201).json({ device });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// List all devices for the authenticated user
router.get('/list', async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const devices = await db.all<Device>(
      'SELECT * FROM device_registry WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );

    // Calculate offline devices (no heartbeat in last 5 minutes)
    const now = new Date();
    const devicesWithStatus = devices.map(device => {
      const lastSeen = new Date(device.last_seen);
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
      const isOnline = diffMinutes < 5;

      return {
        ...device,
        status: isOnline ? 'online' : 'offline',
        minutes_since_seen: Math.floor(diffMinutes)
      };
    });

    res.json({ devices: devicesWithStatus });
  } catch (error) {
    console.error('Device list error:', error);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

// Update device heartbeat
router.put('/:device_id/heartbeat', async (req: Request, res: Response) => {
  try {
    const { device_id } = req.params;
    const { storage_available } = req.body;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify device belongs to user
    const device = await db.get<Device>(
      'SELECT * FROM device_registry WHERE device_id = ? AND user_id = ?',
      [device_id, user_id]
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Update heartbeat and optionally storage
    if (storage_available !== undefined) {
      await db.run(
        `UPDATE device_registry 
         SET last_seen = CURRENT_TIMESTAMP, status = 'online', storage_available = ?
         WHERE device_id = ?`,
        [storage_available, device_id]
      );
    } else {
      await db.run(
        `UPDATE device_registry 
         SET last_seen = CURRENT_TIMESTAMP, status = 'online'
         WHERE device_id = ?`,
        [device_id]
      );
    }

    res.json({ success: true, message: 'Heartbeat updated' });
  } catch (error) {
    console.error('Heartbeat update error:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

// Unregister a device
router.delete('/:device_id/unregister', async (req: Request, res: Response) => {
  try {
    const { device_id } = req.params;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify device belongs to user
    const device = await db.get<Device>(
      'SELECT * FROM device_registry WHERE device_id = ? AND user_id = ?',
      [device_id, user_id]
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if device has any chunks stored
    const chunks = await db.all<any>(
      'SELECT COUNT(*) as count FROM chunk_locations WHERE device_id = ?',
      [device_id]
    );

    if (chunks[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot unregister device with stored chunks. Please redistribute chunks first.' 
      });
    }

    await db.run('DELETE FROM device_registry WHERE device_id = ?', [device_id]);

    res.json({ success: true, message: 'Device unregistered successfully' });
  } catch (error) {
    console.error('Device unregister error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

// Get device details
router.get('/:device_id', async (req: Request, res: Response) => {
  try {
    const { device_id } = req.params;
    const user_id = (req as any).user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const device = await db.get<Device>(
      'SELECT * FROM device_registry WHERE device_id = ? AND user_id = ?',
      [device_id, user_id]
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get chunk count for this device
    const chunkCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM chunk_locations WHERE device_id = ?',
      [device_id]
    );

    res.json({ 
      device: {
        ...device,
        chunk_count: chunkCount?.count || 0
      }
    });
  } catch (error) {
    console.error('Device details error:', error);
    res.status(500).json({ error: 'Failed to get device details' });
  }
});

export default router;
