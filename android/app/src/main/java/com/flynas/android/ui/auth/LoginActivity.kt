package com.flynas.android.ui.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.flynas.android.databinding.ActivityLoginBinding
import com.flynas.android.network.CloudSyncManager
import com.flynas.android.ui.main.MainActivity
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLoginBinding
    private lateinit var syncManager: CloudSyncManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        syncManager = CloudSyncManager(this)
        
        // Check if already logged in
        if (syncManager.isAuthenticated()) {
            navigateToMain()
            return
        }
        
        setupClickListeners()
    }
    
    private fun setupClickListeners() {
        binding.btnLogin.setOnClickListener {
            val username = binding.etUsername.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            
            if (validateInput(username, password)) {
                performLogin(username, password)
            }
        }
        
        binding.tvRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
        
        binding.tvSkipLogin.setOnClickListener {
            // Allow using app without login (local mode only)
            navigateToMain()
        }
    }
    
    private fun validateInput(username: String, password: String): Boolean {
        if (username.isEmpty()) {
            binding.etUsername.error = "Username is required"
            return false
        }
        
        if (password.isEmpty()) {
            binding.etPassword.error = "Password is required"
            return false
        }
        
        return true
    }
    
    private fun performLogin(username: String, password: String) {
        binding.btnLogin.isEnabled = false
        binding.btnLogin.text = "Logging in..."
        
        lifecycleScope.launch {
            val result = syncManager.login(username, password)
            
            if (result.success) {
                Toast.makeText(
                    this@LoginActivity,
                    "Welcome back, ${result.user?.username}!",
                    Toast.LENGTH_SHORT
                ).show()
                navigateToMain()
            } else {
                Toast.makeText(
                    this@LoginActivity,
                    result.error ?: "Login failed",
                    Toast.LENGTH_LONG
                ).show()
                binding.btnLogin.isEnabled = true
                binding.btnLogin.text = "Login"
            }
        }
    }
    
    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
