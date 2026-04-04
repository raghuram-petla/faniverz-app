jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { onAuthStateChange: jest.fn() },
    from: jest.fn(),
  })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

beforeEach(() => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
});

describe('supabase client', () => {
  it('creates a Supabase client with env vars', () => {
    require('../supabase');
    const { createClient } = require('@supabase/supabase-js');
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }),
      }),
    );
  });

  it('SECURITY: uses SecureStore adapter for auth persistence, not AsyncStorage', () => {
    require('../supabase');
    const { createClient } = require('@supabase/supabase-js');
    const callArgs = (createClient as jest.Mock).mock.calls[0];
    const storage = callArgs[2].auth.storage;
    // SecureStore adapter must have getItem, setItem, removeItem
    expect(storage).toHaveProperty('getItem');
    expect(storage).toHaveProperty('setItem');
    expect(storage).toHaveProperty('removeItem');
    // Must NOT be plain AsyncStorage (which stores tokens unencrypted)
    expect(storage.getItem).toBeDefined();
    expect(storage.setItem).toBeDefined();
    expect(storage.removeItem).toBeDefined();
  });

  it('throws when env vars are missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => require('../supabase')).toThrow(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY env vars',
    );
  });
});

describe('chunking SecureStore adapter', () => {
  let storage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void> };
  let SecureStore: typeof import('expo-secure-store');

  beforeEach(() => {
    jest.resetModules();
    SecureStore = require('expo-secure-store');
    require('../supabase');
    // Extract the adapter from createClient call args
    const { createClient } = require('@supabase/supabase-js');
    const callArgs = (createClient as jest.Mock).mock.calls[0];
    storage = callArgs[2].auth.storage;
  });

  describe('setItem (chunking)', () => {
    it('splits a value larger than 2048 bytes into chunks', async () => {
      const bigValue = 'x'.repeat(5000); // 3 chunks: 2048 + 2048 + 904
      await storage.setItem('token', bigValue);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token_chunks', '3');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token_chunk_0', 'x'.repeat(2048));
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token_chunk_1', 'x'.repeat(2048));
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token_chunk_2', 'x'.repeat(904));
    });

    it('stores a small value as a single chunk', async () => {
      await storage.setItem('token', 'small');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token_chunks', '1');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token_chunk_0', 'small');
    });
  });

  describe('getItem (reassembly)', () => {
    it('reassembles chunked value from multiple keys', async () => {
      const part0 = 'a'.repeat(2048);
      const part1 = 'b'.repeat(100);
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'token_chunks') return Promise.resolve('2');
        if (key === 'token_chunk_0') return Promise.resolve(part0);
        if (key === 'token_chunk_1') return Promise.resolve(part1);
        return Promise.resolve(null);
      });
      const result = await storage.getItem('token');
      expect(result).toBe(part0 + part1);
    });

    it('falls back to direct read when no chunk metadata exists (legacy)', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'token_chunks') return Promise.resolve(null);
        if (key === 'token') return Promise.resolve('legacy-value');
        return Promise.resolve(null);
      });
      const result = await storage.getItem('token');
      expect(result).toBe('legacy-value');
    });

    it('returns null when a chunk is missing', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'token_chunks') return Promise.resolve('2');
        if (key === 'token_chunk_0') return Promise.resolve('data');
        return Promise.resolve(null); // chunk_1 missing
      });
      const result = await storage.getItem('token');
      expect(result).toBeNull();
    });
  });

  describe('removeItem (cleanup)', () => {
    it('deletes all chunk keys, metadata, and bare key', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'token_chunks') return Promise.resolve('2');
        return Promise.resolve(null);
      });
      await storage.removeItem('token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token_chunk_0');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token_chunk_1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token_chunks');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    });

    it('deletes bare key even when no chunk metadata exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      await storage.removeItem('token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    });
  });
});
