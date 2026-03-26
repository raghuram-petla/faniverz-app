import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockPush = vi.fn();
const mockMutateAsync = vi.fn();
const mockAlert = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/useAdminMovies', () => ({
  useCreateMovie: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock('@/hooks/useAdminCast', () => ({
  useAdminActors: () => ({ data: { pages: [[]] } }),
  useAddCast: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/hooks/useAdminTheatricalRuns', () => ({
  useAddTheatricalRun: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/hooks/useAdminVideos', () => ({
  useAddVideo: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/hooks/useAdminPosters', () => ({
  useAddPoster: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/hooks/useMovieProductionHouses', () => ({
  useAddMovieProductionHouse: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: () => ({ data: { pages: [[]] } }),
  useCreateProductionHouse: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminOtt', () => ({
  useAddMoviePlatform: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({ data: [] }),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/hooks/useMovieEditDerived', () => ({
  useMovieEditDerived: () => ({
    visibleCast: [],
    visibleVideos: [],
    visiblePosters: [],
    visiblePlatforms: [],
    visibleProductionHouses: [],
    visibleAvailability: [],
    visibleRuns: [],
    isDirty: false,
    savedMainPosterId: null,
  }),
}));

vi.mock('@/hooks/useMovieEditPendingState', () => ({
  useMovieEditPendingState: () => ({
    pendingCastAdds: [],
    pendingVideoAdds: [],
    pendingPosterAdds: [],
    pendingPlatformAdds: [],
    pendingPHAdds: [],
    pendingAvailabilityAdds: [],
    pendingRunAdds: [],
    pendingMainPosterId: null,
    localCastOrder: null,
    setPendingCastAdds: vi.fn(),
    setPendingVideoAdds: vi.fn(),
    setPendingPosterAdds: vi.fn(),
    setPendingPlatformAdds: vi.fn(),
    setPendingPHAdds: vi.fn(),
    setPendingAvailabilityAdds: vi.fn(),
    setPendingAvailabilityRemoveIds: vi.fn(),
    setPendingRunAdds: vi.fn(),
    setPendingMainPosterId: vi.fn(),
    setLocalCastOrder: vi.fn(),
  }),
}));

vi.mock('@/hooks/createCommonFormHandlers', () => ({
  createCommonFormHandlers: () => ({
    updateField: vi.fn(),
    toggleGenre: vi.fn(),
    handleImageUpload: vi.fn(),
    removePendingCast: vi.fn(),
    removePendingVideo: vi.fn(),
    removePendingPoster: vi.fn(),
    removePendingPlatform: vi.fn(),
    removePendingPH: vi.fn(),
    removePendingRun: vi.fn(),
  }),
}));

vi.mock('@/lib/movie-validation', () => ({
  validateMovieForm: vi.fn(() => []),
  formatErrors: vi.fn(() => ''),
}));

