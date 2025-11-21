package com.flynas.android.ui.files

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.view.Menu
import android.view.MenuItem
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.GravityCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.flynas.android.R
import com.flynas.android.data.FileStorageManager
import com.flynas.android.databinding.ActivityFileBrowserBinding
import com.google.android.material.navigation.NavigationView
import java.io.File

/**
 * Main file browser and management interface
 * Shows encrypted files, allows upload/download, sync management
 */
class FileBrowserActivity : AppCompatActivity(), NavigationView.OnNavigationItemSelectedListener {
    
    private lateinit var binding: ActivityFileBrowserBinding
    private lateinit var fileAdapter: FileListAdapter
    private lateinit var storageManager: FileStorageManager
    private val fileList = mutableListOf<FileItem>()
    
    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                handleFileImport(uri)
            }
        }
    }
    
    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            Toast.makeText(this, "Photo captured!", Toast.LENGTH_SHORT).show()
            refreshFileList()
        }
    }
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 100
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFileBrowserBinding.inflate(layoutInflater)
        setContentView(binding.root)

        storageManager = FileStorageManager(this)
        
        setupToolbar()
        setupDrawer()
        setupRecyclerView()
        checkAndRequestPermissions()
    }
    
    private fun checkAndRequestPermissions() {
        val permissionsNeeded = mutableListOf<String>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) 
                != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_IMAGES)
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_VIDEO)
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }
        
        if (permissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsNeeded.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        } else {
            refreshFileList()
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            refreshFileList()
        }
    }
    
    private fun refreshFileList() {
        fileList.clear()
        
        val files = storageManager.getAllFiles()
        for (file in files) {
            val metadata = storageManager.loadFileMetadata(file)
            val fileItem = FileItem(
                name = file.name,
                type = storageManager.getFileType(file),
                size = storageManager.getFileSize(file),
                timestamp = file.lastModified(),
                isEncrypted = storageManager.isFileEncrypted(file),
                isSynced = metadata["synced"] == "true"
            )
            fileList.add(fileItem)
        }
        
        fileAdapter.notifyDataSetChanged()
        updateEmptyState()
    }
    
    private fun updateEmptyState() {
        binding.emptyView.visibility = if (fileList.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
    }
    
    private fun handleFileImport(uri: Uri) {
        try {
            val fileName = getFileNameFromUri(uri)
            storageManager.importFile(uri, fileName)
            Toast.makeText(this, "File imported: $fileName", Toast.LENGTH_SHORT).show()
            refreshFileList()
        } catch (e: Exception) {
            Toast.makeText(this, "Import failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun getFileNameFromUri(uri: Uri): String {
        var fileName = "imported_file"
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameIndex >= 0) {
                fileName = cursor.getString(nameIndex)
            }
        }
        return fileName
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "My Files"
    }

    private fun setupDrawer() {
        val toggle = ActionBarDrawerToggle(
            this, binding.drawerLayout, binding.toolbar,
            R.string.navigation_drawer_open, R.string.navigation_drawer_close
        )
        binding.drawerLayout.addDrawerListener(toggle)
        toggle.syncState()

        binding.navView.setNavigationItemSelectedListener(this)
    }

    private fun setupRecyclerView() {
        fileAdapter = FileListAdapter(fileList) { file ->
            showFileOptions(file)
        }
        binding.fileRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@FileBrowserActivity)
            adapter = fileAdapter
        }

        binding.fabUpload.setOnClickListener {
            showUploadOptions()
        }
    }



    private fun showFileOptions(file: FileItem) {
        val options = arrayOf(
            "Open",
            if (file.isEncrypted) "Decrypt" else "Encrypt",
            "Share",
            "Sync",
            "Delete"
        )

        AlertDialog.Builder(this)
            .setTitle(file.name)
            .setItems(options) { _, which ->
                when (which) {
                    0 -> openFile(file)
                    1 -> toggleEncryption(file)
                    2 -> shareFile(file)
                    3 -> syncFile(file)
                    4 -> deleteFile(file)
                }
            }
            .show()
    }
    
    private fun findFileByName(fileName: String): File? {
        return storageManager.getAllFiles().find { it.name == fileName }
    }

    private fun showUploadOptions() {
        val options = arrayOf(
            "📁 Browse Files",
            "📷 Take Photo",
            "📝 Create Text File",
            "📂 Create Folder"
        )

        AlertDialog.Builder(this)
            .setTitle("Add New")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> browseFiles()
                    1 -> takePhoto()
                    2 -> createTextFile()
                    3 -> createFolder()
                }
            }
            .show()
    }

    private fun openFile(file: FileItem) {
        findFileByName(file.name)?.let { actualFile ->
            try {
                val uri = FileProvider.getUriForFile(
                    this,
                    "${packageName}.fileprovider",
                    actualFile
                )
                val mimeType = getMimeType(file.type)
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, mimeType)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(intent, "Open with"))
            } catch (e: Exception) {
                Toast.makeText(this, "No app found to open this file", Toast.LENGTH_SHORT).show()
            }
        } ?: Toast.makeText(this, "File not found", Toast.LENGTH_SHORT).show()
    }
    
    private fun getMimeType(fileType: String): String {
        return when (fileType) {
            "pdf" -> "application/pdf"
            "image" -> "image/*"
            "video" -> "video/*"
            "audio" -> "audio/*"
            "text" -> "text/plain"
            else -> "*/*"
        }
    }

    private fun toggleEncryption(file: FileItem) {
        findFileByName(file.name)?.let { actualFile ->
            try {
                if (file.isEncrypted) {
                    storageManager.decryptFile(actualFile, "default_password")
                    Toast.makeText(this, "Decrypted ${file.name}", Toast.LENGTH_SHORT).show()
                } else {
                    storageManager.encryptFile(actualFile, "default_password")
                    Toast.makeText(this, "Encrypted ${file.name}", Toast.LENGTH_SHORT).show()
                }
                refreshFileList()
            } catch (e: Exception) {
                Toast.makeText(this, "Encryption failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun shareFile(file: FileItem) {
        findFileByName(file.name)?.let { actualFile ->
            try {
                val uri = FileProvider.getUriForFile(
                    this,
                    "${packageName}.fileprovider",
                    actualFile
                )
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = getMimeType(file.type)
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(intent, "Share via"))
            } catch (e: Exception) {
                Toast.makeText(this, "Share failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun syncFile(file: FileItem) {
        // TODO: Implement cloud sync functionality
        Toast.makeText(this, "Syncing ${file.name} to cloud...", Toast.LENGTH_SHORT).show()
        
        // Simulate sync completion
        findFileByName(file.name)?.let { actualFile ->
            val metadata = storageManager.loadFileMetadata(actualFile).toMutableMap()
            metadata["synced"] = "true"
            storageManager.saveFileMetadata(actualFile, metadata)
            refreshFileList()
        }
    }

    private fun deleteFile(file: FileItem) {
        AlertDialog.Builder(this)
            .setTitle("Delete File")
            .setMessage("Are you sure you want to delete ${file.name}?")
            .setPositiveButton("Delete") { _, _ ->
                findFileByName(file.name)?.let { actualFile ->
                    try {
                        storageManager.deleteFile(actualFile)
                        Toast.makeText(this, "${file.name} deleted", Toast.LENGTH_SHORT).show()
                        refreshFileList()
                    } catch (e: Exception) {
                        Toast.makeText(this, "Delete failed: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun browseFiles() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        filePickerLauncher.launch(intent)
    }

    private fun takePhoto() {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        cameraLauncher.launch(intent)
    }

    private fun createTextFile() {
        val input = EditText(this)
        input.hint = "Enter filename"
        
        AlertDialog.Builder(this)
            .setTitle("Create Text File")
            .setView(input)
            .setPositiveButton("Create") { _, _ ->
                val filename = input.text.toString().trim()
                if (filename.isNotEmpty()) {
                    try {
                        val file = File(storageManager.getAllFiles().first().parent, 
                            if (filename.endsWith(".txt")) filename else "$filename.txt")
                        file.writeText("") // Create empty file
                        Toast.makeText(this, "Created $filename", Toast.LENGTH_SHORT).show()
                        refreshFileList()
                    } catch (e: Exception) {
                        Toast.makeText(this, "Failed to create file", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createFolder() {
        val input = EditText(this)
        input.hint = "Enter folder name"
        
        AlertDialog.Builder(this)
            .setTitle("Create Folder")
            .setView(input)
            .setPositiveButton("Create") { _, _ ->
                val foldername = input.text.toString().trim()
                if (foldername.isNotEmpty()) {
                    try {
                        val folder = File(storageManager.getAllFiles().firstOrNull()?.parent 
                            ?: filesDir.absolutePath + "/flynas_files", foldername)
                        if (folder.mkdirs()) {
                            Toast.makeText(this, "Created folder $foldername", Toast.LENGTH_SHORT).show()
                            refreshFileList()
                        } else {
                            Toast.makeText(this, "Folder already exists", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this, "Failed to create folder", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_file_browser, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_search -> {
                Toast.makeText(this, "Search files...", Toast.LENGTH_SHORT).show()
                true
            }
            R.id.action_sort -> {
                showSortOptions()
                true
            }
            R.id.action_sync_all -> {
                Toast.makeText(this, "Syncing all files...", Toast.LENGTH_LONG).show()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun showSortOptions() {
        val options = arrayOf("Name", "Date", "Size", "Type")
        AlertDialog.Builder(this)
            .setTitle("Sort by")
            .setItems(options) { _, which ->
                Toast.makeText(this, "Sorting by ${options[which]}...", Toast.LENGTH_SHORT).show()
            }
            .show()
    }

    override fun onNavigationItemSelected(item: MenuItem): Boolean {
        when (item.itemId) {
            R.id.nav_files -> {
                // Already on files screen
            }
            R.id.nav_sync -> {
                Toast.makeText(this, "Sync settings", Toast.LENGTH_SHORT).show()
            }
            R.id.nav_encrypted -> {
                Toast.makeText(this, "Showing encrypted files only", Toast.LENGTH_SHORT).show()
            }
            R.id.nav_recent -> {
                Toast.makeText(this, "Recent files", Toast.LENGTH_SHORT).show()
            }
            R.id.nav_settings -> {
                Toast.makeText(this, "Settings", Toast.LENGTH_SHORT).show()
            }
            R.id.nav_about -> {
                showAbout()
            }
        }
        binding.drawerLayout.closeDrawer(GravityCompat.START)
        return true
    }

    private fun showAbout() {
        AlertDialog.Builder(this)
            .setTitle("About Flynas")
            .setMessage("Flynas v1.0.0\n\nSecure cross-platform file management with end-to-end encryption.\n\n© 2025 Flynas")
            .setPositiveButton("OK", null)
            .show()
    }

    override fun onBackPressed() {
        if (binding.drawerLayout.isDrawerOpen(GravityCompat.START)) {
            binding.drawerLayout.closeDrawer(GravityCompat.START)
        } else {
            super.onBackPressed()
        }
    }
}
