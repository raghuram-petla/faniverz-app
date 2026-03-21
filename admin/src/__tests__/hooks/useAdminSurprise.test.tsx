import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: () => mockGetSession() },
  },
}));

import {
  useAdminSurprise,
  useAdminSurpriseItem,
  useCreateSurprise,
  useUpdateSurprise,
  useDeleteSurprise,
} from '@/hooks/useAdminSurprise';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function mockCrudApi(responseData: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status >= 200 && status < 300 ? responseData : { error: 'fail' }),
  } as Response);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

// ── useAdminSurprise (simple list, paginated=false) ──

describe('useAdminSurprise', () => {
  it('fetches all surprise content ordered by created_at desc', async () => {
    const items = [
      { id: 's1', title: 'Surprise 1', created_at: '2026-03-21' },
      { id: 's2', title: 'Surprise 2', created_at: '2026-03-20' },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: items, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminSurprise(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('surprise_content');
    expect(result.current.data).toEqual(items);
  });
});

describe('useAdminSurpriseItem', () => {
  it('fetches a single surprise item by id', async () => {
    const item = { id: 's1', title: 'Surprise 1' };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: item, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminSurpriseItem('s1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(item);
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useAdminSurpriseItem(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateSurprise', () => {
  it('sends POST to create surprise content', async () => {
    const fetchSpy = mockCrudApi({ id: 's-new', title: 'New Surprise' });

    const { result } = renderHook(() => useCreateSurprise(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'New Surprise' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ table: 'surprise_content', data: { title: 'New Surprise' } }),
      }),
    );
    fetchSpy.mockRestore();
  });
});

describe('useUpdateSurprise', () => {
  it('sends PATCH to update surprise content', async () => {
    const fetchSpy = mockCrudApi({ id: 's1', title: 'Updated' });

    const { result } = renderHook(() => useUpdateSurprise(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 's1', title: 'Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ table: 'surprise_content', id: 's1', data: { title: 'Updated' } }),
      }),
    );
    fetchSpy.mockRestore();
  });
});

describe('useDeleteSurprise', () => {
  it('sends DELETE for surprise content', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useDeleteSurprise(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('s1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'surprise_content', id: 's1' }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useDeleteSurprise(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('s1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
