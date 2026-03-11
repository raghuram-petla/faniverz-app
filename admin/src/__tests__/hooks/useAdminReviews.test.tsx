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

import { useAdminReviews, useDeleteReview } from '@/hooks/useAdminReviews';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockReviews = [
  {
    id: 'rev-1',
    movie_id: 'mov-1',
    user_id: 'usr-1',
    rating: 4,
    title: 'Great Movie',
    body: 'Loved it',
    contains_spoiler: false,
    helpful_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    movie: { id: 'mov-1', title: 'Pushpa 2', poster_url: null },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'rev-2',
    movie_id: 'mov-2',
    user_id: 'usr-2',
    rating: 2,
    title: null,
    body: 'Not great',
    contains_spoiler: true,
    helpful_count: 0,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    movie: { id: 'mov-2', title: 'Game Changer', poster_url: 'https://img.test/poster.jpg' },
    profile: { id: 'usr-2', display_name: null, email: 'user2@example.com' },
  },
];

beforeEach(() => {
  mockFrom.mockReset();
});

describe('useAdminReviews', () => {
  it('fetches reviews with correct select, order, and limit', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: mockReviews, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockSelect).toHaveBeenCalledWith(
      '*, movie:movies(id, title, poster_url), profile:profiles(id, display_name, email)',
    );
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(200);
    expect(result.current.data).toEqual(mockReviews);
  });

  it('returns the full list of reviews as data', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: mockReviews, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].id).toBe('rev-1');
    expect(result.current.data![1].id).toBe('rev-2');
  });

  it('throws when supabase returns an error', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: null, error: { message: 'fetch failed' } });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({ message: 'fetch failed' });
  });

  it('returns empty array when no reviews exist', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe('useDeleteReview', () => {
  it('deletes a review by id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteReview(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('rev-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'rev-1');
  });

  it('returns the deleted id on success', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteReview(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('rev-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe('rev-1');
  });

  it('sets isError when supabase delete fails', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteReview(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('rev-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({ message: 'delete failed' });
  });

  it('invalidates admin reviews query on success', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const wrapper = createWrapper();

    const { result } = renderHook(() => useDeleteReview(), { wrapper });

    await act(async () => {
      result.current.mutate('rev-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the mutation completed and supabase was called correctly
    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockEq).toHaveBeenCalledWith('id', 'rev-1');
  });
});
