import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetSession = vi.fn();
const mockFetch = vi.fn();
const mockAlert = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Override global.fetch and window.alert
beforeEach(() => {
  global.fetch = mockFetch;
  global.alert = mockAlert;
});

import { useUpdateProfile } from '../useUpdateProfile';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlert.mockReset();
  });

  it('throws when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ display_name: 'Test' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAlert).toHaveBeenCalledWith('Not authenticated');
  });

  it('calls PATCH /api/profile with auth header', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ display_name: 'New Name' });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ display_name: 'New Name' }),
      }),
    );
  });

  it('throws with server error message when response not ok', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Validation failed' }),
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ display_name: 'X' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAlert).toHaveBeenCalledWith('Validation failed');
  });

  it('throws with fallback error when response has no error field', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ display_name: 'X' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAlert).toHaveBeenCalledWith('Update failed');
  });

  it('calls onError with window.alert for non-Error thrown values', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'bad-token' } },
    });
    // Simulate a thrown string (non-Error)
    mockFetch.mockRejectedValue('network down');

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ display_name: 'X' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAlert).toHaveBeenCalledWith('Profile update failed');
  });

  it('handles non-JSON error response gracefully', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ display_name: 'X' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAlert).toHaveBeenCalledWith('Update failed');
  });

  it('updates avatar_url successfully', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ avatar_url: 'https://example.com/new.jpg' }),
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ avatar_url: 'https://example.com/new.jpg' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ avatar_url: 'https://example.com/new.jpg' });
  });
});
