import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// @contract mock supabase to isolate hook from real DB calls
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn((_table: string) => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { maybeSingle: () => mockMaybeSingle() };
          },
        };
      },
      update: (payload: unknown) => {
        mockUpdate(payload);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockUpdateEq(...eqArgs);
            return mockUpdateEq();
          },
        };
      },
      insert: (payload: unknown) => {
        mockInsert(payload);
        return mockInsert(payload);
      },
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
  },
}));

import { useEditorialReviewState } from '@/hooks/useEditorialReviewState';
import type { EditorialReviewForm } from '@/hooks/useEditorialReviewState';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

const EMPTY_FORM: EditorialReviewForm = {
  title: '',
  body: '',
  verdict: '',
  rating_story: 0,
  rating_direction: 0,
  rating_technical: 0,
  rating_music: 0,
  rating_performances: 0,
  is_published: false,
};

describe('useEditorialReviewState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('returns empty form state initially', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    expect(result.current.form).toEqual(EMPTY_FORM);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasExisting).toBe(false);
    expect(result.current.computedOverall).toBeNull();
    expect(result.current.saveStatus).toBe('idle');
  });

  it('isLoading is true while query is fetching', () => {
    // Never resolve the query to keep it loading
    mockMaybeSingle.mockReturnValue(new Promise(() => {}));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('hydrates form when existing review is fetched', async () => {
    const existingReview = {
      id: 'review-1',
      movie_id: 'movie-1',
      author_id: 'user-1',
      title: 'Great Film',
      body: 'Very enjoyable',
      verdict: 'Must watch',
      rating_story: 4,
      rating_direction: 5,
      rating_technical: 3,
      rating_music: 4,
      rating_performances: 5,
      overall_rating: 4.2,
      is_published: true,
      published_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      agree_count: 0,
      disagree_count: 0,
    };
    mockMaybeSingle.mockResolvedValue({ data: existingReview, error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.form.title).toBe('Great Film');
    });

    expect(result.current.form.body).toBe('Very enjoyable');
    expect(result.current.form.verdict).toBe('Must watch');
    expect(result.current.form.rating_story).toBe(4);
    expect(result.current.form.rating_direction).toBe(5);
    expect(result.current.form.is_published).toBe(true);
    expect(result.current.hasExisting).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('tracks dirty state when a field changes', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.updateField('title', 'New Title');
    });

    expect(result.current.form.title).toBe('New Title');
    expect(result.current.isDirty).toBe(true);
  });

  it('updateField updates individual form fields', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.updateField('body', 'Review text'));
    expect(result.current.form.body).toBe('Review text');

    act(() => result.current.updateField('rating_story', 4));
    expect(result.current.form.rating_story).toBe(4);

    act(() => result.current.updateField('is_published', true));
    expect(result.current.form.is_published).toBe(true);
  });

  it('computes overall rating when all 5 craft ratings are set', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 5);
      result.current.updateField('rating_technical', 3);
      result.current.updateField('rating_music', 4);
      result.current.updateField('rating_performances', 4);
    });

    // (4+5+3+4+4)/5 = 4.0
    expect(result.current.computedOverall).toBe('4.0');
  });

  it('returns null computedOverall when not all craft ratings are set', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 5);
      // Leave technical, music, performances at 0
    });

    expect(result.current.computedOverall).toBeNull();
  });

  it('validates that title is required', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Set body and ratings but leave title empty
    act(() => {
      result.current.updateField('body', 'Some body');
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 4);
      result.current.updateField('rating_technical', 4);
      result.current.updateField('rating_music', 4);
      result.current.updateField('rating_performances', 4);
    });

    let error: string | null = null;
    await act(async () => {
      error = await result.current.handleSave();
    });

    expect(error).toBe('Title is required');
    expect(result.current.saveStatus).toBe('error');
  });

  it('validates that body is required', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'A title');
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 4);
      result.current.updateField('rating_technical', 4);
      result.current.updateField('rating_music', 4);
      result.current.updateField('rating_performances', 4);
    });

    let error: string | null = null;
    await act(async () => {
      error = await result.current.handleSave();
    });

    expect(error).toBe('Review body is required');
  });

  it('validates that all 5 craft ratings are required', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'A title');
      result.current.updateField('body', 'A body');
      result.current.updateField('rating_story', 4);
      // Leave others at 0
    });

    let error: string | null = null;
    await act(async () => {
      error = await result.current.handleSave();
    });

    expect(error).toBe('All 5 craft ratings are required (1-5)');
  });

  it('handleSave returns null on successful insert (new review)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'Great Film');
      result.current.updateField('body', 'A solid review body');
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 5);
      result.current.updateField('rating_technical', 3);
      result.current.updateField('rating_music', 4);
      result.current.updateField('rating_performances', 4);
    });

    let error: string | null = null;
    await act(async () => {
      error = await result.current.handleSave();
    });

    expect(error).toBeNull();
    expect(result.current.saveStatus).toBe('success');
  });

  it('resets isDirty after successful save', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'A title');
      result.current.updateField('body', 'A body');
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 4);
      result.current.updateField('rating_technical', 4);
      result.current.updateField('rating_music', 4);
      result.current.updateField('rating_performances', 4);
    });

    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('handles null verdict from existing review', async () => {
    const existingReview = {
      id: 'review-1',
      movie_id: 'movie-1',
      author_id: 'user-1',
      title: 'Title',
      body: 'Body',
      verdict: null,
      rating_story: 3,
      rating_direction: 3,
      rating_technical: 3,
      rating_music: 3,
      rating_performances: 3,
      overall_rating: 3.0,
      is_published: false,
      published_at: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      agree_count: 0,
      disagree_count: 0,
    };
    mockMaybeSingle.mockResolvedValue({ data: existingReview, error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.form.title).toBe('Title');
    });

    // Null verdict should be coerced to empty string
    expect(result.current.form.verdict).toBe('');
  });
});
