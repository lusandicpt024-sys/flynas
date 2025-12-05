import path from 'path';

describe('chunks encryption helpers', () => {
  const plaintext = Buffer.from('chunk-data');

  function loadHelpers(password: string | undefined) {
    process.env.CHUNK_ENCRYPTION_PASSWORD = password || '';
    process.env.CHUNKS_DIR = path.join(__dirname, 'tmp-chunks');
    jest.resetModules();

    let helpers: { prepareChunkForStorage: any; parseStoredChunk: any };
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('../src/routes/chunks');
      helpers = {
        prepareChunkForStorage: mod.prepareChunkForStorage,
        parseStoredChunk: mod.parseStoredChunk,
      };
    });
    return helpers!;
  }

  test('passes through when encryption disabled', () => {
    const { prepareChunkForStorage, parseStoredChunk } = loadHelpers('');

    const stored = prepareChunkForStorage(plaintext);
    expect(stored.equals(plaintext)).toBe(true);

    const parsed = parseStoredChunk(stored);
    expect(parsed.equals(plaintext)).toBe(true);
  });

  test('encrypts and decrypts when password set', () => {
    const { prepareChunkForStorage, parseStoredChunk } = loadHelpers('pw123');

    const stored = prepareChunkForStorage(plaintext);
    expect(stored.equals(plaintext)).toBe(false);

    const parsed = parseStoredChunk(stored);
    expect(parsed.equals(plaintext)).toBe(true);
  });

  test('backward compatible with plaintext when encryption enabled but header missing', () => {
    const { parseStoredChunk } = loadHelpers('pw123');

    const parsed = parseStoredChunk(Buffer.from(plaintext));
    expect(parsed.equals(plaintext)).toBe(true);
  });

  test('throws on decryption failure when header present', () => {
    const { prepareChunkForStorage } = loadHelpers('correct');
    const stored = prepareChunkForStorage(plaintext);

    // Re-load helpers with wrong password so parse fails
    const { parseStoredChunk } = loadHelpers('wrong');
    expect(() => parseStoredChunk(stored)).toThrow('Failed to decrypt chunk data');
  });
});
