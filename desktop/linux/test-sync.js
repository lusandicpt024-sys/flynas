#!/usr/bin/env node

/**
 * Test CLI for Flynas Cloud Sync
 * Usage: node test-sync.js [command] [args...]
 */

const fs = require('fs');
const path = require('path');

// Mock Electron app for testing
const mockApp = {
  getPath: (type) => {
    if (type === 'userData') {
      return path.join(__dirname, '.userData');
    }
    return __dirname;
  }
};

// Mock electron module
require.cache[require.resolve('electron')] = {
  exports: { app: mockApp }
};

const CloudSyncService = require('./services/CloudSyncService');
const syncService = new CloudSyncService();

async function register(username, email, password) {
  console.log(`\n📝 Registering user: ${username}`);
  const result = await syncService.register(username, email, password);
  
  if (result.success) {
    console.log('✅ Registration successful!');
    console.log('User:', result.user);
  } else {
    console.error('❌ Registration failed:', result.error);
  }
}

async function login(username, password) {
  console.log(`\n🔐 Logging in: ${username}`);
  const result = await syncService.login(username, password);
  
  if (result.success) {
    console.log('✅ Login successful!');
    console.log('User:', result.user);
  } else {
    console.error('❌ Login failed:', result.error);
  }
}

async function listFiles() {
  console.log('\n📋 Fetching file list from cloud...');
  const result = await syncService.listFiles();
  
  if (result.success) {
    console.log(`✅ Found ${result.files.length} files:`);
    result.files.forEach(file => {
      const size = ((file.file_size || file.size) / 1024).toFixed(2);
      const encrypted = (file.is_encrypted || file.isEncrypted) ? '🔒' : '📄';
      const name = file.original_name || file.originalName;
      console.log(`  ${encrypted} ${name} (${size} KB) - ID: ${file.id}`);
      console.log(`     Created: ${new Date(file.created_at || file.createdAt).toLocaleString()}`);
    });
  } else {
    console.error('❌ Failed to list files:', result.error);
  }
}

async function uploadFile(filePath, isEncrypted = false) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const fileName = path.basename(filePath);
  console.log(`\n⬆️  Uploading: ${fileName}`);
  const result = await syncService.uploadFile(filePath, isEncrypted);
  
  if (result.success) {
    console.log('✅ Upload successful!');
    console.log('File:', result.file);
  } else {
    console.error('❌ Upload failed:', result.error);
  }
}

async function downloadFile(fileId, destinationPath) {
  console.log(`\n⬇️  Downloading file: ${fileId}`);
  console.log(`   Destination: ${destinationPath}`);
  
  const result = await syncService.downloadFile(fileId, destinationPath);
  
  if (result.success) {
    console.log('✅ Download successful!');
    const stats = fs.statSync(destinationPath);
    console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
  } else {
    console.error('❌ Download failed:', result.error);
  }
}

async function deleteFile(fileId) {
  console.log(`\n🗑️  Deleting file: ${fileId}`);
  const result = await syncService.deleteFile(fileId);
  
  if (result.success) {
    console.log('✅ File deleted!');
  } else {
    console.error('❌ Delete failed:', result.error);
  }
}

async function status() {
  console.log('\n📊 Sync Service Status:');
  console.log('----------------------------');
  console.log('Authenticated:', syncService.isAuthenticated());
  
  if (syncService.isAuthenticated()) {
    const user = syncService.getCurrentUser();
    console.log('User:', user);
    console.log('\nVerifying token...');
    const valid = await syncService.verifyToken();
    console.log('Token valid:', valid);
  }
}

function logout() {
  console.log('\n🚪 Logging out...');
  syncService.logout();
  console.log('✅ Logged out successfully!');
}

function printUsage() {
  console.log(`
Flynas Cloud Sync Test CLI
===========================

Usage: node test-sync.js [command] [args...]

Commands:
  register <username> <email> <password>   Register a new user
  login <username> <password>              Login to your account
  logout                                   Logout current user
  status                                   Show authentication status
  list                                     List all files in cloud
  upload <filepath> [encrypted]            Upload a file (encrypted=true/false)
  download <fileId> <destination>          Download a file by ID
  delete <fileId>                          Delete a file by ID

Examples:
  node test-sync.js register john john@example.com password123
  node test-sync.js login john password123
  node test-sync.js list
  node test-sync.js upload ./test.txt false
  node test-sync.js download abc123 ./downloaded.txt
  node test-sync.js status
  node test-sync.js logout
  `);
}

// Main execution
(async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printUsage();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'register':
        if (args.length < 4) {
          console.error('Usage: register <username> <email> <password>');
          process.exit(1);
        }
        await register(args[1], args[2], args[3]);
        break;

      case 'login':
        if (args.length < 3) {
          console.error('Usage: login <username> <password>');
          process.exit(1);
        }
        await login(args[1], args[2]);
        break;

      case 'logout':
        logout();
        break;

      case 'status':
        await status();
        break;

      case 'list':
        await listFiles();
        break;

      case 'upload':
        if (args.length < 2) {
          console.error('Usage: upload <filepath> [encrypted]');
          process.exit(1);
        }
        const isEncrypted = args[2] === 'true';
        await uploadFile(args[1], isEncrypted);
        break;

      case 'download':
        if (args.length < 3) {
          console.error('Usage: download <fileId> <destination>');
          process.exit(1);
        }
        await downloadFile(args[1], args[2]);
        break;

      case 'delete':
        if (args.length < 2) {
          console.error('Usage: delete <fileId>');
          process.exit(1);
        }
        await deleteFile(args[1]);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }

    console.log(); // Empty line for cleaner output
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
