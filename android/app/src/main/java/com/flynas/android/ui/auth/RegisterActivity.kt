package com.flynas.android.ui.auth

import android.content.Intent
import android.os.Bundle
import android.util.Patterns
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.flynas.android.databinding.ActivityRegisterBinding
import com.flynas.android.network.CloudSyncManager
import com.flynas.android.ui.main.MainActivity
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityRegisterBinding
    private lateinit var syncManager: CloudSyncManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        syncManager = CloudSyncManager(this)
        
        setupClickListeners()
    }
    
    private fun setupClickListeners() {
        binding.btnRegister.setOnClickListener {
            val username = binding.etUsername.text.toString().trim()
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            val confirmPassword = binding.etConfirmPassword.text.toString().trim()
            
            if (validateInput(username, email, password, confirmPassword)) {
                performRegister(username, email, password)
            }
        }
        
        binding.tvLogin.setOnClickListener {
            finish()
        }
    }
    
    private fun validateInput(
        username: String,
        email: String,
        password: String,
        confirmPassword: String
    ): Boolean {
        if (username.length < 3) {
            binding.etUsername.error = "Username must be at least 3 characters"
            return false
        }
        
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.etEmail.error = "Invalid email address"
            return false
        }
        
        if (password.length < 6) {
            binding.etPassword.error = "Password must be at least 6 characters"
            return false
        }
        
        if (password != confirmPassword) {
            binding.etConfirmPassword.error = "Passwords do not match"
            return false
        }
        
        return true
    }
    
    private fun performRegister(username: String, email: String, password: String) {
        binding.btnRegister.isEnabled = false
        binding.btnRegister.text = "Creating Account..."
        
        lifecycleScope.launch {
            val result = syncManager.register(username, email, password)
            
            if (result.success) {
                Toast.makeText(
                    this@RegisterActivity,
                    "Account created! Welcome, ${result.user?.username}!",
                    Toast.LENGTH_SHORT
                ).show()
                navigateToMain()
            } else {
                Toast.makeText(
                    this@RegisterActivity,
                    result.error ?: "Registration failed",
                    Toast.LENGTH_LONG
                ).show()
                binding.btnRegister.isEnabled = true
                binding.btnRegister.text = "Create Account"
            }
        }
    }
    
    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
