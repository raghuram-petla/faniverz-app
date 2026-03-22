jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      signOut: jest.fn(),
    },
  },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteAccount } from '../useDeleteAccount';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '@/lib/supabase';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useDeleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'u1' } });
  });

  it('returns a mutation object', () => {
    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });

  it('calls rpc with correct user ID on mutate', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: null });
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account', {
      target_user_id: 'u1',
    });
  });

  it('calls signOut after successful deletion', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: null });
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('throws when user is not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not authenticated');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('throws when rpc returns error', async () => {
    const rpcError = { message: 'RPC failed', code: 'P0001' };
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: rpcError });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(rpcError);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('ignores signOut error after successful account deletion', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: null });
    (supabase.auth.signOut as jest.Mock).mockRejectedValueOnce(new Error('signout failed'));

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    // Mutation should still succeed even if signOut fails (catch swallows the error)
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
