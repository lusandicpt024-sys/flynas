package com.flynas.android.ui

import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.flynas.android.R
import com.flynas.android.network.CloudSyncManager
import kotlinx.coroutines.launch

class RaidConfigActivity : AppCompatActivity() {

    private lateinit var cloudSyncManager: CloudSyncManager
    
    // Views
    private lateinit var statusCard: androidx.cardview.widget.CardView
    private lateinit var healthBadge: TextView
    private lateinit var statusDetails: TextView
    
    private lateinit var registerDeviceBtn: Button
    private lateinit var refreshDevicesBtn: Button
    private lateinit var devicesRecyclerView: androidx.recyclerview.widget.RecyclerView
    
    private lateinit var raidLevelSpinner: Spinner
    private lateinit var chunkSizeSpinner: Spinner
    private lateinit var deviceSelectionLayout: LinearLayout
    private lateinit var configureRaidBtn: Button
    private lateinit var deleteRaidBtn: Button
    
    private lateinit var healRaidBtn: Button
    private lateinit var progressBar: ProgressBar
    
    private var devices: List<CloudSyncManager.Device> = emptyList()
    private val selectedDeviceIds = mutableSetOf<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_raid_config)
        
        // Initialize CloudSyncManager
        cloudSyncManager = CloudSyncManager.getInstance(this)
        
        // Set up action bar
        supportActionBar?.title = "RAID Configuration"
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        
        // Initialize views
        initializeViews()
        
        // Set up listeners
        setupListeners()
        
        // Load initial data
        loadRaidStatus()
        loadDevices()
    }

    private fun initializeViews() {
        // Status panel
        statusCard = findViewById(R.id.status_card)
        healthBadge = findViewById(R.id.health_badge)
        statusDetails = findViewById(R.id.status_details)
        
        // Device management
        registerDeviceBtn = findViewById(R.id.register_device_btn)
        refreshDevicesBtn = findViewById(R.id.refresh_devices_btn)
        devicesRecyclerView = findViewById(R.id.devices_recycler_view)
        
        // RAID configuration
        raidLevelSpinner = findViewById(R.id.raid_level_spinner)
        chunkSizeSpinner = findViewById(R.id.chunk_size_spinner)
        deviceSelectionLayout = findViewById(R.id.device_selection_layout)
        configureRaidBtn = findViewById(R.id.configure_raid_btn)
        deleteRaidBtn = findViewById(R.id.delete_raid_btn)
        
        // Maintenance
        healRaidBtn = findViewById(R.id.heal_raid_btn)
        progressBar = findViewById(R.id.progress_bar)
        
        // Set up spinners
        setupSpinners()
    }

    private fun setupSpinners() {
        // RAID level spinner
        val raidLevels = arrayOf(
            "Select RAID Level",
            "RAID 1 - Mirroring (2+ devices)",
            "RAID 5 - Parity (3+ devices)",
            "RAID 10 - Striped Mirrors (4+ devices)"
        )
        val raidLevelAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, raidLevels)
        raidLevelAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        raidLevelSpinner.adapter = raidLevelAdapter
        
        // Chunk size spinner
        val chunkSizes = arrayOf("256 KB", "512 KB", "1 MB", "2 MB")
        val chunkSizeAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, chunkSizes)
        chunkSizeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        chunkSizeSpinner.adapter = chunkSizeAdapter
        chunkSizeSpinner.setSelection(1) // Default to 512 KB
    }

    private fun setupListeners() {
        registerDeviceBtn.setOnClickListener {
            registerDevice()
        }
        
        refreshDevicesBtn.setOnClickListener {
            loadDevices()
        }
        
        raidLevelSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                updateConfigureButtonState()
            }
            
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        
        configureRaidBtn.setOnClickListener {
            configureRaid()
        }
        
        deleteRaidBtn.setOnClickListener {
            deleteRaidConfig()
        }
        
        healRaidBtn.setOnClickListener {
            healRaid()
        }
    }

    private fun registerDevice() {
        lifecycleScope.launch {
            try {
                progressBar.visibility = View.VISIBLE
                
                val deviceName = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
                val result = cloudSyncManager.registerDevice(
                    deviceName = deviceName,
                    deviceType = "mobile",
                    platform = "android",
                    storageCapacity = getStorageCapacity(),
                    storageAvailable = getStorageAvailable()
                )
                
                progressBar.visibility = View.GONE
                
                if (result.success) {
                    Toast.makeText(this@RaidConfigActivity, "Device registered successfully", Toast.LENGTH_SHORT).show()
                    loadDevices()
                    loadRaidStatus()
                } else {
                    Toast.makeText(this@RaidConfigActivity, "Failed to register device: ${result.error}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@RaidConfigActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun loadDevices() {
        lifecycleScope.launch {
            try {
                progressBar.visibility = View.VISIBLE
                
                val result = cloudSyncManager.listDevices()
                
                progressBar.visibility = View.GONE
                
                if (result.success && result.devices != null) {
                    devices = result.devices
                    renderDevicesList(result.devices)
                    updateDeviceSelection(result.devices)
                    updateConfigureButtonState()
                } else {
                    Toast.makeText(this@RaidConfigActivity, "Failed to load devices", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@RaidConfigActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun renderDevicesList(devices: List<CloudSyncManager.Device>) {
        // This would typically use a RecyclerView adapter
        // For simplicity, we'll show a summary
        val deviceCount = devices.size
        val onlineCount = devices.count { it.status == "online" }
        
        Toast.makeText(this, "$onlineCount of $deviceCount devices online", Toast.LENGTH_SHORT).show()
    }

    private fun updateDeviceSelection(devices: List<CloudSyncManager.Device>) {
        deviceSelectionLayout.removeAllViews()
        
        val onlineDevices = devices.filter { it.status == "online" }
        
        if (onlineDevices.isEmpty()) {
            val textView = TextView(this)
            textView.text = "No online devices available"
            textView.setPadding(16, 16, 16, 16)
            deviceSelectionLayout.addView(textView)
            return
        }
        
        onlineDevices.forEach { device ->
            val checkBox = CheckBox(this)
            checkBox.text = "${device.deviceName} (${device.platform})"
            checkBox.setPadding(16, 8, 16, 8)
            
            checkBox.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked) {
                    selectedDeviceIds.add(device.deviceId)
                } else {
                    selectedDeviceIds.remove(device.deviceId)
                }
                updateConfigureButtonState()
            }
            
            deviceSelectionLayout.addView(checkBox)
        }
    }

    private fun loadRaidStatus() {
        lifecycleScope.launch {
            try {
                val result = cloudSyncManager.getRaidStatus()
                
                if (result.success && result.status != null) {
                    renderRaidStatus(result.status)
                }
            } catch (e: Exception) {
                Toast.makeText(this@RaidConfigActivity, "Error loading RAID status: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun renderRaidStatus(status: CloudSyncManager.RaidStatus) {
        if (!status.configured) {
            healthBadge.text = "NOT CONFIGURED"
            healthBadge.setBackgroundColor(getColor(android.R.color.darker_gray))
            statusDetails.text = "No RAID configuration found. Register devices and configure RAID."
            deleteRaidBtn.isEnabled = false
            healRaidBtn.isEnabled = false
            return
        }
        
        val config = status.config
        val health = status.health ?: "unknown"
        
        healthBadge.text = health.uppercase()
        healthBadge.setBackgroundColor(when (health) {
            "healthy" -> getColor(android.R.color.holo_green_dark)
            "degraded" -> getColor(android.R.color.holo_orange_dark)
            else -> getColor(android.R.color.holo_red_dark)
        })
        
        statusDetails.text = buildString {
            append("RAID Level: ${config?.raidLevel}\n")
            append("Chunk Size: ${formatBytes(config?.chunkSize?.toLong() ?: 0)}\n")
            append("Devices: ${status.onlineDevices}/${status.totalDevices} online\n")
            append("Status: ${if (config?.active == true) "Active" else "Inactive"}")
        }
        
        deleteRaidBtn.isEnabled = true
        healRaidBtn.isEnabled = true
    }

    private fun updateConfigureButtonState() {
        val raidLevel = getRaidLevelValue()
        val minDevices = when (raidLevel) {
            "1" -> 2
            "5" -> 3
            "10" -> 4
            else -> 0
        }
        
        val canConfigure = raidLevel.isNotEmpty() && selectedDeviceIds.size >= minDevices
        configureRaidBtn.isEnabled = canConfigure
        
        if (raidLevel.isNotEmpty() && selectedDeviceIds.size < minDevices) {
            Toast.makeText(this, "RAID $raidLevel requires at least $minDevices devices", Toast.LENGTH_SHORT).show()
        }
    }

    private fun getRaidLevelValue(): String {
        return when (raidLevelSpinner.selectedItemPosition) {
            1 -> "1"
            2 -> "5"
            3 -> "10"
            else -> ""
        }
    }

    private fun getChunkSizeValue(): Int {
        return when (chunkSizeSpinner.selectedItemPosition) {
            0 -> 262144    // 256 KB
            1 -> 524288    // 512 KB
            2 -> 1048576   // 1 MB
            3 -> 2097152   // 2 MB
            else -> 524288
        }
    }

    private fun configureRaid() {
        val raidLevel = getRaidLevelValue()
        val chunkSize = getChunkSizeValue()
        val deviceIds = selectedDeviceIds.toList()
        
        if (raidLevel.isEmpty() || deviceIds.isEmpty()) {
            Toast.makeText(this, "Please select RAID level and devices", Toast.LENGTH_SHORT).show()
            return
        }
        
        lifecycleScope.launch {
            try {
                progressBar.visibility = View.VISIBLE
                
                val result = cloudSyncManager.configureRaid(raidLevel, chunkSize, deviceIds)
                
                progressBar.visibility = View.GONE
                
                if (result.success) {
                    Toast.makeText(this@RaidConfigActivity, "RAID configured successfully", Toast.LENGTH_SHORT).show()
                    loadRaidStatus()
                } else {
                    Toast.makeText(this@RaidConfigActivity, "RAID configuration failed: ${result.error}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@RaidConfigActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun deleteRaidConfig() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Delete RAID Configuration")
            .setMessage("Are you sure you want to delete the RAID configuration? This will not delete your files.")
            .setPositiveButton("Delete") { _, _ ->
                performDeleteRaidConfig()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun performDeleteRaidConfig() {
        lifecycleScope.launch {
            try {
                progressBar.visibility = View.VISIBLE
                
                val result = cloudSyncManager.deleteRaidConfig()
                
                progressBar.visibility = View.GONE
                
                if (result.success) {
                    Toast.makeText(this@RaidConfigActivity, "RAID configuration deleted", Toast.LENGTH_SHORT).show()
                    loadRaidStatus()
                } else {
                    Toast.makeText(this@RaidConfigActivity, "Failed to delete RAID configuration: ${result.error}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@RaidConfigActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun healRaid() {
        lifecycleScope.launch {
            try {
                progressBar.visibility = View.VISIBLE
                Toast.makeText(this@RaidConfigActivity, "Starting RAID healing...", Toast.LENGTH_SHORT).show()
                
                val result = cloudSyncManager.healRaid()
                
                progressBar.visibility = View.GONE
                
                if (result.success) {
                    Toast.makeText(this@RaidConfigActivity, "RAID healing completed", Toast.LENGTH_SHORT).show()
                    loadRaidStatus()
                } else {
                    Toast.makeText(this@RaidConfigActivity, "RAID healing failed: ${result.error}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@RaidConfigActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun getStorageCapacity(): Long {
        // Simplified - in production, use proper storage APIs
        return 100L * 1024 * 1024 * 1024 // 100 GB
    }

    private fun getStorageAvailable(): Long {
        // Simplified - in production, use proper storage APIs
        return 50L * 1024 * 1024 * 1024 // 50 GB
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes == 0L) return "0 B"
        val k = 1024
        val sizes = arrayOf("B", "KB", "MB", "GB", "TB")
        val i = (Math.log(bytes.toDouble()) / Math.log(k.toDouble())).toInt()
        return String.format("%.2f %s", bytes / Math.pow(k.toDouble(), i.toDouble()), sizes[i])
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
}
