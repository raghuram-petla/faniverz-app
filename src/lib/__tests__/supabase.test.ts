jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { onAuthStateChange: jest.fn() },
    from: jest.fn(),
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
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

  it('uses AsyncStorage for auth persistence', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    require('../supabase');
    const { createClient } = require('@supabase/supabase-js');
    const callArgs = (createClient as jest.Mock).mock.calls[0];
    expect(callArgs[2].auth.storage).toBe(AsyncStorage);
  });

  it('throws when env vars are missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => require('../supabase')).toThrow(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY env vars',
    );
  });
});
