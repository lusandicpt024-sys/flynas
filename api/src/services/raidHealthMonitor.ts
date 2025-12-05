/**
 * RAID Health Monitor Service
 * Automatically monitors RAID array health and triggers healing when needed
 */

import { db } from '../database/db';

interface RaidConfig {
  config_id: string;
  user_id: string;
  raid_level: string;
  min_devices: number;
  active: boolean;
}

interface RaidDevice {
  device_id: string;
  user_id: string;
  status: string;
  last_seen: string;
}

/**
 * Monitor RAID health for all users
 * Runs periodically to check for offline devices and trigger healing
 */
export async function monitorRaidHealth(): Promise<void> {
  try {
    console.log('🔍 Starting RAID health check...');

    // Get all active RAID configurations
    const configs = await db.all<RaidConfig>(
      'SELECT * FROM raid_config WHERE active = 1'
    );

    for (const config of configs) {
      await checkRaidConfigHealth(config);
    }

    console.log('✅ RAID health check completed');
  } catch (error) {
    console.error('❌ RAID health monitor error:', error);
  }
}

/**
 * Check health of a specific RAID configuration
 */
async function checkRaidConfigHealth(config: RaidConfig): Promise<void> {
  try {
    const now = new Date();

    // Get all devices in this RAID config
    const devices = await db.all<any>(
      `SELECT dr.device_id, dr.status, dr.last_seen
       FROM raid_devices rd
       JOIN device_registry dr ON rd.device_id = dr.device_id
       WHERE rd.config_id = ?`,
      [config.config_id]
    );

    // Find offline devices (haven't seen in >5 minutes)
    const offlineDevices = devices.filter(d => {
      const lastSeen = new Date(d.last_seen);
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
      return diffMinutes >= 5;
    });

    // Check if RAID is degraded
    const onlineDevices = devices.length - offlineDevices.length;
    const isDegraded = onlineDevices < config.min_devices;

    if (isDegraded) {
      console.warn(
        `⚠️  RAID config ${config.config_id} (user: ${config.user_id}) is DEGRADED`,
        `Online: ${onlineDevices}/${devices.length}, Min: ${config.min_devices}`
      );

      // Mark chunks on offline devices for reconstruction
      await markChunksForReconstruction(config.config_id, offlineDevices.map(d => d.device_id));

      // Log healing event
      await logHealingEvent(config.user_id, config.config_id, 'auto-heal', {
        trigger: 'offline_devices',
        offline_count: offlineDevices.length,
        online_count: onlineDevices,
        total_devices: devices.length
      });
    } else if (offlineDevices.length > 0) {
      console.info(
        `ℹ️  RAID config ${config.config_id} has ${offlineDevices.length} offline device(s) but still HEALTHY`,
        `Online: ${onlineDevices}/${devices.length}, Min: ${config.min_devices}`
      );

      // Still mark chunks for reconstruction for data safety
      await markChunksForReconstruction(config.config_id, offlineDevices.map(d => d.device_id));
    } else {
      console.info(`✓ RAID config ${config.config_id} is HEALTHY - all devices online`);
    }
  } catch (error) {
    console.error(`Error checking RAID health for config ${config.config_id}:`, error);
  }
}

/**
 * Mark chunks on offline devices for reconstruction
 */
async function markChunksForReconstruction(configId: string, offlineDeviceIds: string[]): Promise<void> {
  if (offlineDeviceIds.length === 0) {
    return;
  }

  try {
    // Get chunks stored on offline devices
    const chunksToMark = await db.all<any>(
      `SELECT DISTINCT cl.id, cl.chunk_id, cl.device_id, fc.file_id, f.user_id
       FROM chunk_locations cl
       JOIN file_chunks fc ON cl.chunk_id = fc.chunk_id
       JOIN files f ON fc.file_id = f.id
       JOIN raid_devices rd ON rd.config_id = ?
       WHERE cl.device_id IN (${offlineDeviceIds.map(() => '?').join(',')})
       AND cl.status = 'stored'`,
      [configId, ...offlineDeviceIds]
    );

    // Mark each chunk for reconstruction
    for (const chunk of chunksToMark) {
      await db.run(
        `UPDATE chunk_locations SET status = 'needs_reconstruction' WHERE id = ?`,
        [chunk.id]
      );

      console.log(
        `📍 Marked chunk ${chunk.chunk_id.substring(0, 8)}... (file: ${chunk.file_id.substring(0, 8)}...) for reconstruction`
      );
    }

    if (chunksToMark.length > 0) {
      console.log(`📦 Marked ${chunksToMark.length} chunks for reconstruction`);
    }
  } catch (error) {
    console.error('Error marking chunks for reconstruction:', error);
  }
}

/**
 * Log RAID healing event
 */
async function logHealingEvent(
  userId: string,
  configId: string,
  healType: string,
  details: any
): Promise<void> {
  try {
    const { v4: uuidv4 } = require('uuid');
    const eventId = uuidv4();

    await db.run(
      `INSERT INTO healing_events (
        id, user_id, config_id, event_type, trigger, 
        offline_device_count, online_device_count, total_device_count,
        chunks_marked_for_reconstruction, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        eventId,
        userId,
        configId,
        healType,
        details.trigger || 'unknown',
        details.offline_count || 0,
        details.online_count || 0,
        details.total_devices || 0,
        details.chunks_marked || 0,
        JSON.stringify(details)
      ]
    );

    console.log(`📋 Healing event logged - Type: ${healType}, Config: ${configId}, Event ID: ${eventId.substring(0, 8)}...`);
  } catch (error) {
    console.error('Error logging healing event:', error);
  }
}

/**
 * Start the RAID health monitor service
 * Runs every 2 minutes by default
 */
export function startRaidHealthMonitor(intervalMinutes: number = 2): NodeJS.Timeout {
  console.log(`🕐 Starting RAID health monitor (checks every ${intervalMinutes} minutes)`);

  // Run immediately on startup
  monitorRaidHealth();

  // Schedule periodic checks
  const intervalMs = intervalMinutes * 60 * 1000;
  return setInterval(() => {
    monitorRaidHealth();
  }, intervalMs);
}

/**
 * Stop the RAID health monitor service
 */
export function stopRaidHealthMonitor(intervalHandle: NodeJS.Timeout): void {
  console.log('🛑 Stopping RAID health monitor');
  clearInterval(intervalHandle);
}
