jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { useEmailAuth } from '../useEmailAuth';

const mockAuth = supabase.auth as unknown as {
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  resetPasswordForEmail: jest.Mock;
};

describe('useEmailAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all expected functions and initial state', () => {
    const { result } = renderHook(() => useEmailAuth());

    expect(result.current.signIn).toBeInstanceOf(Function);
    expect(result.current.signUp).toBeInstanceOf(Function);
    expect(result.current.signOut).toBeInstanceOf(Function);
    expect(result.current.resetPassword).toBeInstanceOf(Function);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword with correct credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signIn('user@example.com', 'secret123');
      });

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      });
    });

    it('resets error before each attempt', async () => {
      // First call fails
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        error: new Error('Bad creds'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signIn('user@example.com', 'wrong');
        } catch {
          // expected
        }
      });
      expect(result.current.error).toBe('Bad creds');

      // Second call succeeds — error should be cleared
      mockAuth.signInWithPassword.mockResolvedValueOnce({ error: null });
      await act(async () => {
        await result.current.signIn('user@example.com', 'right');
      });
      expect(result.current.error).toBeNull();
    });

    it('sets error message from Error instance on failure', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        error: new Error('Invalid login credentials'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signIn('user@example.com', 'wrong');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Invalid login credentials');
      expect(result.current.isLoading).toBe(false);
    });

    it('uses fallback message for non-Error thrown values', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ error: 'string-error' });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signIn('user@example.com', 'pass');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Sign in failed');
    });

    it('re-throws the error so callers can catch it', async () => {
      const authError = new Error('Auth error');
      mockAuth.signInWithPassword.mockResolvedValue({ error: authError });
      const { result } = renderHook(() => useEmailAuth());

      let caughtError: unknown;
      await act(async () => {
        try {
          await result.current.signIn('user@example.com', 'pass');
        } catch (err) {
          caughtError = err;
        }
      });

      expect(caughtError).toBe(authError);
    });

    it('sets isLoading to false after success', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signIn('user@example.com', 'pass');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets isLoading to false after failure', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        error: new Error('Fail'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signIn('user@example.com', 'wrong');
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp with email, password, and display name', async () => {
      mockAuth.signUp.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'Test User');
      });

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: { data: { display_name: 'Test User' } },
      });
    });

    it('calls supabase signUp without display name when omitted', async () => {
      mockAuth.signUp.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123');
      });

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: { data: { display_name: undefined } },
      });
    });

    it('sets error on signUp failure with Error instance', async () => {
      mockAuth.signUp.mockResolvedValue({
        error: new Error('Email already registered'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signUp('existing@example.com', 'pass');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Email already registered');
    });

    it('uses fallback message for non-Error thrown values', async () => {
      mockAuth.signUp.mockResolvedValue({ error: 42 });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signUp('new@example.com', 'pass');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Sign up failed');
    });

    it('re-throws the error so callers can catch it', async () => {
      const authError = new Error('Signup error');
      mockAuth.signUp.mockResolvedValue({ error: authError });
      const { result } = renderHook(() => useEmailAuth());

      let caughtError: unknown;
      await act(async () => {
        try {
          await result.current.signUp('new@example.com', 'pass');
        } catch (err) {
          caughtError = err;
        }
      });

      expect(caughtError).toBe(authError);
    });

    it('sets isLoading to false in finally block', async () => {
      mockAuth.signUp.mockResolvedValue({ error: new Error('Fail') });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signUp('new@example.com', 'pass');
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });

    it('sets error on signOut failure with Error instance', async () => {
      mockAuth.signOut.mockResolvedValue({
        error: new Error('Session expired'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signOut();
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Session expired');
    });

    it('uses fallback message for non-Error thrown values', async () => {
      mockAuth.signOut.mockResolvedValue({ error: { code: 500 } });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signOut();
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Sign out failed');
    });

    it('re-throws the error so callers can catch it', async () => {
      const authError = new Error('Signout error');
      mockAuth.signOut.mockResolvedValue({ error: authError });
      const { result } = renderHook(() => useEmailAuth());

      let caughtError: unknown;
      await act(async () => {
        try {
          await result.current.signOut();
        } catch (err) {
          caughtError = err;
        }
      });

      expect(caughtError).toBe(authError);
    });

    it('sets isLoading to false after success', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('calls supabase resetPasswordForEmail with the email', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.resetPassword('user@example.com');
      });

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('sets error on resetPassword failure with Error instance', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({
        error: new Error('Rate limit exceeded'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.resetPassword('user@example.com');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Rate limit exceeded');
    });

    it('uses fallback message for non-Error thrown values', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null as never });
      // Actually simulate a non-Error throw
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: 'unexpected' });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.resetPassword('user@example.com');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Password reset failed');
    });

    it('re-throws the error so callers can catch it', async () => {
      const authError = new Error('Reset error');
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: authError });
      const { result } = renderHook(() => useEmailAuth());

      let caughtError: unknown;
      await act(async () => {
        try {
          await result.current.resetPassword('user@example.com');
        } catch (err) {
          caughtError = err;
        }
      });

      expect(caughtError).toBe(authError);
    });

    it('sets isLoading to false after success', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.resetPassword('user@example.com');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('state isolation between operations', () => {
    it('clears previous error when a different operation succeeds', async () => {
      // signIn fails
      mockAuth.signInWithPassword.mockResolvedValue({
        error: new Error('Bad password'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signIn('user@example.com', 'wrong');
        } catch {
          // expected
        }
      });
      expect(result.current.error).toBe('Bad password');

      // signOut succeeds — error should be cleared
      mockAuth.signOut.mockResolvedValue({ error: null });
      await act(async () => {
        await result.current.signOut();
      });
      expect(result.current.error).toBeNull();
    });
  });
});
