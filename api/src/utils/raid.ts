import * as crypto from 'crypto';

/**
 * Split a file buffer into chunks
 */
export function splitFileIntoChunks(fileBuffer: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  let offset = 0;

  while (offset < fileBuffer.length) {
    const end = Math.min(offset + chunkSize, fileBuffer.length);
    const chunk = fileBuffer.slice(offset, end);
    chunks.push(chunk);
    offset = end;
  }

  return chunks;
}

/**
 * Calculate XOR parity for RAID 5
 * Takes an array of data chunks and returns the parity chunk
 */
export function calculateParity(chunks: Buffer[]): Buffer {
  if (chunks.length === 0) {
    return Buffer.alloc(0);
  }

  // Find the maximum chunk size
  const maxSize = Math.max(...chunks.map(c => c.length));
  
  // Initialize parity buffer with zeros
  const parity = Buffer.alloc(maxSize);
  parity.fill(0);

  // XOR all chunks together
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      parity[i] ^= chunk[i];
    }
  }

  return parity;
}

/**
 * Reconstruct missing chunk from remaining chunks and parity (RAID 5)
 */
export function reconstructFromParity(availableChunks: Buffer[], parity: Buffer): Buffer {
  // XOR all available chunks with parity to get missing chunk
  const maxSize = Math.max(parity.length, ...availableChunks.map(c => c.length));
  const reconstructed = Buffer.alloc(maxSize);
  
  // Start with parity
  parity.copy(reconstructed, 0);

  // XOR with all available chunks
  for (const chunk of availableChunks) {
    for (let i = 0; i < chunk.length; i++) {
      reconstructed[i] ^= chunk[i];
    }
  }

  return reconstructed;
}

/**
 * Reconstruct a complete file from its chunks
 */
export function reconstructFromChunks(chunks: Array<{ index: number; data: Buffer }>): Buffer {
  // Sort chunks by index
  const sortedChunks = chunks.sort((a, b) => a.index - b.index);
  
  // Calculate total size
  const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
  
  // Combine chunks
  const reconstructed = Buffer.alloc(totalSize);
  let offset = 0;

  for (const chunk of sortedChunks) {
    chunk.data.copy(reconstructed, offset);
    offset += chunk.data.length;
  }

  return reconstructed;
}

/**
 * Verify chunk integrity using SHA-256 hash
 */
export function verifyChunkIntegrity(chunkData: Buffer, expectedHash: string): boolean {
  const hash = crypto.createHash('sha256').update(chunkData).digest('hex');
  return hash === expectedHash;
}

/**
 * Calculate SHA-256 hash of chunk data
 */
export function calculateChunkHash(chunkData: Buffer): string {
  return crypto.createHash('sha256').update(chunkData).digest('hex');
}

/**
 * Select devices for chunk distribution based on RAID level
 */
export function selectDevicesForDistribution(
  devices: Array<{ device_id: string; storage_available: number; status: string }>,
  raidLevel: string,
  chunkCount: number
): Map<number, string[]> {
  // Filter only online devices with available storage
  const availableDevices = devices.filter(d => d.status === 'online' && d.storage_available > 0);
  
  if (availableDevices.length === 0) {
    throw new Error('No available devices for chunk distribution');
  }

  const distribution = new Map<number, string[]>();

  switch (raidLevel) {
    case '1': {
      // RAID 1: Mirror all chunks to all devices
      for (let i = 0; i < chunkCount; i++) {
        distribution.set(i, availableDevices.map(d => d.device_id));
      }
      break;
    }

    case '5': {
      // RAID 5: Distribute chunks round-robin with parity
      // Each stripe has n-1 data chunks and 1 parity chunk
      const devicesPerStripe = availableDevices.length;
      
      for (let i = 0; i < chunkCount; i++) {
        const deviceIndex = i % devicesPerStripe;
        distribution.set(i, [availableDevices[deviceIndex].device_id]);
      }
      
      // Add parity chunks (distributed across devices)
      const stripeCount = Math.ceil(chunkCount / (devicesPerStripe - 1));
      for (let s = 0; s < stripeCount; s++) {
        const parityDeviceIndex = s % devicesPerStripe;
        const parityChunkIndex = chunkCount + s;
        distribution.set(parityChunkIndex, [availableDevices[parityDeviceIndex].device_id]);
      }
      break;
    }

    case '10': {
      // RAID 10: Stripe across pairs, then mirror
      // Requires at least 4 devices
      if (availableDevices.length < 4) {
        throw new Error('RAID 10 requires at least 4 devices');
      }

      const pairs = Math.floor(availableDevices.length / 2);
      
      for (let i = 0; i < chunkCount; i++) {
        const pairIndex = i % pairs;
        const device1 = availableDevices[pairIndex * 2];
        const device2 = availableDevices[pairIndex * 2 + 1];
        
        distribution.set(i, [device1.device_id, device2.device_id]);
      }
      break;
    }

    default:
      throw new Error(`Unsupported RAID level: ${raidLevel}`);
  }

  return distribution;
}

/**
 * Calculate required devices for RAID level
 */
export function getMinimumDevices(raidLevel: string): number {
  switch (raidLevel) {
    case '1': return 2;
    case '5': return 3;
    case '10': return 4;
    default: throw new Error(`Unknown RAID level: ${raidLevel}`);
  }
}

/**
 * Calculate storage efficiency for RAID level
 * Returns the percentage of usable storage
 */
export function getStorageEfficiency(raidLevel: string, deviceCount: number): number {
  switch (raidLevel) {
    case '1': 
      return 1 / deviceCount; // 50% for 2 devices, 33% for 3, etc.
    case '5': 
      return (deviceCount - 1) / deviceCount; // 66% for 3 devices, 75% for 4, etc.
    case '10': 
      return 0.5; // Always 50%
    default: 
      return 0;
  }
}

/**
 * Check if RAID array can tolerate device failures
 */
export function canTolerateFailures(raidLevel: string, totalDevices: number, failedDevices: number): boolean {
  switch (raidLevel) {
    case '1':
      // RAID 1 can tolerate n-1 failures
      return failedDevices < totalDevices;
    case '5':
      // RAID 5 can tolerate 1 failure
      return failedDevices <= 1;
    case '10':
      // RAID 10 can tolerate 1 failure per mirror pair
      // Simplified: can tolerate up to half the devices if failures are distributed
      return failedDevices < totalDevices / 2;
    default:
      return false;
  }
}
