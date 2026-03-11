jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useAppleAuth } from '../useAppleAuth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

describe('useAppleAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns initial state', () => {
    const { result } = renderHook(() => useAppleAuth());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('marks available on iOS', () => {
    Platform.OS = 'ios';
    const { result } = renderHook(() => useAppleAuth());
    expect(result.current.isAvailable).toBe(true);
  });

  it('signs in successfully', async () => {
    Platform.OS = 'ios';
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValueOnce({
      identityToken: 'apple-token',
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAppleAuth());
    await act(async () => {
      await result.current.signInWithApple();
    });
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-token',
    });
  });

  it('sets error on failure', async () => {
    Platform.OS = 'ios';
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValueOnce(
      new Error('user cancelled'),
    );

    const { result } = renderHook(() => useAppleAuth());
    await act(async () => {
      try {
        await result.current.signInWithApple();
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('user cancelled');
  });
});
