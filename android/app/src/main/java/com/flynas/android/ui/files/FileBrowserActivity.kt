package com.flynas.android.ui.files

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.SharedPreferences
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
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView
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
import java.text.SimpleDateFormat
import java.util.*

/**
 * Main file browser and management interface
 * Shows encrypted files, allows upload/download, sync management
 */
class FileBrowserActivity : AppCompatActivity(), NavigationView.OnNavigationItemSelectedListener {
    
    private lateinit var binding: ActivityFileBrowserBinding
    private lateinit var fileAdapter: FileListAdapter
    private lateinit var storageManager: FileStorageManager
    private val fileList = mutableListOf<FileItem>()
    private val allFilesList = mutableListOf<FileItem>()
    private var currentPhotoUri: Uri? = null
    private lateinit var prefs: SharedPreferences
    private var currentFilter: FileFilter = FileFilter.ALL
    
    enum class FileFilter {
        ALL, ENCRYPTED, RECENT
    }
    
    enum class SortCriteria {
        NAME, DATE, SIZE, TYPE
    }
    
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
            currentPhotoUri?.let { uri ->
                try {
                    // Copy photo from temp location to flynas storage
                    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
                    val fileName = "IMG_$timestamp.jpg"
                    storageManager.importFile(uri, fileName)
                    Toast.makeText(this, "Photo saved: $fileName", Toast.LENGTH_SHORT).show()
                    refreshFileList()
                } catch (e: Exception) {
                    Toast.makeText(this, "Failed to save photo: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 100
        private const val CAMERA_PERMISSION_REQUEST_CODE = 101
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFileBrowserBinding.inflate(layoutInflater)
        setContentView(binding.root)

        storageManager = FileStorageManager(this)
        prefs = getSharedPreferences("flynas_prefs", MODE_PRIVATE)
        
        // Ensure flynas directory is initialized
        storageManager.initializeDirectories()
        
        setupToolbar()
        setupDrawer()
        setupRecyclerView()
        setupBackPressHandler()
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
        when (requestCode) {
            PERMISSION_REQUEST_CODE -> {
                // After storage permissions, request camera permission
                requestCameraPermission()
            }
            CAMERA_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "Camera permission granted", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Camera permission denied - photo capture disabled", Toast.LENGTH_SHORT).show()
                }
                refreshFileList()
            }
        }
    }
    
