package com.flynas.android.ui.files

data class FileItem(
    val name: String,
    val type: String, // "folder", "pdf", "image", "text", "video", etc.
    val size: String, // Human-readable size for display
    val byteSize: Long, // Raw size in bytes for sorting
    val timestamp: Long,
    var isEncrypted: Boolean,
    var isSynced: Boolean = false
)
