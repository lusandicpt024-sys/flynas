package com.flynas.android.workers

import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * Manages background heartbeat service using WorkManager
 */
object HeartbeatScheduler {
    
    private const val WORK_NAME = "HeartbeatWork"
    private const val HEARTBEAT_INTERVAL_MINUTES = 15L // 15 minutes for Android (battery optimization)

    /**
     * Start periodic heartbeat service
     */
    fun start(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val heartbeatRequest = PeriodicWorkRequestBuilder<HeartbeatWorker>(
            HEARTBEAT_INTERVAL_MINUTES,
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                15,
                TimeUnit.MINUTES
            )
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            heartbeatRequest
        )

        android.util.Log.d("HeartbeatScheduler", "Heartbeat service started (interval: $HEARTBEAT_INTERVAL_MINUTES minutes)")
    }

    /**
     * Stop heartbeat service
     */
    fun stop(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        android.util.Log.d("HeartbeatScheduler", "Heartbeat service stopped")
    }

    /**
     * Check if heartbeat service is running
     */
    fun isRunning(context: Context): Boolean {
        val workInfos = WorkManager.getInstance(context)
            .getWorkInfosForUniqueWork(WORK_NAME)
            .get()
        
        return workInfos.any { workInfo ->
            workInfo.state == WorkInfo.State.RUNNING || workInfo.state == WorkInfo.State.ENQUEUED
        }
    }
}
