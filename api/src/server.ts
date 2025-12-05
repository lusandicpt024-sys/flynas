import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import encryptionRoutes from './routes/encryption';
import devicesRoutes from './routes/devices';
import raidRoutes from './routes/raid';
import chunksRoutes from './routes/chunks';
import { errorHandler } from './middleware/errorHandler';
import { startRaidHealthMonitor } from './services/raidHealthMonitor';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure data directory exists
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/raid', raidRoutes);
app.use('/api/chunks', chunksRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Flynas API Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.resolve(uploadDir)}`);
  console.log(`🗄️  Database: ${process.env.DB_PATH || './data/flynas.db'}`);

  // Start RAID health monitor service
  const monitorInterval = parseInt(process.env.RAID_MONITOR_INTERVAL_MINUTES || '2');
  startRaidHealthMonitor(monitorInterval);
});

export default app;
