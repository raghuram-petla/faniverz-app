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
});
