import { encryptData, decryptData } from '../src/utils/encryption';

const PASSWORD = 'test-password';

describe('encryption utils', () => {
  test('encrypts and decrypts round trip', () => {
    const plaintext = Buffer.from('hello world');

    const encrypted = encryptData(plaintext, PASSWORD);
    expect(encrypted).not.toEqual(plaintext);

    const decrypted = decryptData(encrypted, PASSWORD);
    expect(decrypted).not.toBeNull();
    expect(decrypted?.toString()).toBe('hello world');
  });

  test('decryption fails with wrong password', () => {
    const plaintext = Buffer.from('secret data');
    const encrypted = encryptData(plaintext, PASSWORD);

    const decrypted = decryptData(encrypted, 'wrong-password');
    expect(decrypted).toBeNull();
  });

  test('tampered ciphertext returns null', () => {
    const plaintext = Buffer.from('another secret');
    const encrypted = encryptData(plaintext, PASSWORD);

    // Flip a bit in ciphertext
    encrypted[encrypted.length - 1] = encrypted[encrypted.length - 1] ^ 0xff;

    const decrypted = decryptData(encrypted, PASSWORD);
    expect(decrypted).toBeNull();
  });
});
