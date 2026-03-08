import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useUpdateProfile } from '@/hooks/useUpdateProfile';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockFetch.mockReset();

  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

describe('useUpdateProfile', () => {
  it('calls PATCH /api/profile with correct body and auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ avatar_url: 'https://cdn.example.com/a.jpg' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ avatar_url: 'https://cdn.example.com/a.jpg' }),
    });
  });

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ avatar_url: 'url' })).rejects.toThrow(
        'Not authenticated',
      );
    });
  });

  it('throws with server error message on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to update profile' }),
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ avatar_url: 'url' })).rejects.toThrow(
        'Failed to update profile',
      );
    });
  });
});
