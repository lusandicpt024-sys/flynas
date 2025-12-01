package com.flynas.android.ui.editor

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.flynas.android.R
import com.flynas.android.databinding.ActivityTextEditorBinding
import java.io.File

/**
 * Simple in-app text editor for .txt files stored under flynas_files.
 */
class TextEditorActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTextEditorBinding
    private lateinit var targetFile: File
    private var isNewFile: Boolean = false
    private var dirty: Boolean = false
    private val undoStack = ArrayDeque<String>()
    private val redoStack = ArrayDeque<String>()
    private val maxHistory = 50
    private val autosaveHandler = Handler(Looper.getMainLooper())
    private var pendingAutosave: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTextEditorBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.editorToolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val fileName = intent.getStringExtra(EXTRA_FILE_NAME)
        val createNew = intent.getBooleanExtra(EXTRA_CREATE_NEW, false)
        if (fileName.isNullOrBlank()) {
            Toast.makeText(this, "No file specified", Toast.LENGTH_SHORT).show()
            finish(); return
        }

        val dir = File(filesDir, "flynas_files")
        targetFile = File(dir, fileName)
        isNewFile = createNew && !targetFile.exists()

        binding.filenameView.text = fileName

        if (targetFile.exists()) {
            // Load
            try {
                binding.editorText.setText(targetFile.readText())
            } catch (e: Exception) {
                Toast.makeText(this, "Failed to load file", Toast.LENGTH_SHORT).show()
            }
        } else if (isNewFile) {
            // Create an empty file with heading
            try {
                targetFile.parentFile?.mkdirs()
                val heading = "$fileName\n\n---\n\n"
                targetFile.writeText(heading)
                binding.editorText.setText(heading)
            } catch (e: Exception) {
                Toast.makeText(this, "Failed to create file", Toast.LENGTH_SHORT).show()
            }
        }

        binding.saveButton.setOnClickListener { saveFile() }

        setupEditing()
    }

    private fun saveFile() {
        try {
            targetFile.writeText(binding.editorText.text.toString())
            Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show()
            dirty = false
        } catch (e: Exception) {
            Toast.makeText(this, "Save failed", Toast.LENGTH_SHORT).show()
        }
    }

    private fun scheduleAutosave() {
        pendingAutosave?.let { autosaveHandler.removeCallbacks(it) }
        pendingAutosave = Runnable {
            if (dirty) saveFile()
        }
        autosaveHandler.postDelayed(pendingAutosave!!, 2000)
    }

    private fun setupEditing() {
        // Initialize undo stack with initial content
        undoStack.clear()
        redoStack.clear()
        undoStack.addLast(binding.editorText.text.toString())

        binding.editorText.addTextChangedListener(object : TextWatcher {
            private var beforeChange: String = ""
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                beforeChange = s?.toString() ?: ""
            }
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val current = s?.toString() ?: ""
                if (current == beforeChange) return
                // Push previous state to undo stack
                if (undoStack.isEmpty() || undoStack.last() != beforeChange) {
                    if (undoStack.size >= maxHistory) undoStack.removeFirst()
                    undoStack.addLast(beforeChange)
                }
                // Clear redo stack on new edit
                redoStack.clear()
                dirty = true
                scheduleAutosave()
            }
        })
    }

    private fun performUndo() {
        if (undoStack.size <= 1) return // first entry is initial content
        val current = binding.editorText.text.toString()
        val previous = undoStack.removeLast()
        redoStack.addLast(current)
        binding.editorText.setText(previous)
        binding.editorText.setSelection(previous.length)
        dirty = true
        scheduleAutosave()
    }

    private fun performRedo() {
        if (redoStack.isEmpty()) return
        val current = binding.editorText.text.toString()
        val next = redoStack.removeLast()
        if (undoStack.size >= maxHistory) undoStack.removeFirst()
        undoStack.addLast(current)
        binding.editorText.setText(next)
        binding.editorText.setSelection(next.length)
        dirty = true
        scheduleAutosave()
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_text_editor, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> { finish(); true }
            R.id.action_save -> { saveFile(); true }
            R.id.action_undo -> { performUndo(); true }
            R.id.action_redo -> { performRedo(); true }
            else -> super.onOptionsItemSelected(item)
        }
    }

    override fun onPause() {
        super.onPause()
        if (dirty) saveFile()
    }

    companion object {
        const val EXTRA_FILE_NAME = "extra_file_name"
        const val EXTRA_CREATE_NEW = "extra_create_new"
    }
}