import { useMovieAddState } from '@/hooks/useMovieAddState';
import { validateMovieForm, formatErrors } from '@/lib/movie-validation';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe('useMovieAddState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = mockAlert;
    vi.mocked(validateMovieForm).mockReturnValue([]);
    mockMutateAsync.mockResolvedValue({ id: 'new-movie-1' });
  });

  it('returns initial state', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    expect(result.current.form.title).toBe('');
    expect(result.current.isSaving).toBe(false);
  });

  it('shows validation errors and aborts submit', async () => {
    vi.mocked(validateMovieForm).mockReturnValue([
      { field: 'title', message: 'Title is required' },
    ]);
    vi.mocked(formatErrors).mockReturnValue('Title is required');

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Title is required'));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits form successfully and navigates', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    // Set title so validation passes
    act(() => {
      result.current.setForm((f) => ({ ...f, title: 'Test Movie' }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/movies/new-movie-1');
  });

  it('handles submit error with Error instance', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Create failed'));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAlert).toHaveBeenCalledWith('Failed to create movie: Create failed');
  });

  it('handles submit error with non-Error object', async () => {
    mockMutateAsync.mockRejectedValue({ code: 'UNKNOWN' });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to create movie:'));
  });

  it('prevents default event on submit', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    const mockEvent = { preventDefault: vi.fn() };

    await act(async () => {
      await result.current.handleSubmit(mockEvent as unknown as React.FormEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('submits with pending poster adds using pendingMainPosterId', async () => {
    // Override the pending state mock to have pending poster adds
    const mockPendingState = {
      pendingCastAdds: [],
      pendingVideoAdds: [],
      pendingPosterAdds: [
        { _id: 'poster-1', image_url: 'poster1.jpg', is_main_poster: false },
        { _id: 'poster-2', image_url: 'poster2.jpg', is_main_poster: true },
      ],
      pendingPlatformAdds: [],
      pendingPHAdds: [],
      pendingAvailabilityAdds: [],
      pendingRunAdds: [],
      pendingMainPosterId: 'poster-1',
      localCastOrder: null,
      setPendingCastAdds: vi.fn(),
      setPendingVideoAdds: vi.fn(),
      setPendingPosterAdds: vi.fn(),
      setPendingPlatformAdds: vi.fn(),
      setPendingPHAdds: vi.fn(),
      setPendingAvailabilityAdds: vi.fn(),
      setPendingAvailabilityRemoveIds: vi.fn(),
      setPendingRunAdds: vi.fn(),
      setPendingMainPosterId: vi.fn(),
      setLocalCastOrder: vi.fn(),
    };
    vi.mocked(await import('@/hooks/useMovieEditPendingState')).useMovieEditPendingState = vi.fn(
      () => mockPendingState,
    ) as never;

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        // poster_url should be from pendingMainPosterId override
        poster_url: 'poster1.jpg',
      }),
    );
  });

  it('submits with pending cast adds using localCastOrder', async () => {
    const mockPendingState = {
      pendingCastAdds: [
        { _id: 'cast-1', _actor: null, actor_id: 'a1', character_name: 'Hero', display_order: 0 },
        {
          _id: 'cast-2',
          _actor: null,
          actor_id: 'a2',
          character_name: 'Villain',
          display_order: 1,
        },
      ],
      pendingVideoAdds: [],
      pendingPosterAdds: [],
      pendingPlatformAdds: [],
      pendingPHAdds: [],
      pendingAvailabilityAdds: [],
      pendingRunAdds: [],
      pendingMainPosterId: null,
      localCastOrder: ['cast-2', 'cast-1'], // reversed order
      setPendingCastAdds: vi.fn(),
      setPendingVideoAdds: vi.fn(),
      setPendingPosterAdds: vi.fn(),
      setPendingPlatformAdds: vi.fn(),
      setPendingPHAdds: vi.fn(),
      setPendingAvailabilityAdds: vi.fn(),
      setPendingAvailabilityRemoveIds: vi.fn(),
      setPendingRunAdds: vi.fn(),
      setPendingMainPosterId: vi.fn(),
      setLocalCastOrder: vi.fn(),
    };
    vi.mocked(await import('@/hooks/useMovieEditPendingState')).useMovieEditPendingState = vi.fn(
      () => mockPendingState,
    ) as never;

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('exposes pendingCastIds, pendingVideoIds, pendingRunIds as Sets', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    expect(result.current.pendingCastIds).toBeInstanceOf(Set);
    expect(result.current.pendingVideoIds).toBeInstanceOf(Set);
    expect(result.current.pendingRunIds).toBeInstanceOf(Set);
  });

  it('submits with pending platform, PH, and theatrical run adds', async () => {
    const mockAddVideo = vi.fn().mockResolvedValue({});
    const mockAddPlatform = vi.fn().mockResolvedValue({});
    const mockAddPH = vi.fn().mockResolvedValue({});
    const mockAddRun = vi.fn().mockResolvedValue({});

    const mockPendingState = {
      pendingCastAdds: [],
      pendingVideoAdds: [{ _id: 'vid-1', youtube_id: 'abc123', label: 'Trailer', language: 'te' }],
      pendingPosterAdds: [],
      pendingPlatformAdds: [
        {
          platform_id: 'aha',
          available_from: '2026-01-01',
          streaming_url: 'https://aha.com/movie',
        },
      ],
      pendingPHAdds: [{ production_house_id: 'ph-1' }],
      pendingAvailabilityAdds: [],
      pendingRunAdds: [{ _id: 'run-1', release_date: '2026-03-01', label: 'Wide Release' }],
      pendingMainPosterId: null,
      localCastOrder: null,
      setPendingCastAdds: vi.fn(),
      setPendingVideoAdds: vi.fn(),
      setPendingPosterAdds: vi.fn(),
      setPendingPlatformAdds: vi.fn(),
      setPendingPHAdds: vi.fn(),
      setPendingAvailabilityAdds: vi.fn(),
      setPendingAvailabilityRemoveIds: vi.fn(),
      setPendingRunAdds: vi.fn(),
      setPendingMainPosterId: vi.fn(),
      setLocalCastOrder: vi.fn(),
    };
    vi.mocked(await import('@/hooks/useMovieEditPendingState')).useMovieEditPendingState = vi.fn(
      () => mockPendingState,
    ) as never;
    vi.mocked(await import('@/hooks/useAdminVideos')).useAddVideo = vi.fn(() => ({
      mutateAsync: mockAddVideo,
    })) as never;
    vi.mocked(await import('@/hooks/useAdminOtt')).useAddMoviePlatform = vi.fn(() => ({
      mutateAsync: mockAddPlatform,
    })) as never;
    vi.mocked(await import('@/hooks/useMovieProductionHouses')).useAddMovieProductionHouse = vi.fn(
      () => ({ mutateAsync: mockAddPH }),
    ) as never;
    vi.mocked(await import('@/hooks/useAdminTheatricalRuns')).useAddTheatricalRun = vi.fn(() => ({
      mutateAsync: mockAddRun,
    })) as never;

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockAddPlatform).toHaveBeenCalledWith(
      expect.objectContaining({
        platform_id: 'aha',
        available_from: '2026-01-01',
        streaming_url: 'https://aha.com/movie',
      }),
    );
    expect(mockAddPH).toHaveBeenCalledWith(expect.objectContaining({ productionHouseId: 'ph-1' }));
    expect(mockAddRun).toHaveBeenCalledWith(
      expect.objectContaining({
        release_date: '2026-03-01',
        label: 'Wide Release',
      }),
    );
  });

  it('submits with all form fields populated to cover truthy branches', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    act(() => {
      result.current.setForm(() => ({
        title: 'Full Movie',
        poster_url: 'poster.jpg',
        backdrop_url: 'backdrop.jpg',
        release_date: '2026-01-01',
        runtime: '120',
        genres: ['Action'],
        certification: 'UA',
        synopsis: 'A good movie',
        in_theaters: true,
        premiere_date: '2026-02-01',
        original_language: 'te',
        is_featured: true,
        tmdb_id: '12345',
        tagline: 'Best movie',
        backdrop_focus_x: 0.5,
        backdrop_focus_y: 0.3,
        poster_focus_x: null,
        poster_focus_y: null,
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Full Movie',
        runtime: 120,
        certification: 'UA',
        synopsis: 'A good movie',
        tmdb_id: 12345,
        original_language: 'te',
        premiere_date: '2026-02-01',
      }),
    );
  });

  it('exposes phSearchResults and setPHSearchQuery', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieAddState(), { wrapper: Wrapper });

    expect(result.current.phSearchResults).toBeDefined();
    expect(typeof result.current.setPHSearchQuery).toBe('function');
  });
});