    private fun requestCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_PERMISSION_REQUEST_CODE
            )
        } else {
            // Camera permission already granted
            refreshFileList()
        }
    }
    
    private fun refreshFileList() {
        allFilesList.clear()
        
        val files = storageManager.getAllFiles()
        for (file in files) {
            val metadata = storageManager.loadFileMetadata(file)
            val fileItem = FileItem(
                name = file.name,
                type = storageManager.getFileType(file),
                size = storageManager.getFileSize(file),
                byteSize = file.length(),
                timestamp = file.lastModified(),
                isEncrypted = storageManager.isFileEncrypted(file),
                isSynced = metadata["synced"] == "true"
            )
            allFilesList.add(fileItem)
        }
        
        applyFilterAndSort()
    }
    
    private fun applyFilterAndSort() {
        fileList.clear()
        
        // Apply filter
        val filteredList = when (currentFilter) {
            FileFilter.ENCRYPTED -> allFilesList.filter { it.isEncrypted }
            FileFilter.RECENT -> {
                val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000)
                allFilesList.filter { it.timestamp >= sevenDaysAgo }
            }
            FileFilter.ALL -> allFilesList
        }
        
        // Apply sort
        val sortCriteria = SortCriteria.valueOf(prefs.getString("sort_criteria", "NAME") ?: "NAME")
        val sortAscending = prefs.getBoolean("sort_ascending", true)
        
        val sortedList = when (sortCriteria) {
            SortCriteria.NAME -> filteredList.sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.name })
            SortCriteria.DATE -> filteredList.sortedBy { it.timestamp }
            SortCriteria.SIZE -> filteredList.sortedBy { it.byteSize }
            SortCriteria.TYPE -> filteredList.sortedBy { it.type }
        }
        
        fileList.addAll(if (sortAscending) sortedList else sortedList.reversed())
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
        try {
            // Create a temporary file for the photo
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val photoFile = File(cacheDir, "TEMP_$timestamp.jpg")
            
            currentPhotoUri = FileProvider.getUriForFile(
                this,
                "${packageName}.fileprovider",
                photoFile
            )
            
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, currentPhotoUri)
            }
            cameraLauncher.launch(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Failed to open camera: ${e.message}", Toast.LENGTH_SHORT).show()
        }
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
                        val finalFilename = if (filename.endsWith(".txt")) filename else "$filename.txt"
                        val flynasDir = File(filesDir, "flynas_files")
                        val file = File(flynasDir, finalFilename)
                        
                        // Create file with heading content
                        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                        val createdDate = dateFormat.format(Date())
                        val content = """$filename

Created: $createdDate

---

"""
                        file.writeText(content, Charsets.UTF_8)
                        
                        Toast.makeText(this, "Created $finalFilename", Toast.LENGTH_SHORT).show()
                        refreshFileList()
                        
                        // Optionally open the file in external editor
                        openFileInEditor(file)
                    } catch (e: Exception) {
                        Toast.makeText(this, "Failed to create file: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun openFileInEditor(file: File) {
        // Launch in-app editor for .txt files; fallback to external if not text
        if (file.extension.lowercase() == "txt") {
            val intent = Intent(this, com.flynas.android.ui.editor.TextEditorActivity::class.java).apply {
                putExtra(com.flynas.android.ui.editor.TextEditorActivity.EXTRA_FILE_NAME, file.name)
                putExtra(com.flynas.android.ui.editor.TextEditorActivity.EXTRA_CREATE_NEW, false)
            }
            startActivity(intent)
        } else {
            try {
                val uri = FileProvider.getUriForFile(
                    this,
                    "${packageName}.fileprovider",
                    file
                )
                val intent = Intent(Intent.ACTION_EDIT).apply {
                    setDataAndType(uri, "text/plain")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(intent, "Edit with"))
            } catch (e: Exception) {
                // silent
            }
        }
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
        
        // Setup search view
        val searchItem = menu?.findItem(R.id.action_search)
        val searchView = searchItem?.actionView as? SearchView
        
        searchView?.apply {
            queryHint = "Search files..."
            setOnQueryTextListener(object : SearchView.OnQueryTextListener {
                override fun onQueryTextSubmit(query: String?): Boolean {
                    return false
                }
                
                override fun onQueryTextChange(newText: String?): Boolean {
                    filterFiles(newText ?: "")
                    return true
                }
            })
            
            setOnCloseListener {
                filterFiles("")
                false
            }
        }
        
        return true
    }
    
    private fun filterFiles(query: String) {
        fileList.clear()
        
        if (query.isEmpty()) {
            applyFilterAndSort()
        } else {
            val filtered = allFilesList.filter {
                it.name.contains(query, ignoreCase = true) ||
                it.type.contains(query, ignoreCase = true)
            }
            fileList.addAll(filtered)
            fileAdapter.notifyDataSetChanged()
        }
        
        updateEmptyState()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_search -> {
                // Search view is handled in onCreateOptionsMenu
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
        val currentCriteria = SortCriteria.valueOf(prefs.getString("sort_criteria", "NAME") ?: "NAME")
        val currentAscending = prefs.getBoolean("sort_ascending", true)
        
        val options = arrayOf(
            "Name (A-Z)",
            "Name (Z-A)",
            "Date (Oldest First)",
            "Date (Newest First)",
            "Size (Smallest First)",
            "Size (Largest First)",
            "Type (A-Z)",
            "Type (Z-A)"
        )
        
        val currentSelection = when (currentCriteria) {
            SortCriteria.NAME -> if (currentAscending) 0 else 1
            SortCriteria.DATE -> if (currentAscending) 2 else 3
            SortCriteria.SIZE -> if (currentAscending) 4 else 5
            SortCriteria.TYPE -> if (currentAscending) 6 else 7
        }
        
        AlertDialog.Builder(this)
            .setTitle("Sort by")
            .setSingleChoiceItems(options, currentSelection) { dialog, which ->
                val (criteria, ascending) = when (which) {
                    0 -> Pair(SortCriteria.NAME, true)
                    1 -> Pair(SortCriteria.NAME, false)
                    2 -> Pair(SortCriteria.DATE, true)
                    3 -> Pair(SortCriteria.DATE, false)
                    4 -> Pair(SortCriteria.SIZE, true)
                    5 -> Pair(SortCriteria.SIZE, false)
                    6 -> Pair(SortCriteria.TYPE, true)
                    7 -> Pair(SortCriteria.TYPE, false)
                    else -> Pair(SortCriteria.NAME, true)
                }
                
                prefs.edit()
                    .putString("sort_criteria", criteria.name)
                    .putBoolean("sort_ascending", ascending)
                    .apply()
                
                applyFilterAndSort()
                Toast.makeText(this, "Sorted by ${options[which]}", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onNavigationItemSelected(item: MenuItem): Boolean {
        when (item.itemId) {
            R.id.nav_files -> {
                currentFilter = FileFilter.ALL
                supportActionBar?.title = "My Files"
                applyFilterAndSort()
            }
            R.id.nav_sync -> {
                showSyncStatus()
            }
            R.id.nav_encrypted -> {
                currentFilter = FileFilter.ENCRYPTED
                supportActionBar?.title = "Encrypted Files"
                applyFilterAndSort()
                Toast.makeText(this, "Showing encrypted files only", Toast.LENGTH_SHORT).show()
            }
            R.id.nav_recent -> {
                currentFilter = FileFilter.RECENT
                supportActionBar?.title = "Recent Files"
                applyFilterAndSort()
                Toast.makeText(this, "Showing files from last 7 days", Toast.LENGTH_SHORT).show()
            }
            R.id.nav_settings -> {
                showSettings()
            }
            R.id.nav_about -> {
                showAbout()
            }
        }
        binding.drawerLayout.closeDrawer(GravityCompat.START)
        return true
    }
    
    private fun showSyncStatus() {
        val syncedFiles = allFilesList.filter { it.isSynced }
        val unsyncedFiles = allFilesList.filter { !it.isSynced }
        
        val message = """Sync Status:
            |
            |✓ Synced: ${syncedFiles.size} files
            |⏳ Not synced: ${unsyncedFiles.size} files
            |
            |Total: ${allFilesList.size} files
        """.trimMargin()
        
        AlertDialog.Builder(this)
            .setTitle("Sync Status")
            .setMessage(message)
            .setPositiveButton("Sync All") { _, _ ->
                Toast.makeText(this, "Syncing all files to cloud...", Toast.LENGTH_SHORT).show()
                // TODO: Implement actual sync functionality
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showSettings() {
        val options = arrayOf(
            "Storage Location: Internal",
            "Auto-Sync: Enabled",
            "Encryption: AES-256",
            "Sync Interval: 15 minutes",
            "Clear Cache"
        )
        
        AlertDialog.Builder(this)
            .setTitle("Settings")
            .setItems(options) { _, which ->
                when (which) {
                    4 -> {
                        // Clear cache
                        cacheDir.deleteRecursively()
                        Toast.makeText(this, "Cache cleared", Toast.LENGTH_SHORT).show()
                    }
                    else -> {
                        Toast.makeText(this, "Setting: ${options[which]}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun showAbout() {
        AlertDialog.Builder(this)
            .setTitle("About Flynas")
            .setMessage("Flynas v1.0.0\n\nSecure cross-platform file management with end-to-end encryption.\n\n© 2025 Flynas")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun setupBackPressHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    binding.drawerLayout.closeDrawer(GravityCompat.START)
                } else {
                    finish()
                }
            }
        })
    }
}
