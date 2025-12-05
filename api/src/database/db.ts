import * as sqlite3 from 'sqlite3';
import * as path from 'path';

const DB_PATH = process.env.DB_PATH || './data/flynas.db';

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('📊 Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  private initializeTables(): void {
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // Files table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT,
        is_encrypted BOOLEAN DEFAULT 0,
        is_synced BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create index on user_id for faster queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)
    `);

    // Folders table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_name TEXT NOT NULL,
        parent_id TEXT,
        path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      )
    `);

    // Create index on user_id and parent_id for faster queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)
    `);

    // Device registry table for RAID
    this.db.run(`
      CREATE TABLE IF NOT EXISTS device_registry (
        device_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT DEFAULT 'online',
        storage_capacity INTEGER,
        storage_available INTEGER,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // RAID configuration table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS raid_config (
        config_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        raid_level TEXT NOT NULL,
        chunk_size INTEGER DEFAULT 1048576,
        min_devices INTEGER NOT NULL,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // RAID device mapping table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS raid_devices (
        id TEXT PRIMARY KEY,
        config_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (config_id) REFERENCES raid_config(config_id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES device_registry(device_id) ON DELETE CASCADE
      )
    `);

    // File chunks table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS file_chunks (
        chunk_id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_size INTEGER NOT NULL,
        chunk_hash TEXT NOT NULL,
        is_parity BOOLEAN DEFAULT 0,
        parity_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    // Chunk storage locations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chunk_locations (
        id TEXT PRIMARY KEY,
        chunk_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        status TEXT DEFAULT 'stored',
        verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chunk_id) REFERENCES file_chunks(chunk_id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES device_registry(device_id) ON DELETE CASCADE
      )
    `);

    // Create indexes for RAID tables
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_device_registry_user_id ON device_registry(user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_device_registry_status ON device_registry(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_raid_config_user_id ON raid_config(user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_chunk_locations_chunk_id ON chunk_locations(chunk_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_chunk_locations_device_id ON chunk_locations(device_id)`);

    console.log('✅ Database tables initialized');
  }

  public getDb(): sqlite3.Database {
    return this.db;
  }

  public async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  public async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  public close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('📊 Database connection closed');
      }
    });
  }
}

export const db = new Database();
