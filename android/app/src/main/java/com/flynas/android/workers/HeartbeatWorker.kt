package com.flynas.android.workers

import android.content.Context
import android.os.Environment
import android.os.StatFs
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.flynas.android.network.CloudSyncManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * Background worker for sending periodic heartbeat to server
 * Updates device status and availability
 */
class HeartbeatWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val cloudSyncManager = CloudSyncManager(context)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            // Check if authenticated
            val prefs = applicationContext.getSharedPreferences("flynas_auth", Context.MODE_PRIVATE)
            val authToken = prefs.getString("auth_token", null)
            
            if (authToken.isNullOrEmpty()) {
                // Not authenticated, skip heartbeat
                return@withContext Result.success()
            }

            // Get storage info
            val storageInfo = getStorageInfo()

            // Prepare heartbeat data
            val heartbeatData = JSONObject().apply {
                put("deviceId", null) // Server will identify device from token
                put("status", "online")
                put("capacity", storageInfo.total)
                put("available", storageInfo.available)
                put("lastSeen", getCurrentTimestamp())
            }

            // Send heartbeat
            val result = cloudSyncManager.sendHeartbeat(heartbeatData)

            if (result) {
                android.util.Log.d("HeartbeatWorker", "Heartbeat sent successfully")
                Result.success()
            } else {
                android.util.Log.w("HeartbeatWorker", "Failed to send heartbeat")
                Result.retry()
            }
        } catch (e: Exception) {
            android.util.Log.e("HeartbeatWorker", "Error sending heartbeat", e)
            Result.retry()
        }
    }

    private fun getStorageInfo(): StorageInfo {
        return try {
            val stat = StatFs(Environment.getDataDirectory().path)
            val bytesAvailable = stat.availableBlocksLong * stat.blockSizeLong
            val bytesTotal = stat.blockCountLong * stat.blockSizeLong
            StorageInfo(bytesTotal, bytesAvailable)
        } catch (e: Exception) {
            android.util.Log.e("HeartbeatWorker", "Error getting storage info", e)
            StorageInfo(0, 0)
        }
    }

    private fun getCurrentTimestamp(): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")
        return dateFormat.format(Date())
    }

    data class StorageInfo(val total: Long, val available: Long)
}
