jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { usePhoneAuth } from '../usePhoneAuth';
import { supabase } from '@/lib/supabase';

describe('usePhoneAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns initial state', () => {
    const { result } = renderHook(() => usePhoneAuth());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sends OTP successfully', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => usePhoneAuth());
    await act(async () => {
      await result.current.sendOtp('+919876543210');
    });
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ phone: '+919876543210' });
  });

  it('verifies OTP successfully', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => usePhoneAuth());
    await act(async () => {
      await result.current.verifyOtp('+919876543210', '123456');
    });
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+919876543210',
      token: '123456',
      type: 'sms',
    });
  });

  it('sets error on OTP send failure', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({
      error: new Error('rate limited'),
    });

    const { result } = renderHook(() => usePhoneAuth());
    await act(async () => {
      try {
        await result.current.sendOtp('+919876543210');
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('rate limited');
  });

  it('sets fallback error message on OTP send failure with non-Error thrown', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({
      error: { message: undefined },
    });
    // Simulate throwing a non-Error (e.g. a plain string or object)
    (supabase.auth.signInWithOtp as jest.Mock).mockRejectedValueOnce('string error');

    const { result } = renderHook(() => usePhoneAuth());
    await act(async () => {
      try {
        await result.current.sendOtp('+919876543210');
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('Failed to send OTP');
  });

  it('sets error on OTP verification failure', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValueOnce({
      error: new Error('Invalid OTP'),
    });

    const { result } = renderHook(() => usePhoneAuth());
    await act(async () => {
      try {
        await result.current.verifyOtp('+919876543210', '000000');
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('Invalid OTP');
  });

  it('sets fallback error message on verifyOtp failure with non-Error thrown', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockRejectedValueOnce('plain string error');

    const { result } = renderHook(() => usePhoneAuth());
    await act(async () => {
      try {
        await result.current.verifyOtp('+919876543210', '000000');
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe('OTP verification failed');
  });
});
