import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMovieAddState } from '@/hooks/useMovieAddState';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  usePathname: () => '/movies/new',
}));

const mockCreateMovie = vi.fn();
const mockAddCast = vi.fn();
const mockAddVideo = vi.fn();
const mockAddPoster = vi.fn();
const mockSetMainPoster = vi.fn();
const mockAddPlatform = vi.fn();
const mockAddPH = vi.fn();
const mockAddRun = vi.fn();

vi.mock('@/hooks/useAdminMovies', () => ({
  useCreateMovie: () => ({ mutateAsync: mockCreateMovie }),
}));

vi.mock('@/hooks/useAdminCast', () => ({
  useAdminActors: () => ({ data: { pages: [] } }),
  useAddCast: () => ({ mutateAsync: mockAddCast }),
}));

vi.mock('@/hooks/useAdminTheatricalRuns', () => ({
  useAddTheatricalRun: () => ({ mutateAsync: mockAddRun }),
}));

vi.mock('@/hooks/useAdminVideos', () => ({
  useAddVideo: () => ({ mutateAsync: mockAddVideo }),
}));

vi.mock('@/hooks/useAdminPosters', () => ({
  useAddPoster: () => ({ mutateAsync: mockAddPoster }),
  useSetMainPoster: () => ({ mutateAsync: mockSetMainPoster }),
}));

