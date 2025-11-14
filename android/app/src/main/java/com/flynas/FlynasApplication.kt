package com.flynas

import android.app.Application
import android.util.Log

class FlynasApplication : Application() {
    
    companion object {
        private const val TAG = "FlynasApp"
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Flynas Application initialized")
    }
}
