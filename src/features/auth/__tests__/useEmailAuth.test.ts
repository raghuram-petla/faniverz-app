import { renderHook, act } from '@testing-library/react-native';
import { useEmailAuth } from '../hooks/useEmailAuth';

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  },
}));

describe('useEmailAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithEmail', () => {
    it('calls supabase.auth.signInWithPassword', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signInWithEmail('test@test.com', 'password');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password',
      });
    });

    it('returns true on success', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      let success: boolean;
      await act(async () => {
        success = await result.current.signInWithEmail('test@test.com', 'password');
      });

      expect(success!).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('sets error on auth failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
      });
      const { result } = renderHook(() => useEmailAuth());

      let success: boolean;
      await act(async () => {
        success = await result.current.signInWithEmail('test@test.com', 'wrong');
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('handles unexpected errors', async () => {
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signInWithEmail('test@test.com', 'password');
      });

      expect(result.current.error).toBe('An unexpected error occurred');
    });
  });

  describe('signUpWithEmail', () => {
    it('calls supabase.auth.signUp with display_name', async () => {
      mockSignUp.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signUpWithEmail('test@test.com', 'password', 'John');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password',
        options: { data: { display_name: 'John' } },
      });
    });

    it('returns true on success', async () => {
      mockSignUp.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      let success: boolean;
      await act(async () => {
        success = await result.current.signUpWithEmail('test@test.com', 'password', 'John');
      });

      expect(success!).toBe(true);
    });

    it('sets error on failure', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'Email already registered' },
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signUpWithEmail('test@test.com', 'password', 'John');
      });

      expect(result.current.error).toBe('Email already registered');
    });
  });
});
