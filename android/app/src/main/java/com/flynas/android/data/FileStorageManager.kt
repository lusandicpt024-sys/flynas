package com.flynas.android.data

import android.content.Context
import android.net.Uri
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

/**
 * Manages local file storage for Flynas
 * Handles file operations, encryption metadata, and storage locations
 */
class FileStorageManager(private val context: Context) {
    
    private val flynasDir: File by lazy {
        File(context.filesDir, "flynas_files").apply {
            if (!exists()) mkdirs()
        }
    }
    
    private val encryptedDir: File by lazy {
        File(flynasDir, "encrypted").apply {
            if (!exists()) mkdirs()
        }
    }
    
    private val metadataDir: File by lazy {
        File(flynasDir, "metadata").apply {
            if (!exists()) mkdirs()
        }
    }
    
    /**
     * Import a file from external storage
     */
    fun importFile(uri: Uri, fileName: String): File? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
            val destFile = File(flynasDir, fileName)
            
            inputStream?.use { input ->
                FileOutputStream(destFile).use { output ->
                    input.copyTo(output)
                }
            }
            
            destFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    /**
     * Get all files in Flynas storage
     */
    fun getAllFiles(): List<File> {
        return flynasDir.listFiles()?.filter { it.isFile } ?: emptyList()
    }
    
    /**
     * Get file size in human-readable format
     */
    fun getFileSize(file: File): String {
        val size = file.length()
        return when {
            size < 1024 -> "$size B"
            size < 1024 * 1024 -> "${size / 1024} KB"
            size < 1024 * 1024 * 1024 -> "${size / (1024 * 1024)} MB"
            else -> "${size / (1024 * 1024 * 1024)} GB"
        }
    }
    
    /**
     * Encrypt a file (placeholder - to be integrated with crypto module)
     */
    fun encryptFile(file: File, @Suppress("UNUSED_PARAMETER") password: String): File? {
        return try {
            val encryptedFile = File(encryptedDir, "${file.name}.enc")
            
            // For now, just copy the file
            // TODO: Integrate with shared encryption module
            FileInputStream(file).use { input ->
                FileOutputStream(encryptedFile).use { output ->
                    input.copyTo(output)
                }
            }
            
            // Save metadata
            saveFileMetadata(encryptedFile, mapOf(
                "originalName" to file.name,
                "encrypted" to "true",
                "timestamp" to System.currentTimeMillis().toString()
            ))
            
            encryptedFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    /**
     * Decrypt a file (placeholder)
     */
    fun decryptFile(encryptedFile: File, @Suppress("UNUSED_PARAMETER") password: String): File? {
        return try {
            val metadata = loadFileMetadata(encryptedFile)
            val originalName = metadata["originalName"] ?: "decrypted_${encryptedFile.name}"
            val decryptedFile = File(flynasDir, originalName)
            
            // For now, just copy the file
            // TODO: Integrate with shared encryption module
            FileInputStream(encryptedFile).use { input ->
                FileOutputStream(decryptedFile).use { output ->
                    input.copyTo(output)
                }
            }
            
            decryptedFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    /**
     * Delete a file
     */
    fun deleteFile(file: File): Boolean {
        return try {
            // Delete metadata if exists
            val metadataFile = File(metadataDir, "${file.name}.meta")
            if (metadataFile.exists()) {
                metadataFile.delete()
            }
            
            file.delete()
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
    
    /**
     * Save file metadata
     */
    fun saveFileMetadata(file: File, metadata: Map<String, String>) {
        try {
            val metadataFile = File(metadataDir, "${file.name}.meta")
            FileOutputStream(metadataFile).use { output ->
                metadata.forEach { (key, value) ->
                    output.write("$key=$value\n".toByteArray())
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Load file metadata
     */
    fun loadFileMetadata(file: File): Map<String, String> {
        return try {
            val metadataFile = File(metadataDir, "${file.name}.meta")
            if (!metadataFile.exists()) return emptyMap()
            
            val metadata = mutableMapOf<String, String>()
            FileInputStream(metadataFile).use { input ->
                input.bufferedReader().forEachLine { line ->
                    val parts = line.split("=", limit = 2)
                    if (parts.size == 2) {
                        metadata[parts[0]] = parts[1]
                    }
                }
            }
            metadata
        } catch (e: Exception) {
            e.printStackTrace()
            emptyMap()
        }
    }
    
    /**
     * Check if a file is encrypted
     */
    fun isFileEncrypted(file: File): Boolean {
        return file.name.endsWith(".enc") || 
               loadFileMetadata(file)["encrypted"] == "true"
    }
    
    /**
     * Get file type based on extension
     */
    fun getFileType(file: File): String {
        return when (file.extension.lowercase()) {
            "pdf" -> "pdf"
            "jpg", "jpeg", "png", "gif", "bmp" -> "image"
            "mp4", "avi", "mkv", "mov" -> "video"
            "mp3", "wav", "ogg", "m4a" -> "audio"
            "txt", "log", "md" -> "text"
            "zip", "rar", "7z" -> "archive"
            "doc", "docx" -> "document"
            else -> if (file.isDirectory) "folder" else "file"
        }
    }
}
