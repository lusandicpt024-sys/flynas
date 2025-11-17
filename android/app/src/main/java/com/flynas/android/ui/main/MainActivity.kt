package com.flynas.android.ui.main

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.flynas.android.R
import com.flynas.android.databinding.ActivityMainBinding
import java.text.SimpleDateFormat
import java.util.*

/**
 * Main Activity for Flynas Application
 */
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var clickCount = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Set version dynamically
        val versionName = try {
            packageManager.getPackageInfo(packageName, 0).versionName
        } catch (e: Exception) {
            "1.0.0"
        }
        binding.versionText.text = getString(R.string.app_version_format, versionName)
        binding.statusText.text = getString(R.string.app_status_running)

        // Primary action: Update status with timestamp
        binding.actionPrimary.setOnClickListener {
            clickCount++
            val timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            binding.statusText.text = "Active • Refreshed at $timestamp (${clickCount}x)"
            Toast.makeText(this, "Status refreshed!", Toast.LENGTH_SHORT).show()
        }

        // Secondary action: Show settings/info dialog
        binding.actionSecondary.setOnClickListener {
            showSettingsDialog()
        }
    }

    private fun showSettingsDialog() {
        val options = arrayOf(
            "About Flynas",
            "App Info",
            "Clear Data",
            "Exit"
        )

        AlertDialog.Builder(this)
            .setTitle("Settings")
            .setItems(options) { dialog, which ->
                when (which) {
                    0 -> showAboutDialog()
                    1 -> showAppInfo()
                    2 -> clearData()
                    3 -> finish()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showAboutDialog() {
        AlertDialog.Builder(this)
            .setTitle("About Flynas")
            .setMessage("Flynas is a cross-platform application for secure file management and synchronization.\n\nVersion: ${binding.versionText.text}")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun showAppInfo() {
        val info = """
            Package: ${packageName}
            Version: ${binding.versionText.text}
            Clicks: $clickCount
            
            Features:
            • Secure file encryption
            • Cross-platform sync
            • Background operations
        """.trimIndent()

        AlertDialog.Builder(this)
            .setTitle("App Information")
            .setMessage(info)
            .setPositiveButton("OK", null)
            .show()
    }

    private fun clearData() {
        AlertDialog.Builder(this)
            .setTitle("Clear Data")
            .setMessage("Are you sure you want to clear app data? This will reset the counter.")
            .setPositiveButton("Clear") { _, _ ->
                clickCount = 0
                binding.statusText.text = getString(R.string.app_status_running)
                Toast.makeText(this, "Data cleared!", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
