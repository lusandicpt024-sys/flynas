package com.flynas.android.crypto

import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Utility object providing AES-256 GCM file encryption and decryption.
 * File format: [16 bytes salt][12 bytes iv][ciphertext]
 */
object EncryptionUtils {

    private const val SALT_LENGTH = 16
    private const val IV_LENGTH = 12 // GCM recommended 12 bytes
    private const val KEY_LENGTH_BITS = 256
    private const val PBKDF2_ITERATIONS = 100_000
    private const val GCM_TAG_LENGTH_BITS = 128
    private val secureRandom = SecureRandom()

    private fun deriveKey(password: String, salt: ByteArray): SecretKeySpec {
        val keyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val keySpec = PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, KEY_LENGTH_BITS)
        val keyBytes = keyFactory.generateSecret(keySpec).encoded
        return SecretKeySpec(keyBytes, "AES")
    }

    fun encryptFile(source: File, dest: File, password: String): Boolean {
        return try {
            val salt = ByteArray(SALT_LENGTH).also { secureRandom.nextBytes(it) }
            val iv = ByteArray(IV_LENGTH).also { secureRandom.nextBytes(it) }
            val key = deriveKey(password, salt)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))

            FileInputStream(source).use { input ->
                FileOutputStream(dest).use { output ->
                    // header
                    output.write(salt)
                    output.write(iv)
                    // encrypt stream
                    val buffer = ByteArray(8192)
                    var read: Int
                    while (input.read(buffer).also { read = it } != -1) {
                        val encryptedChunk = cipher.update(buffer, 0, read)
                        if (encryptedChunk != null && encryptedChunk.isNotEmpty()) {
                            output.write(encryptedChunk)
                        }
                    }
                    val finalBytes = cipher.doFinal()
                    if (finalBytes.isNotEmpty()) output.write(finalBytes)
                }
            }
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    fun decryptFile(encrypted: File, dest: File, password: String): Boolean {
        return try {
            FileInputStream(encrypted).use { input ->
                val salt = ByteArray(SALT_LENGTH)
                val iv = ByteArray(IV_LENGTH)
                val headerReadSalt = input.read(salt)
                val headerReadIv = input.read(iv)
                if (headerReadSalt != SALT_LENGTH || headerReadIv != IV_LENGTH) return false

                val key = deriveKey(password, salt)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))

                FileOutputStream(dest).use { output ->
                    val buffer = ByteArray(8192)
                    var read: Int
                    while (input.read(buffer).also { read = it } != -1) {
                        val decryptedChunk = cipher.update(buffer, 0, read)
                        if (decryptedChunk != null && decryptedChunk.isNotEmpty()) {
                            output.write(decryptedChunk)
                        }
                    }
                    val finalBytes = cipher.doFinal()
                    if (finalBytes.isNotEmpty()) output.write(finalBytes)
                }
            }
            true
        } catch (e: Exception) {
            // Authentication failure or other error
            e.printStackTrace()
            false
        }
    }
}
