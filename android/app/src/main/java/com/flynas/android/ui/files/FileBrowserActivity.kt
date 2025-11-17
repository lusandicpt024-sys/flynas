package com.flynas.android.ui.files

import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.GravityCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.flynas.android.R
import com.flynas.android.databinding.ActivityFileBrowserBinding
import com.google.android.material.navigation.NavigationView

/**
 * Main file browser and management interface
 * Shows encrypted files, allows upload/download, sync management
 */
class FileBrowserActivity : AppCompatActivity(), NavigationView.OnNavigationItemSelectedListener {
    
    private lateinit var binding: ActivityFileBrowserBinding
    private lateinit var fileAdapter: FileListAdapter
    private val fileList = mutableListOf<FileItem>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFileBrowserBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupDrawer()
        setupRecyclerView()
        loadSampleFiles()
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

    private fun loadSampleFiles() {
        fileList.clear()
        fileList.addAll(listOf(
            FileItem("Documents", "folder", "5 items", System.currentTimeMillis(), true),
            FileItem("Photos", "folder", "12 items", System.currentTimeMillis(), true),
            FileItem("project_report.pdf", "pdf", "2.4 MB", System.currentTimeMillis() - 86400000, true),
            FileItem("vacation_photo.jpg", "image", "1.8 MB", System.currentTimeMillis() - 172800000, false),
            FileItem("notes.txt", "text", "12 KB", System.currentTimeMillis() - 259200000, true)
        ))
        fileAdapter.notifyDataSetChanged()
        
        binding.emptyView.visibility = if (fileList.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
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
        Toast.makeText(this, "Opening ${file.name}...", Toast.LENGTH_SHORT).show()
    }

    private fun toggleEncryption(file: FileItem) {
        val action = if (file.isEncrypted) "Decrypting" else "Encrypting"
        Toast.makeText(this, "$action ${file.name}...", Toast.LENGTH_SHORT).show()
        file.isEncrypted = !file.isEncrypted
        fileAdapter.notifyDataSetChanged()
    }

    private fun shareFile(file: FileItem) {
        Toast.makeText(this, "Sharing ${file.name}...", Toast.LENGTH_SHORT).show()
    }

    private fun syncFile(file: FileItem) {
        Toast.makeText(this, "Syncing ${file.name} to cloud...", Toast.LENGTH_SHORT).show()
    }

    private fun deleteFile(file: FileItem) {
        AlertDialog.Builder(this)
            .setTitle("Delete File")
            .setMessage("Are you sure you want to delete ${file.name}?")
            .setPositiveButton("Delete") { _, _ ->
                fileList.remove(file)
                fileAdapter.notifyDataSetChanged()
                Toast.makeText(this, "${file.name} deleted", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun browseFiles() {
        Toast.makeText(this, "Opening file picker...", Toast.LENGTH_SHORT).show()
    }

    private fun takePhoto() {
        Toast.makeText(this, "Opening camera...", Toast.LENGTH_SHORT).show()
    }

    private fun createTextFile() {
        Toast.makeText(this, "Creating new text file...", Toast.LENGTH_SHORT).show()
    }

    private fun createFolder() {
        Toast.makeText(this, "Creating new folder...", Toast.LENGTH_SHORT).show()
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
