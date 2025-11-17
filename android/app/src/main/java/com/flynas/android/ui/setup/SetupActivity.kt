package com.flynas.android.ui.setup

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.viewpager2.widget.ViewPager2
import com.flynas.android.R
import com.flynas.android.databinding.ActivitySetupBinding
import com.flynas.android.ui.main.MainActivity
import com.google.android.material.tabs.TabLayoutMediator

/**
 * Setup/Onboarding Activity
 * Guides users through app features and initial configuration
 */
class SetupActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySetupBinding
    private lateinit var adapter: SetupPagerAdapter
    private var currentPage = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySetupBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupViewPager()
        setupButtons()
    }

    private fun setupViewPager() {
        adapter = SetupPagerAdapter(this)
        binding.viewPager.adapter = adapter
        
        // Link TabLayout with ViewPager2
        TabLayoutMediator(binding.tabLayout, binding.viewPager) { _, _ -> }.attach()

        binding.viewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                currentPage = position
                updateButtons()
            }
        })
        
        updateButtons()
    }

    private fun setupButtons() {
        binding.btnBack.setOnClickListener {
            if (currentPage > 0) {
                binding.viewPager.currentItem = currentPage - 1
            }
        }

        binding.btnNext.setOnClickListener {
            if (currentPage < adapter.itemCount - 1) {
                binding.viewPager.currentItem = currentPage + 1
            } else {
                completeSetup()
            }
        }

        binding.btnSkip.setOnClickListener {
            completeSetup()
        }
    }

    private fun updateButtons() {
        binding.btnBack.isEnabled = currentPage > 0
        binding.btnBack.alpha = if (currentPage > 0) 1.0f else 0.3f

        if (currentPage == adapter.itemCount - 1) {
            binding.btnNext.text = "Get Started"
            binding.btnSkip.visibility = android.view.View.GONE
        } else {
            binding.btnNext.text = "Next"
            binding.btnSkip.visibility = android.view.View.VISIBLE
        }
    }

    private fun completeSetup() {
        // Save that setup is complete
        getSharedPreferences("flynas_prefs", MODE_PRIVATE)
            .edit()
            .putBoolean("setup_complete", true)
            .apply()

        Toast.makeText(this, "Setup complete! Welcome to Flynas", Toast.LENGTH_SHORT).show()

        // Return to MainActivity or close
        finish()
    }

    override fun onBackPressed() {
        if (currentPage > 0) {
            binding.viewPager.currentItem = currentPage - 1
        } else {
            super.onBackPressed()
        }
    }
}
