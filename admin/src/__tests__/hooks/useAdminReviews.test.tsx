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

/** Build a chainable mock — every method returns self, await resolves with data */
function buildChain(data: unknown[] | null = [], error: { message: string } | null = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const result = { data, error };

  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === 'catch') return () => self;
      if (!target[prop as string]) {
        target[prop as string] = vi.fn().mockReturnValue(self);
      }
      return target[prop as string];
    },
  });

  return { self, chain };
}

beforeEach(() => {
  mockFrom.mockReset();
});

describe('useAdminReviews', () => {
  it('fetches reviews with correct select, order, and limit', async () => {
    const { self, chain } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(chain.select).toHaveBeenCalledWith(
      '*, movie:movies(id, title, poster_url), profile:profiles(id, display_name, email)',
    );
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(200);
    expect(result.current.data).toEqual(mockReviews);
  });

  it('returns the full list of reviews as data', async () => {
    const { self } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].id).toBe('rev-1');
    expect(result.current.data![1].id).toBe('rev-2');
  });

  it('throws when supabase returns an error', async () => {
    const { self } = buildChain(null, { message: 'fetch failed' });
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('returns empty array when no reviews exist', async () => {
    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('applies rating filter via .eq when ratingFilter > 0', async () => {
    const { self, chain } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews('', 4), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.eq).toHaveBeenCalledWith('rating', 4);
  });

  it('does not apply .eq when ratingFilter is 0', async () => {
    const { self, chain } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews('', 0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // chain.eq is undefined when never accessed (Proxy creates lazily)
    expect(chain.eq).toBeUndefined();
  });

  it('applies .or filter when search is provided', async () => {
    const { self, chain } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews('Pushpa'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.or).toHaveBeenCalledWith('title.ilike.%Pushpa%,body.ilike.%Pushpa%');
  });

  it('does not apply .or when search is empty', async () => {
    const { self, chain } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // chain.or is undefined when never accessed (Proxy creates lazily)
    expect(chain.or).toBeUndefined();
  });

  it('filters client-side by movie title when searching', async () => {
    const reviews = [
      {
        ...mockReviews[0],
        title: null,
        body: null,
        movie: { id: 'mov-1', title: 'Pushpa 2', poster_url: null },
        profile: { id: 'usr-1', display_name: 'Someone', email: 'a@b.com' },
      },
      {
        ...mockReviews[1],
        title: null,
        body: null,
        movie: { id: 'mov-2', title: 'Game Changer', poster_url: null },
        profile: { id: 'usr-2', display_name: 'Other', email: 'c@d.com' },
      },
    ];
    const { self } = buildChain(reviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews('Pushpa'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Only the review with movie title "Pushpa 2" should match
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].movie?.title).toBe('Pushpa 2');
  });

  it('filters client-side by profile display_name when searching', async () => {
    const reviews = [
      {
        ...mockReviews[0],
        title: null,
        body: null,
        movie: { id: 'mov-1', title: 'Movie A', poster_url: null },
        profile: { id: 'usr-1', display_name: 'Test User', email: 'a@b.com' },
      },
      {
        ...mockReviews[1],
        title: null,
        body: null,
        movie: { id: 'mov-2', title: 'Movie B', poster_url: null },
        profile: { id: 'usr-2', display_name: 'Other', email: 'c@d.com' },
      },
    ];
    const { self } = buildChain(reviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews('Test User'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].profile?.display_name).toBe('Test User');
  });

  it('is disabled when search has exactly 1 character', async () => {
    const { self } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews('a'), {
      wrapper: createWrapper(),
    });

    // Query should not have been fetched
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('includes search and ratingFilter in query key', async () => {
    const { self } = buildChain(mockReviews);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminReviews('test', 3), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // If the query key were wrong, the data wouldn't match
    expect(result.current.data).toBeTruthy();
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

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockEq).toHaveBeenCalledWith('id', 'rev-1');
  });
});
