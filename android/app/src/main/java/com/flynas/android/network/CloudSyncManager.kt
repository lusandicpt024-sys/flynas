package com.flynas.android.network

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException

/**
 * Network client for communicating with Flynas backend API
 */
class CloudSyncManager(private val context: Context) {
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    
    private val prefs = context.getSharedPreferences("flynas_auth", Context.MODE_PRIVATE)
    
    companion object {
        // Default to emulator localhost - change to your computer's IP for physical devices
        // Examples: 
        // - Emulator: "http://10.0.2.2:3000"
        // - Physical device: "http://192.168.1.100:3000" or "http://10.0.0.2:3000"
        private const val BASE_URL = "http://10.0.2.2:3000"
        private const val API_BASE = "$BASE_URL/api"
        
        // To test on physical device, change BASE_URL above to your computer's local IP
        // Find your IP: Linux/Mac: `ip addr` or `ifconfig`, Windows: `ipconfig`
    }
    
    data class AuthResult(
        val success: Boolean,
        val token: String? = null,
        val error: String? = null,
        val user: User? = null
    )
    
    data class User(
        val id: String,
        val username: String,
        val email: String
    )
    
    data class FileMetadata(
        val id: String,
        val name: String,
        val size: Long,
        val mimeType: String?,
        val isEncrypted: Boolean,
        val isSynced: Boolean,
        val createdAt: String,
        val updatedAt: String
    )
    
    data class SyncResult(
        val success: Boolean,
        val changes: List<FileMetadata>? = null,
        val error: String? = null
    )
    
