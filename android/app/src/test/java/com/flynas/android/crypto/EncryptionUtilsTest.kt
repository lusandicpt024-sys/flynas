package com.flynas.android.crypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.charset.Charset

class EncryptionUtilsTest {

    private fun createTempFile(prefix: String, content: String): File {
        val file = File.createTempFile(prefix, ".txt")
        file.writeText(content, Charset.forName("UTF-8"))
        return file
    }

    @Test
    fun encryptAndDecrypt_returnsOriginalContent() {
        val original = "Hello Flynas Encryption!".repeat(1000) // large content
        val source = createTempFile("plain", original)
        val encrypted = File.createTempFile("encrypted", ".enc")
        val decrypted = File.createTempFile("decrypted", ".txt")
        val password = "StrongPassword123!"

        val encResult = EncryptionUtils.encryptFile(source, encrypted, password)
        assertTrue(encResult)
        assertTrue(encrypted.length() > source.length())

        val decResult = EncryptionUtils.decryptFile(encrypted, decrypted, password)
        assertTrue(decResult)

        val decryptedBytes = decrypted.readBytes()
        val originalBytes = source.readBytes()
        assertArrayEquals(originalBytes, decryptedBytes)
    }

    @Test
    fun decryptWithWrongPassword_fails() {
        val source = createTempFile("plain_wrong", "Sensitive Data")
        val encrypted = File.createTempFile("encrypted_wrong", ".enc")
        val decrypted = File.createTempFile("decrypted_wrong", ".txt")

        val encResult = EncryptionUtils.encryptFile(source, encrypted, "CorrectPassword")
        assertTrue(encResult)

        val decResult = EncryptionUtils.decryptFile(encrypted, decrypted, "WrongPassword")
        assertFalse(decResult)
    }
}
