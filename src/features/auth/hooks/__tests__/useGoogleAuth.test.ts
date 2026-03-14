jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
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
import { useGoogleAuth } from '../useGoogleAuth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

describe('useGoogleAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-client-id';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useGoogleAuth());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('signs in with google successfully', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      data: { idToken: 'test-token' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'test-token',
    });
  });

  it('sets error on failure', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(new Error('cancelled'));

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('cancelled');
  });

  it('throws on missing idToken', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({ data: { idToken: null } });

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('No ID token from Google');
  });
});
