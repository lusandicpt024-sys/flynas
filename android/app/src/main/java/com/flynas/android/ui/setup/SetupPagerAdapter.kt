package com.flynas.android.ui.setup

import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter

class SetupPagerAdapter(activity: AppCompatActivity) : FragmentStateAdapter(activity) {
    
    private val fragments = listOf(
        SetupFragment.newInstance(
            "Welcome to Flynas",
            "Your secure, cross-platform file management solution",
            "📱"
        ),
        SetupFragment.newInstance(
            "End-to-End Encryption",
            "All your files are encrypted with military-grade AES-256 encryption. Your data stays private and secure.",
            "🔒"
        ),
        SetupFragment.newInstance(
            "Cross-Platform Sync",
            "Seamlessly sync files across Android, Desktop, and Browser. Access your data anywhere.",
            "🔄"
        ),
        SetupFragment.newInstance(
            "Background Operations",
            "Flynas works in the background to keep your files synchronized and up-to-date automatically.",
            "⚡"
        ),
        SetupFragment.newInstance(
            "You're All Set!",
            "Start using Flynas to securely manage and sync your files across all your devices.",
            "✅"
        )
    )

    override fun getItemCount(): Int = fragments.size

    override fun createFragment(position: Int): Fragment = fragments[position]
}
