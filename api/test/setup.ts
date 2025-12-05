import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

// Ensure process.cwd() points to api folder for relative paths during tests.
process.chdir(path.join(__dirname, '..'));

// Create a unique tmp data directory per test run
const tmpDataDir = path.join(__dirname, '..', 'tmp-data', `test-${randomBytes(4).toString('hex')}`);
if (!fs.existsSync(tmpDataDir)) {
  fs.mkdirSync(tmpDataDir, { recursive: true });
}

process.env.DATA_DIR = tmpDataDir;
process.env.CHUNKS_DIR = path.join(tmpDataDir, 'chunks');
process.env.DB_PATH = path.join(tmpDataDir, 'test.db');

// Suppress console logs for cleaner test output
const originalError = console.error;
const originalLog = console.log;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Error opening database')) {
    return; // Suppress expected errors
  }
  originalError(...args);
};
console.log = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('📊') || args[0].includes('✅'))) {
    return; // Suppress database setup logs
  }
  originalLog(...args);
};

afterAll(() => {
  // Clean tmp data
  if (fs.existsSync(tmpDataDir)) {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  }
});
