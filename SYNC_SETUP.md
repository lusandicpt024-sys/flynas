# Backend + Android Integration Guide

## 🎉 What's Been Implemented

### Backend Server (Complete)
- ✅ Node.js/Express REST API with TypeScript
- ✅ JWT-based user authentication (register/login)
- ✅ File upload/download/list/delete endpoints
- ✅ SQLite database for users and file metadata
- ✅ User-isolated file storage
- ✅ Sync endpoint for incremental updates
- ✅ CORS and security middleware

### Android App (Complete)
- ✅ CloudSyncManager network client with OkHttp
- ✅ Login and Register screens
- ✅ Authentication flow with token storage
- ✅ Integration with existing file browser
- ✅ Splash → Login → Main → File Browser flow

## 🚀 How to Run

### 1. Start the Backend Server

```bash
# Navigate to API directory
cd /home/lusandicpt024/Work/WebDev/flynas/api

# Server is already configured (.env created)
# Start in development mode with auto-reload
npm run dev
```

Server will start on `http://localhost:3000`

You should see:
```
🚀 Flynas API Server running on port 3000
📁 Upload directory: /path/to/uploads
🗄️  Database: ./data/flynas.db
📊 Connected to SQLite database
✅ Database tables initialized
```

### 2. Configure Android App for Local Testing

**For Android Emulator:**
- The app is already configured to use `http://10.0.2.2:3000`
- This is the emulator's special alias for `localhost`

**For Physical Android Device:**
1. Find your computer's local IP address:
   ```bash
   ip addr show | grep inet
   # Look for something like 192.168.1.100
   ```

2. Edit `/home/lusandicpt024/Work/WebDev/flynas/android/app/src/main/java/com/flynas/android/network/CloudSyncManager.kt`:
   ```kotlin
   private const val BASE_URL = "http://YOUR_IP_HERE:3000"
   // Example: "http://192.168.1.100:3000"
   ```

3. Ensure both devices are on the same WiFi network

### 3. Build and Install Android App

```bash
cd /home/lusandicpt024/Work/WebDev/flynas/android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew assembleDebug

# Install on device/emulator
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 📱 Testing the Integration

### Test Flow:

1. **Launch App** → Splash screen → Login screen

2. **Register New User:**
   - Tap "Don't have an account? Register"
   - Enter username (min 3 chars)
   - Enter email
   - Enter password (min 6 chars)
   - Tap "Create Account"
   - You'll be logged in automatically

3. **Login Existing User:**
   - Enter username or email
   - Enter password
   - Tap "Login"

4. **File Operations with Sync:**
   - Complete onboarding (or skip if already done)
   - Navigate to File Browser
   - Import a file → automatically syncs to cloud
   - File shows sync indicator
   - Access same file from another device!

5. **Skip Login (Local Mode):**
   - Tap "Skip for now" on login screen
   - Use app without cloud sync
   - Files stay local only

### Test API Directly with curl:

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"test123"}'

# Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# List files
curl http://localhost:3000/api/files \
  -H "Authorization: Bearer $TOKEN"

# Upload file
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test.txt" \
  -F "isEncrypted=false"
```

## 🔐 How Authentication Works

1. **Register/Login:**
   - User enters credentials
   - Server validates and returns JWT token
   - Android stores token in SharedPreferences
   - Token expires in 7 days (configurable)

2. **Authenticated Requests:**
   - All file operations include `Authorization: Bearer <token>` header
   - Server validates token and extracts user ID
   - Files are isolated per user

3. **Token Storage:**
   - Stored in `flynas_auth` SharedPreferences
   - Persists across app restarts
   - Cleared on logout

## 📊 File Sync Flow

### Upload:
```
Android Device → CloudSyncManager.uploadFile()
    → POST /api/files/upload with file
    → Server saves to uploads/{userId}/
    → Creates database record
    → Returns file ID
```

### Download:
```
Android Device → CloudSyncManager.listFiles()
    → GET /api/files
    → Server returns file metadata
    → CloudSyncManager.downloadFile(fileId)
    → GET /api/files/{fileId}
    → File downloaded to local storage
```

### Sync Changes:
```
Android Device → CloudSyncManager.syncChanges(lastSyncTime)
    → GET /api/files/sync/changes?since={timestamp}
    → Server returns files modified since timestamp
    → Android downloads new/updated files
```

## 🔧 Configuration

### Backend (.env):
```env
PORT=3000                                    # Server port
JWT_SECRET=your-secret-change-in-production # JWT signing key
JWT_EXPIRES_IN=7d                           # Token expiration
DB_PATH=./data/flynas.db                    # SQLite database
UPLOAD_DIR=./uploads                        # File storage
MAX_FILE_SIZE=104857600                     # 100MB limit
ALLOWED_ORIGINS=*                           # CORS origins
```

### Android (CloudSyncManager.kt):
```kotlin
private const val BASE_URL = "http://10.0.2.2:3000" // Emulator
// OR
private const val BASE_URL = "http://192.168.1.100:3000" // Physical device
```

## 🐛 Troubleshooting

### "Network error" on Android:
- Check backend server is running (`npm run dev`)
- Verify IP address in CloudSyncManager
- Check firewall allows port 3000
- Ensure both devices on same network (physical device)

### "Not authenticated" errors:
- Login/register first
- Token may have expired (re-login)
- Check token is being saved in SharedPreferences

### Build errors:
- Run `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew assembleDebug`
- Ensure OkHttp dependency added to build.gradle
- Sync Gradle if needed

### API not responding:
- Check backend logs for errors
- Test health endpoint: `curl http://localhost:3000/health`
- Verify database initialized (check `data/flynas.db` exists)

## 📁 File Storage Structure

```
flynas/
├── api/
│   ├── data/
│   │   └── flynas.db           # SQLite database
│   └── uploads/
│       └── {user-id}/          # User-specific directories
│           ├── file1.pdf
│           └── file2.jpg
└── android/
    └── app/
        └── data/
            └── flynas_files/   # Local storage
```

## 🚀 Next Steps

1. **Test Registration:** Create account from Android
2. **Upload File:** Import file and verify sync
3. **Cross-Device:** Login from another device and see files
4. **Local Mode:** Test skip login for offline use

## 📝 API Documentation

See `/api/README.md` for complete API reference including:
- All endpoints and parameters
- Request/response formats
- Authentication headers
- Error responses
- Database schema

Your Android and Linux apps can now sync files through the backend! 🎉
