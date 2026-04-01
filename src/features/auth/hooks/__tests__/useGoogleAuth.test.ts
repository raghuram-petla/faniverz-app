jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { googleIosClientId: 'test-ios-id' } } },
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

  it('configures with webClientId and iosClientId from expo config', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      data: { idToken: 'test-token' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'test-client-id',
      iosClientId: 'test-ios-id',
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

  it('throws when EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    const { result } = renderHook(() => useGoogleAuth());
    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch (err) {
        caughtError = err as Error;
      }
    });
    expect(caughtError).not.toBeNull();
    expect((caughtError as unknown as Error).message).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  });

  it('sets error when supabase signInWithIdToken returns error', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      data: { idToken: 'valid-token' },
    });
    const authError = new Error('invalid_grant');
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({ error: authError });

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('invalid_grant');
  });

  it('sets error message for non-Error thrown objects', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce('string-error');

    const { result } = renderHook(() => useGoogleAuth());
    await act(async () => {
      try {
        await result.current.signInWithGoogle();
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('Google sign-in failed');
  });

  it('skips configure on second call (configured.current = true)', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: { idToken: 'token-1' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useGoogleAuth());

    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(GoogleSignin.configure).toHaveBeenCalledTimes(1);

    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: { idToken: 'token-2' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(GoogleSignin.configure).toHaveBeenCalledTimes(1);
  });
});
