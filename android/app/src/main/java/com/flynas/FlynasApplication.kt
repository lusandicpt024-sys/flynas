package com.flynas

import android.app.Application
import android.util.Log
import com.flynas.android.workers.HeartbeatScheduler

class FlynasApplication : Application() {
    
    companion object {
        private const val TAG = "FlynasApp"
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Flynas Application initialized")
        
        // Start background heartbeat service
        HeartbeatScheduler.start(this)
    }
}
