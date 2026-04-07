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
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
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

  it('handleSave updates existing review (update path)', async () => {
    const existingReview = {
      id: 'review-existing',
      movie_id: 'movie-1',
      author_id: 'user-1',
      title: 'Original Title',
      body: 'Original Body',
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
    mockUpdateEq.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.form.title).toBe('Original Title');
    });

    act(() => {
      result.current.updateField('title', 'Updated Title');
      result.current.updateField('body', 'Updated Body');
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 5);
      result.current.updateField('rating_technical', 4);
      result.current.updateField('rating_music', 4);
      result.current.updateField('rating_performances', 4);
    });

    let error: string | null = 'sentinel';
    await act(async () => {
      error = await result.current.handleSave();
    });

    expect(error).toBeNull();
    expect(result.current.saveStatus).toBe('success');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('handleSave update path — throws on update error', async () => {
    const existingReview = {
      id: 'review-existing',
      movie_id: 'movie-1',
      author_id: 'user-1',
      title: 'Original',
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
    mockUpdateEq.mockResolvedValue({ error: new Error('Update failed') });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.form.title).toBe('Original');
    });

    act(() => {
      result.current.updateField('title', 'New');
      result.current.updateField('body', 'New body');
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

    expect(error).toBe('Update failed');
    expect(result.current.saveStatus).toBe('error');
  });

  it('handleSave insert path — returns "Save failed" for non-Error thrown value', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    // Make insert throw a non-Error object
    mockInsert.mockRejectedValue('string error');

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'Title');
      result.current.updateField('body', 'Body');
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

    expect(error).toBe('Save failed');
    expect(result.current.saveStatus).toBe('error');
  });

  it('handleSave insert — throws error when insert returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ error: new Error('Insert failed') });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'Title');
      result.current.updateField('body', 'Body');
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

    expect(error).toBe('Insert failed');
    expect(result.current.saveStatus).toBe('error');
  });

  it('handleSave throws "Not authenticated" when session has no user', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { supabase: mockSupabase } = await import('@/lib/supabase-browser');
    vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as never);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'Title');
      result.current.updateField('body', 'Body');
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

    expect(error).toBe('Not authenticated');
    expect(result.current.saveStatus).toBe('error');
  });

  it('handleSave uses existing published_at when review is already published', async () => {
    const existingReview = {
      id: 'review-pub',
      movie_id: 'movie-1',
      author_id: 'user-1',
      title: 'Published Review',
      body: 'Body',
      verdict: null,
      rating_story: 4,
      rating_direction: 4,
      rating_technical: 4,
      rating_music: 4,
      rating_performances: 4,
      overall_rating: 4.0,
      is_published: true,
      published_at: '2025-06-01T12:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      agree_count: 0,
      disagree_count: 0,
    };
    mockMaybeSingle.mockResolvedValue({ data: existingReview, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.form.title).toBe('Published Review');
    });

    // Change title to make it dirty
    act(() => {
      result.current.updateField('title', 'Updated Published Review');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ published_at: '2025-06-01T12:00:00Z' }),
    );
  });

  it('beforeunload handler calls preventDefault when isDirty is true', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Make form dirty
    act(() => {
      result.current.updateField('title', 'Dirty Title');
    });

    expect(result.current.isDirty).toBe(true);

    // Simulate beforeunload event
    const preventDefaultSpy = vi.fn();
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('beforeunload handler does NOT call preventDefault when isDirty is false', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { Wrapper } = makeWrapper();
    renderHook(() => useEditorialReviewState('movie-1'), { wrapper: Wrapper });

    await waitFor(() => expect(true).toBe(true));

    const preventDefaultSpy = vi.fn();
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });
    window.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('queryFn throws when supabase returns an error', async () => {
    const dbError = new Error('DB error');
    mockMaybeSingle.mockResolvedValue({ data: null, error: dbError });

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    renderHook(() => useEditorialReviewState('movie-1'), { wrapper: Wrapper });

    await waitFor(() => {
      const state = qc.getQueryState(['admin', 'editorial-review', 'movie-1']);
      expect(state?.status).toBe('error');
    });
  });

  it('cleanup: clears save timer on unmount after successful save', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result, unmount } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateField('title', 'Title');
      result.current.updateField('body', 'Body');
      result.current.updateField('rating_story', 4);
      result.current.updateField('rating_direction', 4);
      result.current.updateField('rating_technical', 4);
      result.current.updateField('rating_music', 4);
      result.current.updateField('rating_performances', 4);
    });

    // Use fake timers AFTER async setup is complete to prevent hanging
    vi.useFakeTimers();

    await act(async () => {
      await result.current.handleSave();
    });

    // After save, a 3000ms timer is running — advance timers to fire it
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.saveStatus).toBe('idle');

    // Unmount after timer fired — cleanup should work without error
    unmount();
    vi.useRealTimers();
  });

  it('handleSave uses new ISO timestamp for published_at when existing has no published_at', async () => {
    const existingReview = {
      id: 'review-unpub',
      movie_id: 'movie-1',
      author_id: 'user-1',
      title: 'Review',
      body: 'Body',
      verdict: null,
      rating_story: 4,
      rating_direction: 4,
      rating_technical: 4,
      rating_music: 4,
      rating_performances: 4,
      overall_rating: 4.0,
      is_published: false,
      published_at: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      agree_count: 0,
      disagree_count: 0,
    };
    mockMaybeSingle.mockResolvedValue({ data: existingReview, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEditorialReviewState('movie-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.form.title).toBe('Review');
    });

    // Enable published and change title to make dirty
    act(() => {
      result.current.updateField('is_published', true);
      result.current.updateField('title', 'Review Updated');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Should have been called with a newly generated ISO timestamp for published_at
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_published: true,
        published_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      }),
    );
  });
});
