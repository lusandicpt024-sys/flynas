package com.flynas.android.ui.files

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.flynas.android.databinding.ItemFileBinding
import java.text.SimpleDateFormat
import java.util.*

class FileListAdapter(
    private val files: List<FileItem>,
    private val onFileClick: (FileItem) -> Unit
) : RecyclerView.Adapter<FileListAdapter.FileViewHolder>() {

    inner class FileViewHolder(private val binding: ItemFileBinding) : 
        RecyclerView.ViewHolder(binding.root) {
        
        fun bind(file: FileItem) {
            binding.fileName.text = file.name
            binding.fileSize.text = file.size
            binding.fileDate.text = formatDate(file.timestamp)
            
            // Set icon based on file type
            binding.fileIcon.text = when (file.type) {
                "folder" -> "📁"
                "pdf" -> "📄"
                "image" -> "🖼️"
                "text" -> "📝"
                "video" -> "🎥"
                "audio" -> "🎵"
                else -> "📄"
            }
            
            // Show encryption status
            binding.encryptionIcon.visibility = if (file.isEncrypted) 
                android.view.View.VISIBLE else android.view.View.GONE
            
            binding.root.setOnClickListener {
                onFileClick(file)
            }
        }
        
        private fun formatDate(timestamp: Long): String {
            val sdf = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
            return sdf.format(Date(timestamp))
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FileViewHolder {
        val binding = ItemFileBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return FileViewHolder(binding)
    }

    override fun onBindViewHolder(holder: FileViewHolder, position: Int) {
        holder.bind(files[position])
    }

    override fun getItemCount() = files.size
}
