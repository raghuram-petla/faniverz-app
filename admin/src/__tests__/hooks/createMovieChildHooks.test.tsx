import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { createMovieChildHooks } from '@/hooks/createMovieChildHooks';

interface TestChild {
  id: string;
  movie_id: string;
  title: string;
  display_order: number;
}

const hooks = createMovieChildHooks<TestChild>({
  table: 'movie_videos',
  keySuffix: 'videos',
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────

function mockSelectList(data: unknown[] = []) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  });
}

function mockInsert(data: unknown = { id: 'new-1', movie_id: 'm1', title: 'Added' }) {
  const mockSingle = vi.fn().mockResolvedValue({ data, error: null });
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsertFn });
  return { mockInsertFn };
}

function mockUpdate(data: unknown = { id: 'u-1', movie_id: 'm1', title: 'Updated' }) {
  const mockSingle = vi.fn().mockResolvedValue({ data, error: null });
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdateFn });
  return { mockUpdateFn, mockEq };
}

function mockDelete() {
  const mockEq2 = vi.fn().mockResolvedValue({ error: null });
  const mockEq = vi.fn().mockReturnValue({ eq: mockEq2 });
  const mockDeleteFn = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ delete: mockDeleteFn });
  return { mockDeleteFn, mockEq };
}

// ── useList ────────────────────────────────────────────────

describe('createMovieChildHooks – useList', () => {
  it('fetches from correct table with movieId filter', async () => {
    const items = [{ id: '1', movie_id: 'm1', title: 'Trailer', display_order: 1 }];
    mockSelectList(items);

    const { result } = renderHook(() => hooks.useList('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(result.current.data).toEqual(items);
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => hooks.useList(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useAdd ─────────────────────────────────────────────────

describe('createMovieChildHooks – useAdd', () => {
  it('inserts and invalidates correct query key', async () => {
    const { mockInsertFn } = mockInsert();

    const { result } = renderHook(() => hooks.useAdd(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movie_id: 'm1', title: 'New' } as Partial<TestChild>);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(mockInsertFn).toHaveBeenCalledWith({ movie_id: 'm1', title: 'New' });
  });
});

// ── useUpdate ──────────────────────────────────────────────

describe('createMovieChildHooks – useUpdate', () => {
  it('updates by id and invalidates', async () => {
    const { mockUpdateFn, mockEq } = mockUpdate();

    const { result } = renderHook(() => hooks.useUpdate(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'u-1', movieId: 'm1', title: 'Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(mockUpdateFn).toHaveBeenCalledWith({ title: 'Updated' });
    expect(mockEq).toHaveBeenCalledWith('id', 'u-1');
  });
});

// ── useRemove ──────────────────────────────────────────────

describe('createMovieChildHooks – useRemove', () => {
  it('deletes by id and invalidates', async () => {
    const { mockDeleteFn, mockEq } = mockDelete();

    const { result } = renderHook(() => hooks.useRemove(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'del-1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(mockDeleteFn).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'del-1');
  });
});
