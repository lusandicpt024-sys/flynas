package com.flynas.android.ui.files

data class FileItem(
    val name: String,
    val type: String, // "folder", "pdf", "image", "text", "video", etc.
    val size: String,
    val timestamp: Long,
    var isEncrypted: Boolean,
    var isSynced: Boolean = false
)
