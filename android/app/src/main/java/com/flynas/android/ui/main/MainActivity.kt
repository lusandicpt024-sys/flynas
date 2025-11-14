package com.flynas.android.ui.main

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.flynas.android.R
import com.flynas.android.databinding.ActivityMainBinding

/**
 * Main Activity for Flynas Application
 */
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

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

        // Example click listeners
        binding.actionPrimary.setOnClickListener {
            binding.statusText.text = getString(R.string.app_status_running)
        }
        binding.actionSecondary.setOnClickListener {
            // TODO: Open settings screen
        }
    }
}
