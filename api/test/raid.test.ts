import { calculateChunkHash, verifyChunkIntegrity } from '../src/utils/raid';

describe('raid utils', () => {
  test('calculates SHA256 chunk hash', () => {
    const chunk = Buffer.from('test chunk data');
    const hash = calculateChunkHash(chunk);

    expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex is 64 chars
  });

  test('same content produces same hash', () => {
    const data = Buffer.from('same data');
    const hash1 = calculateChunkHash(data);
    const hash2 = calculateChunkHash(data);

    expect(hash1).toBe(hash2);
  });

  test('different content produces different hashes', () => {
    const hash1 = calculateChunkHash(Buffer.from('data1'));
    const hash2 = calculateChunkHash(Buffer.from('data2'));

    expect(hash1).not.toBe(hash2);
  });

  test('verifies correct hash', () => {
    const chunk = Buffer.from('verify test');
    const hash = calculateChunkHash(chunk);

    const valid = verifyChunkIntegrity(chunk, hash);
    expect(valid).toBe(true);
  });

  test('detects corrupted chunk', () => {
    const chunk = Buffer.from('original');
    const hash = calculateChunkHash(chunk);

    const tampered = Buffer.from('modified');
    const valid = verifyChunkIntegrity(tampered, hash);
    expect(valid).toBe(false);
  });
});