    /**
     * Register new user
     */
    suspend fun register(username: String, email: String, password: String): AuthResult {
        return withContext(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("username", username)
                    put("email", email)
                    put("password", password)
                }
                
                val requestBody = json.toString()
                    .toRequestBody("application/json".toMediaType())
                
                val request = Request.Builder()
                    .url("$API_BASE/auth/register")
                    .post(requestBody)
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                val responseJson = JSONObject(responseBody)
                
                if (response.isSuccessful) {
                    val token = responseJson.getString("token")
                    val userObj = responseJson.getJSONObject("user")
                    
                    // Save token
                    prefs.edit().putString("auth_token", token).apply()
                    
                    AuthResult(
                        success = true,
                        token = token,
                        user = User(
                            id = userObj.getString("id"),
                            username = userObj.getString("username"),
                            email = userObj.getString("email")
                        )
                    )
                } else {
                    AuthResult(
                        success = false,
                        error = responseJson.optString("error", "Registration failed")
                    )
                }
            } catch (e: Exception) {
                AuthResult(success = false, error = e.message ?: "Network error")
            }
        }
    }
    
    /**
     * Login user
     */
    suspend fun login(username: String, password: String): AuthResult {
        return withContext(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("username", username)
                    put("password", password)
                }
                
                val requestBody = json.toString()
                    .toRequestBody("application/json".toMediaType())
                
                val request = Request.Builder()
                    .url("$API_BASE/auth/login")
                    .post(requestBody)
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                val responseJson = JSONObject(responseBody)
                
                if (response.isSuccessful) {
                    val token = responseJson.getString("token")
                    val userObj = responseJson.getJSONObject("user")
                    
                    // Save token
                    prefs.edit().putString("auth_token", token).apply()
                    
                    AuthResult(
                        success = true,
                        token = token,
                        user = User(
                            id = userObj.getString("id"),
                            username = userObj.getString("username"),
                            email = userObj.getString("email")
                        )
                    )
                } else {
                    AuthResult(
                        success = false,
                        error = responseJson.optString("error", "Login failed")
                    )
                }
            } catch (e: Exception) {
                AuthResult(success = false, error = e.message ?: "Network error")
            }
        }
    }
    
    /**
     * Upload file to cloud
     */
    suspend fun uploadFile(file: File, isEncrypted: Boolean = false): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext Result.failure(Exception("Not authenticated"))
                
                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart(
                        "file",
                        file.name,
                        file.asRequestBody("application/octet-stream".toMediaType())
                    )
                    .addFormDataPart("isEncrypted", isEncrypted.toString())
                    .build()
                
                val request = Request.Builder()
                    .url("$API_BASE/files/upload")
                    .addHeader("Authorization", "Bearer $token")
                    .post(requestBody)
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                
                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val fileObj = responseJson.getJSONObject("file")
                    Result.success(fileObj.getString("id"))
                } else {
                    val errorJson = JSONObject(responseBody)
                    Result.failure(Exception(errorJson.optString("error", "Upload failed")))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Download file from cloud
     */
    suspend fun downloadFile(fileId: String, destination: File): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext Result.failure(Exception("Not authenticated"))
                
                val request = Request.Builder()
                    .url("$API_BASE/files/$fileId")
                    .addHeader("Authorization", "Bearer $token")
                    .get()
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    response.body?.byteStream()?.use { input ->
                        destination.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Download failed"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Get list of files from cloud
     */
    suspend fun listFiles(): Result<List<FileMetadata>> {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext Result.failure(Exception("Not authenticated"))
                
                val request = Request.Builder()
                    .url("$API_BASE/files")
                    .addHeader("Authorization", "Bearer $token")
                    .get()
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                
                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val filesArray = responseJson.getJSONArray("files")
                    val files = mutableListOf<FileMetadata>()
                    
                    for (i in 0 until filesArray.length()) {
                        val fileObj = filesArray.getJSONObject(i)
                        files.add(
                            FileMetadata(
                                id = fileObj.getString("id"),
                                name = fileObj.getString("name"),
                                size = fileObj.getLong("size"),
                                mimeType = fileObj.optString("mimeType"),
                                isEncrypted = fileObj.getBoolean("isEncrypted"),
                                isSynced = fileObj.getBoolean("isSynced"),
                                createdAt = fileObj.getString("createdAt"),
                                updatedAt = fileObj.getString("updatedAt")
                            )
                        )
                    }
                    
                    Result.success(files)
                } else {
                    Result.failure(Exception("Failed to fetch files"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Delete file from cloud
     */
    suspend fun deleteFile(fileId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext Result.failure(Exception("Not authenticated"))
                
                val request = Request.Builder()
                    .url("$API_BASE/files/$fileId")
                    .addHeader("Authorization", "Bearer $token")
                    .delete()
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Delete failed"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Sync changes since last sync
     */
    suspend fun syncChanges(since: String? = null): SyncResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext SyncResult(success = false, error = "Not authenticated")
                
                val url = if (since != null) {
                    "$API_BASE/files/sync/changes?since=$since"
                } else {
                    "$API_BASE/files/sync/changes"
                }
                
                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer $token")
                    .get()
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                
                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val changesArray = responseJson.getJSONArray("changes")
                    val changes = mutableListOf<FileMetadata>()
                    
                    for (i in 0 until changesArray.length()) {
                        val fileObj = changesArray.getJSONObject(i)
                        changes.add(
                            FileMetadata(
                                id = fileObj.getString("id"),
                                name = fileObj.getString("name"),
                                size = fileObj.getLong("size"),
                                mimeType = fileObj.optString("mimeType"),
                                isEncrypted = fileObj.getBoolean("isEncrypted"),
                                isSynced = fileObj.getBoolean("isSynced"),
                                createdAt = fileObj.getString("createdAt"),
                                updatedAt = fileObj.getString("updatedAt")
                            )
                        )
                    }
                    
                    SyncResult(success = true, changes = changes)
                } else {
                    SyncResult(success = false, error = "Sync failed")
                }
            } catch (e: Exception) {
                SyncResult(success = false, error = e.message)
            }
        }
    }
    
    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean {
        return prefs.getString("auth_token", null) != null
    }
    
    /**
     * Logout user
     */
    fun logout() {
        prefs.edit().remove("auth_token").apply()
    }

    // ===== RAID Device Management =====

    data class Device(
        val deviceId: String,
        val deviceName: String,
        val deviceType: String,
        val platform: String,
        val status: String,
        val storageCapacity: Long? = null,
        val storageAvailable: Long? = null,
        val lastSeen: String
    )

    data class DeviceResult(
        val success: Boolean,
        val device: Device? = null,
        val devices: List<Device>? = null,
        val error: String? = null
    )

    /**
     * Register this device for RAID
     */
    suspend fun registerDevice(
        deviceName: String,
        deviceType: String,
        platform: String,
        storageCapacity: Long? = null,
        storageAvailable: Long? = null
    ): DeviceResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext DeviceResult(success = false, error = "Not authenticated")

                val json = JSONObject().apply {
                    put("device_name", deviceName)
                    put("device_type", deviceType)
                    put("platform", platform)
                    storageCapacity?.let { put("storage_capacity", it) }
                    storageAvailable?.let { put("storage_available", it) }
                }

                val requestBody = json.toString().toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$API_BASE/devices/register")
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val deviceObj = responseJson.getJSONObject("device")
                    
                    val device = Device(
                        deviceId = deviceObj.getString("device_id"),
                        deviceName = deviceObj.getString("device_name"),
                        deviceType = deviceObj.getString("device_type"),
                        platform = deviceObj.getString("platform"),
                        status = deviceObj.getString("status"),
                        storageCapacity = deviceObj.optLong("storage_capacity"),
                        storageAvailable = deviceObj.optLong("storage_available"),
                        lastSeen = deviceObj.getString("last_seen")
                    )
                    
                    DeviceResult(success = true, device = device)
                } else {
                    val responseJson = JSONObject(responseBody)
                    DeviceResult(success = false, error = responseJson.optString("error", "Device registration failed"))
                }
            } catch (e: Exception) {
                DeviceResult(success = false, error = e.message)
            }
        }
    }

    /**
     * List all registered devices
     */
    suspend fun listDevices(): DeviceResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext DeviceResult(success = false, error = "Not authenticated")

                val request = Request.Builder()
                    .url("$API_BASE/devices/list")
                    .get()
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val devicesArray = responseJson.getJSONArray("devices")
                    val devices = mutableListOf<Device>()

                    for (i in 0 until devicesArray.length()) {
                        val deviceObj = devicesArray.getJSONObject(i)
                        devices.add(
                            Device(
                                deviceId = deviceObj.getString("device_id"),
                                deviceName = deviceObj.getString("device_name"),
                                deviceType = deviceObj.getString("device_type"),
                                platform = deviceObj.getString("platform"),
                                status = deviceObj.getString("status"),
                                storageCapacity = deviceObj.optLong("storage_capacity"),
                                storageAvailable = deviceObj.optLong("storage_available"),
                                lastSeen = deviceObj.getString("last_seen")
                            )
                        )
                    }

                    DeviceResult(success = true, devices = devices)
                } else {
                    DeviceResult(success = false, error = "Failed to list devices")
                }
            } catch (e: Exception) {
                DeviceResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Send heartbeat for device
     */
    suspend fun sendHeartbeat(deviceId: String, storageAvailable: Long? = null): DeviceResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext DeviceResult(success = false, error = "Not authenticated")

                val json = JSONObject().apply {
                    storageAvailable?.let { put("storage_available", it) }
                }

                val requestBody = json.toString().toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$API_BASE/devices/$deviceId/heartbeat")
                    .put(requestBody)
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    DeviceResult(success = true)
                } else {
                    DeviceResult(success = false, error = "Heartbeat failed")
                }
            } catch (e: Exception) {
                DeviceResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Unregister a device
     */
    suspend fun unregisterDevice(deviceId: String): DeviceResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext DeviceResult(success = false, error = "Not authenticated")

                val request = Request.Builder()
                    .url("$API_BASE/devices/$deviceId/unregister")
                    .delete()
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    DeviceResult(success = true)
                } else {
                    DeviceResult(success = false, error = "Unregister failed")
                }
            } catch (e: Exception) {
                DeviceResult(success = false, error = e.message)
            }
        }
    }

    // ===== RAID Configuration =====

    data class RaidConfig(
        val configId: String,
        val raidLevel: String,
        val chunkSize: Int,
        val minDevices: Int,
        val active: Boolean
    )

    data class RaidStatus(
        val configured: Boolean,
        val config: RaidConfig? = null,
        val health: String? = null,
        val onlineDevices: Int? = null,
        val totalDevices: Int? = null
    )

    data class RaidResult(
        val success: Boolean,
        val config: RaidConfig? = null,
        val status: RaidStatus? = null,
        val message: String? = null,
        val error: String? = null
    )

    /**
     * Configure RAID for user
     */
    suspend fun configureRaid(raidLevel: String, chunkSize: Int, deviceIds: List<String>): RaidResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext RaidResult(success = false, error = "Not authenticated")

                val json = JSONObject().apply {
                    put("raid_level", raidLevel)
                    put("chunk_size", chunkSize)
                    put("device_ids", JSONArray(deviceIds))
                }

                val requestBody = json.toString().toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$API_BASE/raid/configure")
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val configObj = responseJson.getJSONObject("config")
                    
                    val config = RaidConfig(
                        configId = configObj.getString("config_id"),
                        raidLevel = configObj.getString("raid_level"),
                        chunkSize = configObj.getInt("chunk_size"),
                        minDevices = configObj.getInt("min_devices"),
                        active = configObj.getBoolean("active")
                    )
                    
                    RaidResult(success = true, config = config)
                } else {
                    val responseJson = JSONObject(responseBody)
                    RaidResult(success = false, error = responseJson.optString("error", "RAID configuration failed"))
                }
            } catch (e: Exception) {
                RaidResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Get RAID status
     */
    suspend fun getRaidStatus(): RaidResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext RaidResult(success = false, error = "Not authenticated")

                val request = Request.Builder()
                    .url("$API_BASE/raid/status")
                    .get()
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val configured = responseJson.getBoolean("configured")

                    val status = if (configured) {
                        val configObj = responseJson.getJSONObject("config")
                        RaidStatus(
                            configured = true,
                            config = RaidConfig(
                                configId = configObj.getString("config_id"),
                                raidLevel = configObj.getString("raid_level"),
                                chunkSize = configObj.getInt("chunk_size"),
                                minDevices = configObj.getInt("min_devices"),
                                active = configObj.getBoolean("active")
                            ),
                            health = responseJson.optString("health"),
                            onlineDevices = responseJson.optInt("online_devices"),
                            totalDevices = responseJson.optInt("total_devices")
                        )
                    } else {
                        RaidStatus(configured = false)
                    }

                    RaidResult(success = true, status = status)
                } else {
                    RaidResult(success = false, error = "Failed to get RAID status")
                }
            } catch (e: Exception) {
                RaidResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Heal RAID array
     */
    suspend fun healRaid(): RaidResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext RaidResult(success = false, error = "Not authenticated")

                val request = Request.Builder()
                    .url("$API_BASE/raid/heal")
                    .put(RequestBody.create(null, ByteArray(0)))
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    RaidResult(
                        success = true,
                        message = responseJson.optString("message", "Healing initiated")
                    )
                } else {
                    RaidResult(success = false, error = "Healing failed")
                }
            } catch (e: Exception) {
                RaidResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Reconstruct file from RAID
     */
    suspend fun reconstructFile(fileId: String): RaidResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext RaidResult(success = false, error = "Not authenticated")

                val json = JSONObject().apply {
                    put("file_id", fileId)
                }

                val requestBody = json.toString().toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$API_BASE/raid/reconstruct")
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    RaidResult(
                        success = true,
                        message = responseJson.optString("message", "Reconstruction initiated")
                    )
                } else {
                    RaidResult(success = false, error = "Reconstruction failed")
                }
            } catch (e: Exception) {
                RaidResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Delete RAID configuration
     */
    suspend fun deleteRaidConfig(): RaidResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext RaidResult(success = false, error = "Not authenticated")

                val request = Request.Builder()
                    .url("$API_BASE/raid/configure")
                    .delete()
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    RaidResult(success = true, message = "RAID configuration deleted")
                } else {
                    RaidResult(success = false, error = "Failed to delete RAID configuration")
                }
            } catch (e: Exception) {
                RaidResult(success = false, error = e.message)
            }
        }
    }

    // ===== Chunk Management =====

    data class ChunkInfo(
        val chunkId: String,
        val hash: String,
        val size: Int
    )

    data class ChunkResult(
        val success: Boolean,
        val chunkInfo: ChunkInfo? = null,
        val data: ByteArray? = null,
        val hash: String? = null,
        val valid: Boolean? = null,
        val error: String? = null
    )

    /**
     * Upload chunk to device
     */
    suspend fun uploadChunk(
        chunkId: String,
        fileId: String,
        chunkIndex: Int,
        deviceId: String,
        chunkData: ByteArray
    ): ChunkResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext ChunkResult(success = false, error = "Not authenticated")

                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("chunk_id", chunkId)
                    .addFormDataPart("file_id", fileId)
                    .addFormDataPart("chunk_index", chunkIndex.toString())
                    .addFormDataPart("device_id", deviceId)
                    .addFormDataPart(
                        "chunk",
                        "chunk.bin",
                        chunkData.toRequestBody("application/octet-stream".toMediaType())
                    )
                    .build()

                val request = Request.Builder()
                    .url("$API_BASE/chunks/upload")
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val chunkInfo = ChunkInfo(
                        chunkId = responseJson.getString("chunk_id"),
                        hash = responseJson.getString("hash"),
                        size = responseJson.getInt("size")
                    )
                    ChunkResult(success = true, chunkInfo = chunkInfo)
                } else {
                    ChunkResult(success = false, error = "Chunk upload failed")
                }
            } catch (e: Exception) {
                ChunkResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Download chunk from device
     */
    suspend fun downloadChunk(chunkId: String, deviceId: String): ChunkResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext ChunkResult(success = false, error = "Not authenticated")

                val request = Request.Builder()
                    .url("$API_BASE/chunks/$chunkId/download?device_id=$deviceId")
                    .get()
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    val data = response.body?.bytes()
                    val hash = response.header("X-Chunk-Hash")
                    ChunkResult(success = true, data = data, hash = hash)
                } else {
                    ChunkResult(success = false, error = "Chunk download failed")
                }
            } catch (e: Exception) {
                ChunkResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Verify chunk integrity
     */
    suspend fun verifyChunk(chunkId: String, deviceId: String): ChunkResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext ChunkResult(success = false, error = "Not authenticated")

                val json = JSONObject().apply {
                    put("chunk_id", chunkId)
                    put("device_id", deviceId)
                }

                val requestBody = json.toString().toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$API_BASE/chunks/verify")
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""

                if (response.isSuccessful) {
                    val responseJson = JSONObject(responseBody)
                    val valid = responseJson.getBoolean("valid")
                    ChunkResult(success = true, valid = valid)
                } else {
                    ChunkResult(success = false, error = "Chunk verification failed")
                }
            } catch (e: Exception) {
                ChunkResult(success = false, error = e.message)
            }
        }
    }

    /**
     * Delete chunk
     */
    suspend fun deleteChunk(chunkId: String, deviceId: String): ChunkResult {
        return withContext(Dispatchers.IO) {
            try {
                val token = prefs.getString("auth_token", null)
                    ?: return@withContext ChunkResult(success = false, error = "Not authenticated")

                val request = Request.Builder()
                    .url("$API_BASE/chunks/$chunkId?device_id=$deviceId")
                    .delete()
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    ChunkResult(success = true)
                } else {
                    ChunkResult(success = false, error = "Chunk deletion failed")
                }
            } catch (e: Exception) {
                ChunkResult(success = false, error = e.message)
            }
        }
    }
}