vi.mock('@/hooks/useMovieProductionHouses', () => ({
  useAddMovieProductionHouse: () => ({ mutateAsync: mockAddPH }),
}));

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: () => ({ data: { pages: [] } }),
  useCreateProductionHouse: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useAdminOtt', () => ({
  useAddMoviePlatform: () => ({ mutateAsync: mockAddPlatform }),
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({ data: [] }),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  uploadImage: vi.fn(),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useMovieAddState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial empty form state', () => {
    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    expect(result.current.form.title).toBe('');
    expect(result.current.form.genres).toEqual([]);
    expect(result.current.form.backdrop_focus_x).toBeNull();
    expect(result.current.form.backdrop_focus_y).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    // Simplified focal point system — no spotlight/detail focus fields
    expect('spotlight_focus_x' in result.current.form).toBe(false);
    expect('detail_focus_x' in result.current.form).toBe(false);
  });

  it('updateField modifies form state', () => {
    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Test Movie'));
    expect(result.current.form.title).toBe('Test Movie');
  });

  it('toggleGenre adds and removes genres', () => {
    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.toggleGenre('Action'));
    expect(result.current.form.genres).toEqual(['Action']);
    act(() => result.current.toggleGenre('Action'));
    expect(result.current.form.genres).toEqual([]);
  });

  it('isDirty becomes true when form changes', () => {
    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Something'));
    expect(result.current.isDirty).toBe(true);
  });

  it('handleSubmit creates movie then adds relations and redirects', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-123' });
    mockAddCast.mockResolvedValue({});
    mockAddVideo.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });

    act(() => result.current.updateField('title', 'Test Movie'));
    act(() => {
      result.current.setPendingCastAdds((prev) => [
        ...prev,
        {
          _id: 'pc1',
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: 'Hero',
          role_order: null,
          display_order: 0,
          _actor: { id: 'a1', name: 'Actor 1' } as never,
        },
      ]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateMovie).toHaveBeenCalledTimes(1);
    expect(mockCreateMovie).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test Movie' }));
    expect(mockAddCast).toHaveBeenCalledWith(
      expect.objectContaining({ movie_id: 'movie-123', actor_id: 'a1' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/movies/movie-123');
  });

  it('handleSubmit shows alert when title is empty', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useMovieAddState(), { wrapper });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Title is required'));
    expect(mockCreateMovie).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('handleSubmit shows error alert on failure', async () => {
    mockCreateMovie.mockRejectedValue(new Error('Network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useMovieAddState(), { wrapper });

    act(() => result.current.updateField('title', 'Test'));
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(alertSpy).toHaveBeenCalledWith('Failed to create movie: Network error');
    alertSpy.mockRestore();
  });

  it('returns empty arrays for visible lists initially', () => {
    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    expect(result.current.visibleCast).toEqual([]);
    expect(result.current.visibleVideos).toEqual([]);
    expect(result.current.visiblePosters).toEqual([]);
    expect(result.current.visiblePlatforms).toEqual([]);
    expect(result.current.visibleProductionHouses).toEqual([]);
    expect(result.current.visibleRuns).toEqual([]);
  });

  it('handleSubmit adds pending videos', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-v1' });
    mockAddVideo.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Video Movie'));
    act(() => {
      result.current.setPendingVideoAdds((prev) => [
        ...prev,
        {
          _id: 'pv1',
          video_url: 'http://example.com/v.mp4',
          video_type: 'trailer',
          label: 'Teaser',
        },
      ]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAddVideo).toHaveBeenCalledWith(
      expect.objectContaining({ movie_id: 'movie-v1', video_url: 'http://example.com/v.mp4' }),
    );
  });

  it('handleSubmit adds pending posters with main poster override', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-p1' });
    mockAddPoster.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Poster Movie'));
    act(() => {
      result.current.setPendingPosterAdds((prev) => [
        ...prev,
        {
          _id: 'pp1',
          image_url: 'http://poster1.jpg',
          is_main_poster: false,
          image_type: 'poster',
        },
        { _id: 'pp2', image_url: 'http://poster2.jpg', is_main_poster: true, image_type: 'poster' },
      ]);
    });
    act(() => result.current.setPendingMainPosterId('pp1'));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAddPoster).toHaveBeenCalledTimes(2);
    // pp1 should be the main poster (override)
    expect(mockAddPoster).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: 'movie-p1',
        image_url: 'http://poster1.jpg',
        is_main_poster: true,
      }),
    );
    // pp2 should not be main (overridden)
    expect(mockAddPoster).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: 'http://poster2.jpg', is_main_poster: false }),
    );
  });

  it('handleSubmit adds pending platforms', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-pl1' });
    mockAddPlatform.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Platform Movie'));
    act(() => {
      result.current.setPendingPlatformAdds((prev) => [
        ...prev,
        { platform_id: 'plat-1', available_from: '2026-01-01', streaming_url: 'http://stream.com' },
      ]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAddPlatform).toHaveBeenCalledWith(
      expect.objectContaining({ movie_id: 'movie-pl1', platform_id: 'plat-1' }),
    );
  });

  it('handleSubmit adds pending production houses', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-ph1' });
    mockAddPH.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'PH Movie'));
    act(() => {
      result.current.setPendingPHAdds((prev) => [
        ...prev,
        { production_house_id: 'ph-1', _ph: { id: 'ph-1', name: 'PH' } },
      ]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAddPH).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 'movie-ph1', productionHouseId: 'ph-1' }),
    );
  });

  it('handleSubmit adds pending theatrical runs', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-tr1' });
    mockAddRun.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Run Movie'));
    act(() => {
      result.current.setPendingRunAdds((prev) => [
        ...prev,
        { _id: 'pr1', release_date: '2026-05-01', label: 'US' },
      ]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAddRun).toHaveBeenCalledWith(
      expect.objectContaining({ movie_id: 'movie-tr1', release_date: '2026-05-01', label: 'US' }),
    );
  });

  it('handleSubmit respects localCastOrder for display_order', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-co' });
    mockAddCast.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Cast Order Movie'));
    act(() => {
      result.current.setPendingCastAdds((prev) => [
        ...prev,
        {
          _id: 'c1',
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: 'A',
          role_order: null,
          display_order: 0,
          _actor: {} as never,
        },
        {
          _id: 'c2',
          actor_id: 'a2',
          credit_type: 'cast' as const,
          role_name: 'B',
          role_order: null,
          display_order: 1,
          _actor: {} as never,
        },
      ]);
    });
    // Reorder: c2 first, c1 second
    act(() => result.current.setLocalCastOrder(['c2', 'c1']));

    await act(async () => {
      await result.current.handleSubmit();
    });

    // c1 should have display_order=1, c2 should have display_order=0
    expect(mockAddCast).toHaveBeenCalledWith(
      expect.objectContaining({ actor_id: 'a1', display_order: 1 }),
    );
    expect(mockAddCast).toHaveBeenCalledWith(
      expect.objectContaining({ actor_id: 'a2', display_order: 0 }),
    );
  });

  it('handleSubmit uses poster_url from main pending poster', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-main' });
    mockAddPoster.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Main Poster Movie'));
    act(() => {
      result.current.setPendingPosterAdds((prev) => [
        ...prev,
        {
          _id: 'mp1',
          image_url: 'http://main-poster.jpg',
          is_main_poster: true,
          image_type: 'poster',
        },
      ]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateMovie).toHaveBeenCalledWith(
      expect.objectContaining({ poster_url: 'http://main-poster.jpg' }),
    );
  });

  it('handleSubmit shows alert for non-Error rejection', async () => {
    mockCreateMovie.mockRejectedValue({ code: 'UNKNOWN' });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useMovieAddState(), { wrapper });

    act(() => result.current.updateField('title', 'Fail'));
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('UNKNOWN'));
    alertSpy.mockRestore();
  });

  it('handleSubmit uses form.poster_url when no pending main poster exists', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-no-poster' });

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'No Poster'));
    act(() => result.current.updateField('poster_url', 'http://form-poster.jpg'));
    // No pending poster adds

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateMovie).toHaveBeenCalledWith(
      expect.objectContaining({ poster_url: 'http://form-poster.jpg' }),
    );
  });

  it('handleSubmit finds main poster via is_main_poster when pendingMainPosterId is null', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-fallback' });
    mockAddPoster.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Fallback Poster'));
    act(() => {
      result.current.setPendingPosterAdds((prev) => [
        ...prev,
        {
          _id: 'pp-fallback',
          image_url: 'http://fallback.jpg',
          is_main_poster: true,
          image_type: 'poster',
        },
      ]);
    });
    // Do NOT set pendingMainPosterId — leave it null so the fallback p.is_main_poster path is used

    await act(async () => {
      await result.current.handleSubmit();
    });

    // The main poster should use the is_main_poster: true poster
    expect(mockCreateMovie).toHaveBeenCalledWith(
      expect.objectContaining({ poster_url: 'http://fallback.jpg' }),
    );
  });

  it('handleSubmit uses original display_order when _id not in localCastOrder', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-order' });
    mockAddCast.mockResolvedValue({});

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Order Test'));
    act(() => {
      result.current.setPendingCastAdds((prev) => [
        ...prev,
        {
          _id: 'not-in-order',
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: 'X',
          role_order: null,
          display_order: 99,
          _actor: {} as never,
        },
      ]);
    });
    act(() => result.current.setLocalCastOrder(['some-other-id']));

    await act(async () => {
      await result.current.handleSubmit();
    });

    // indexOf returns -1, so display_order stays 99
    expect(mockAddCast).toHaveBeenCalledWith(expect.objectContaining({ display_order: 99 }));
  });

  it('handleSubmit passes null for empty form fields (runtime, certification, etc)', async () => {
    mockCreateMovie.mockResolvedValue({ id: 'movie-nulls' });

    const { result } = renderHook(() => useMovieAddState(), { wrapper });
    act(() => result.current.updateField('title', 'Null Fields'));
    // Leave all other fields empty

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateMovie).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: null,
        certification: null,
        synopsis: null,
        poster_url: null,
        backdrop_url: null,
        trailer_url: null,
        tmdb_id: null,
      }),
    );
  });

  it('pendingCastIds, pendingVideoIds, pendingRunIds are computed from pending adds', () => {
    const { result } = renderHook(() => useMovieAddState(), { wrapper });

    act(() => {
      result.current.setPendingCastAdds((prev) => [
        ...prev,
        {
          _id: 'c1',
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: 'X',
          role_order: null,
          display_order: 0,
          _actor: {} as never,
        },
      ]);
    });
    expect(result.current.pendingCastIds.has('c1')).toBe(true);

    act(() => {
      result.current.setPendingVideoAdds((prev) => [
        ...prev,
        { _id: 'v1', video_url: 'http://v.mp4', video_type: 'trailer', label: '' },
      ]);
    });
    expect(result.current.pendingVideoIds.has('v1')).toBe(true);

    act(() => {
      result.current.setPendingRunAdds((prev) => [
        ...prev,
        { _id: 'r1', release_date: '2026-01-01', label: 'US' },
      ]);
    });
    expect(result.current.pendingRunIds.has('r1')).toBe(true);
  });
});
