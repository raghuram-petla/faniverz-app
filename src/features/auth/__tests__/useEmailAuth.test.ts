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
import { useEmailAuth } from '../hooks/useEmailAuth';

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

  describe('signIn', () => {
    it('calls supabase signInWithPassword with email and password', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signIn('test@test.com', 'password123');
      });

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });

    it('sets error on failure', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        error: new Error('Invalid credentials'),
      });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        try {
          await result.current.signIn('test@test.com', 'wrong');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp with email, password, and display name', async () => {
      mockAuth.signUp.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signUp('new@test.com', 'password123', 'Test User');
      });

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'password123',
        options: { data: { display_name: 'Test User' } },
      });
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('calls supabase resetPasswordForEmail', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useEmailAuth());

      await act(async () => {
        await result.current.resetPassword('test@test.com');
      });

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com');
    });
  });
});
