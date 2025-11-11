package com.flynas.android.ui.main

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.flynas.android.R

/**
 * Main Activity for Flynas Application
 * Simplified version for initial build
 */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Set title
        findViewById<TextView>(R.id.textView)?.apply {
            text = "Flynas - Personal Cloud Server\n\nVersion 1.0.0"
            textSize = 18f
        }
    }
}
