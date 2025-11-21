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
        private const val BASE_URL = "http://10.0.2.2:3000" // Android emulator localhost
        // For physical devices, use: "http://YOUR_COMPUTER_IP:3000"
        private const val API_BASE = "$BASE_URL/api"
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
}
