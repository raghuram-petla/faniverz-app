import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { onAuthStateChange: jest.fn() },
  })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('Supabase Client', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('creates client with correct URL and key', () => {
    jest.isolateModules(() => require('../supabase'));

    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }),
      })
    );
  });

  it('uses SecureStore adapter for auth storage', () => {
    jest.isolateModules(() => require('../supabase'));

    const callArgs = (createClient as jest.Mock).mock.calls[0];
    const options = callArgs[2];
    expect(options.auth.storage).toBeDefined();
    expect(options.auth.storage.getItem).toBeDefined();
    expect(options.auth.storage.setItem).toBeDefined();
    expect(options.auth.storage.removeItem).toBeDefined();
  });
});
