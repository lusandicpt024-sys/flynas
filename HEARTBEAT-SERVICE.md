# Flynas Background Heartbeat Service

## Overview

The Flynas platform includes an automatic background heartbeat service that runs on all client platforms (Desktop, Browser Extensions, and Android). This service periodically sends device status updates to the server to maintain accurate RAID health monitoring and device availability.

## Purpose

- **Device Status Monitoring**: Track which devices are online and available for RAID operations
- **Storage Capacity Updates**: Report current storage capacity and available space
- **RAID Health**: Enable server-side monitoring of RAID array health across distributed devices
- **Automatic Failover**: Help the system detect offline devices and trigger reconstruction if needed

## Platform Implementations

### Desktop (Linux & Windows)

**Implementation**: `desktop/linux/services/CloudSyncService.js`

- **Interval**: 5 minutes (300,000ms)
- **Mechanism**: Node.js `setInterval()`
- **Startup**: Auto-starts when CloudSyncService is instantiated (on app launch)
- **Storage Info**: Uses `diskusage` npm package to get real filesystem stats

**Key Methods**:
- `startHeartbeat()`: Initializes periodic heartbeat
- `stopHeartbeat()`: Stops heartbeat service
- `sendHeartbeat()`: Sends status update to server
- `setHeartbeatInterval(ms)`: Changes heartbeat frequency

**Data Sent**:
```javascript
{
  deviceId: null, // Server identifies device from auth token
  status: 'online',
  capacity: <total bytes>,
  available: <available bytes>,
  lastSeen: <ISO timestamp>
}
```

### Browser Extensions (Chrome & Firefox)

**Implementation**: `browser-extension/chrome/background.js`

- **Interval**: 5 minutes
- **Mechanism**: Chrome Alarms API (`chrome.alarms`)
- **Startup**: Auto-starts when background script initializes
- **Storage Info**: Uses `navigator.storage.estimate()` for quota info

**Key Methods**:
- `setupHeartbeat()`: Initializes alarm and listeners
- `sendHeartbeat()`: Sends status update to server
- `stopHeartbeat()`: Cancels heartbeat alarm

**Benefits of Alarms API**:
- Persists across browser restarts
- Respects browser power management
- Efficient for service workers

### Android

**Implementation**: 
- Worker: `android/app/src/main/java/com/flynas/android/workers/HeartbeatWorker.kt`
- Scheduler: `android/app/src/main/java/com/flynas/android/workers/HeartbeatScheduler.kt`

- **Interval**: 15 minutes (optimized for battery life)
- **Mechanism**: AndroidX WorkManager
- **Startup**: Auto-starts in `FlynasApplication.onCreate()`
- **Storage Info**: Uses `StatFs` to get internal storage stats
- **Constraints**: Requires network connectivity

**Key Features**:
- Automatic retry with exponential backoff
- Respects Android battery optimization (Doze mode)
- Survives app restarts
- Guaranteed execution even if app is killed

**Key Methods**:
- `HeartbeatScheduler.start(context)`: Starts periodic work
- `HeartbeatScheduler.stop(context)`: Cancels work
- `HeartbeatScheduler.isRunning(context)`: Check status
- `HeartbeatWorker.doWork()`: Execute heartbeat

## Server-Side Handling

**Endpoint**: `POST /api/raid/heartbeat`

**Authentication**: Requires Bearer token

**Expected Request Body**:
```json
{
  "deviceId": null,
  "status": "online",
  "capacity": 1000000000000,
  "available": 500000000000,
  "lastSeen": "2025-12-02T10:30:00.000Z"
}
```

**Server Actions**:
1. Identifies device from authentication token
2. Updates device record with new status and storage info
3. Updates `lastSeen` timestamp
4. Checks RAID array health
5. Triggers alerts if device becomes unavailable

## Configuration

### Desktop

```javascript
// In CloudSyncService instance
cloudSyncService.setHeartbeatInterval(10 * 60 * 1000); // 10 minutes
```

### Browser Extension

```javascript
// In background.js FlynasBackground constructor
this.heartbeatIntervalMinutes = 10; // 10 minutes
```

### Android

```kotlin
// In HeartbeatScheduler.kt
private const val HEARTBEAT_INTERVAL_MINUTES = 15L
```

## Monitoring & Debugging

### Desktop
Check Electron main process logs:
```
Heartbeat service started (interval: 300s)
Heartbeat sent successfully
```

### Browser Extension
Check background script console:
```javascript
chrome.alarms.getAll((alarms) => {
  console.log('Active alarms:', alarms);
});
```

### Android
Check Logcat:
```bash
adb logcat | grep "Heartbeat"
```

View WorkManager status:
```kotlin
val workInfos = WorkManager.getInstance(context)
    .getWorkInfosForUniqueWork("HeartbeatWork")
    .get()
```

## Troubleshooting

### Desktop
- **Issue**: Heartbeat not sending
- **Solution**: Check authentication status and network connectivity
- **Fallback**: Uses graceful error handling, won't crash app

### Browser Extension
- **Issue**: Alarm not firing
- **Solution**: Check extension permissions, ensure background script is active
- **Note**: Service workers may be suspended, alarms ensure execution

### Android
- **Issue**: Work not executing
- **Solution**: 
  - Check network connectivity constraint
  - Verify WorkManager dependencies in `build.gradle`
  - Check battery optimization settings
  - Review WorkInfo state and retry count

## Security Considerations

1. **Authentication**: All heartbeats require valid JWT token
2. **Data Minimization**: Only sends necessary device status info
3. **No PII**: No personally identifiable information in heartbeat data
4. **HTTPS**: All communication encrypted in production
5. **Token Refresh**: Handled automatically by CloudSyncService/CloudSyncManager

## Performance Impact

### Desktop
- **CPU**: Negligible (~0.1% spike every 5 minutes)
- **Memory**: ~1MB for HTTP request
- **Network**: ~500 bytes per heartbeat

### Browser Extension
- **CPU**: Minimal (handled by browser alarms)
- **Memory**: ~100KB during execution
- **Network**: ~500 bytes per heartbeat

### Android
- **Battery**: <1% daily (optimized with 15min interval)
- **Data**: ~1KB per day
- **Background**: WorkManager respects Doze mode

## Future Enhancements

1. **Adaptive Intervals**: Adjust frequency based on RAID health
2. **Offline Queuing**: Cache heartbeats when offline, send batch when online
3. **Health Metrics**: Include CPU, memory, network speed
4. **P2P Discovery**: Direct device-to-device heartbeats for faster failover
5. **Push Notifications**: Server-initiated status checks via WebSocket/FCM
