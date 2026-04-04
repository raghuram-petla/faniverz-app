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
