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

import { createClient } from '@supabase/supabase-js';

describe('supabase client', () => {
  it('creates a Supabase client with env vars', () => {
    require('../supabase');
    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
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
    const callArgs = (createClient as jest.Mock).mock.calls[0];
    expect(callArgs[2].auth.storage).toBe(AsyncStorage);
  });
});
