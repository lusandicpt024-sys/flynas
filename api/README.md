# Flynas Backend API

Backend server for Flynas cross-platform file synchronization with user authentication.

## Features

- **User Authentication**: JWT-based registration and login
- **File Management**: Upload, download, list, and delete files
- **Cross-Platform Sync**: Sync files across Android, Linux, and other devices
- **SQLite Database**: Lightweight, file-based storage
- **Secure File Storage**: User-isolated file directories
- **RESTful API**: Clean, documented endpoints

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
cd api
npm install
cp .env.example .env
```

### Configuration

Edit `.env` file:

```env
PORT=3000
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d
DB_PATH=./data/flynas.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
ALLOWED_ORIGINS=*
```

### Running

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securepassword"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

### File Management

All file endpoints require authentication via `Authorization: Bearer <token>` header.

#### Upload File
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
isEncrypted: true
```

#### List Files
```http
GET /api/files
Authorization: Bearer <token>
```

Response:
```json
{
  "files": [
    {
      "id": "file-uuid",
      "name": "document.pdf",
      "size": 1048576,
      "mimeType": "application/pdf",
      "isEncrypted": true,
      "isSynced": true,
      "createdAt": "2025-11-20T10:00:00.000Z",
      "updatedAt": "2025-11-20T10:00:00.000Z"
    }
  ]
}
```

#### Download File
```http
GET /api/files/:fileId
Authorization: Bearer <token>
```

#### Delete File
```http
DELETE /api/files/:fileId
Authorization: Bearer <token>
```

#### Sync Changes
```http
GET /api/files/sync/changes?since=2025-11-20T10:00:00.000Z
Authorization: Bearer <token>
```

### Health Check

```http
GET /health
```

## Android Integration

The CloudSyncManager class handles API communication from Android:

```kotlin
val syncManager = CloudSyncManager(context)

// Register/Login
val result = syncManager.register("username", "email@example.com", "password")
val loginResult = syncManager.login("username", "password")

// Upload file
val uploadResult = syncManager.uploadFile(file, isEncrypted = true)

// List files
val filesResult = syncManager.listFiles()

// Download file
val downloadResult = syncManager.downloadFile(fileId, destinationFile)

// Sync changes
val syncResult = syncManager.syncChanges(since = lastSyncTime)
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
)
```

### Files Table
```sql
CREATE TABLE files (
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
```

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for stateless authentication
- User-isolated file directories
- Input validation on all endpoints
- CORS configuration for allowed origins

## Development

### Project Structure
```
api/
├── src/
│   ├── server.ts           # Express server setup
│   ├── database/
│   │   └── db.ts           # SQLite database wrapper
│   ├── routes/
│   │   ├── auth.ts         # Authentication endpoints
│   │   └── files.ts        # File management endpoints
│   └── middleware/
│       ├── auth.ts         # JWT authentication middleware
│       └── errorHandler.ts # Global error handling
├── data/                   # SQLite database (auto-created)
├── uploads/                # User file storage (auto-created)
├── package.json
├── tsconfig.json
└── .env
```

### Testing

Test endpoints with curl:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Upload file (replace TOKEN with actual token)
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@/path/to/file.pdf"

# List files
curl http://localhost:3000/api/files \
  -H "Authorization: Bearer TOKEN"
```

## Production Deployment

1. Set strong `JWT_SECRET` in production
2. Configure `ALLOWED_ORIGINS` for your domains
3. Use HTTPS in production
4. Set up proper backup for SQLite database
5. Configure file storage limits
6. Enable logging and monitoring

## License

MIT
