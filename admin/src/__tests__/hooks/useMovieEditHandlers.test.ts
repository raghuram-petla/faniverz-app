import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMovieEditHandlers } from '@/hooks/useMovieEditHandlers';
import type { MovieEditHandlerDeps } from '@/hooks/useMovieEditTypes';

vi.mock('@/hooks/createCommonFormHandlers', () => ({
  createCommonFormHandlers: () => ({
    updateField: vi.fn(),
    toggleGenre: vi.fn(),
    handleImageUpload: vi.fn(),
    handleVideoRemove: vi.fn(),
    handlePosterRemove: vi.fn(),
    handlePlatformRemove: vi.fn(),
    handlePHRemove: vi.fn(),
    handleCastRemove: vi.fn(),
    handleRunRemove: vi.fn(),
    handleRunEnd: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMovieEditSubmitHelpers', () => ({
  buildChildMutationPromises: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/movie-validation', () => ({
  validateMovieForm: vi.fn().mockReturnValue([]),
  formatErrors: vi.fn().mockReturnValue(''),
}));

function createMockDeps(overrides?: Partial<MovieEditHandlerDeps>): MovieEditHandlerDeps {
  return {
    id: 'movie-1',
    form: {
      title: 'Test Movie',
      poster_url: 'https://example.com/poster.jpg',
      backdrop_url: '',
      release_date: '2026-01-01',
      runtime: '120',
      genres: ['Action'],
      certification: 'UA',
      synopsis: 'A test movie',
      trailer_url: '',
      in_theaters: false,
      premiere_date: '',
      original_language: 'te',
      is_featured: false,
      tmdb_id: '12345',
      tagline: 'Test tagline',
      backdrop_focus_x: null,
      backdrop_focus_y: null,
      poster_focus_x: null,
      poster_focus_y: null,
    },
    setForm: vi.fn(),
    router: { push: vi.fn() } as never,
    queryClient: {
      invalidateQueries: vi.fn(),
    } as never,
    movieData: {
      spotlight_focus_x: null,
      spotlight_focus_y: null,
      detail_focus_x: null,
      detail_focus_y: null,
    },
    pendingPosterAdds: [],
    pendingMainPosterId: null,
    postersData: [],
    updateMovie: { mutateAsync: vi.fn().mockResolvedValue({}) },
    deleteMovie: { mutateAsync: vi.fn().mockResolvedValue('movie-1') },
    resetPendingState: vi.fn(),
    setInitialForm: vi.fn(),
    setIsSaving: vi.fn(),
    setSaveStatus: vi.fn(),
    setUploadingPoster: vi.fn(),
    setUploadingBackdrop: vi.fn(),
    // Pending state
    setPendingCastAdds: vi.fn(),
    setPendingCastRemoveIds: vi.fn(),
    setPendingVideoAdds: vi.fn(),
    setPendingVideoRemoveIds: vi.fn(),
    setPendingPosterAdds: vi.fn(),
    setPendingPosterRemoveIds: vi.fn(),
    setPendingPlatformAdds: vi.fn(),
    setPendingPlatformRemoveIds: vi.fn(),
    setPendingPHAdds: vi.fn(),
    setPendingPHRemoveIds: vi.fn(),
    setPendingRunAdds: vi.fn(),
    setPendingRunRemoveIds: vi.fn(),
    setPendingRunEndIds: vi.fn(),
    localCastOrder: null,
    pendingCastAdds: [],
    pendingCastRemoveIds: new Set(),
    pendingVideoAdds: [],
    pendingVideoRemoveIds: new Set(),
    pendingPosterRemoveIds: new Set(),
    pendingPlatformAdds: [],
    pendingPlatformRemoveIds: new Set(),
    pendingPHAdds: [],
    pendingPHRemoveIds: new Set(),
    pendingRunAdds: [],
    pendingRunRemoveIds: new Set(),
    pendingRunEndIds: new Map(),
    addCast: { mutateAsync: vi.fn() },
    removeCast: { mutateAsync: vi.fn() },
    updateCastOrder: { mutateAsync: vi.fn() },
    addVideo: { mutateAsync: vi.fn() },
    removeVideo: { mutateAsync: vi.fn() },
    addPoster: { mutateAsync: vi.fn() },
    removePoster: { mutateAsync: vi.fn() },
    setMainPoster: { mutateAsync: vi.fn() },
    setMainBackdrop: { mutateAsync: vi.fn() },
    addMoviePlatform: { mutateAsync: vi.fn() },
    removeMoviePlatform: { mutateAsync: vi.fn() },
    addMovieProductionHouse: { mutateAsync: vi.fn() },
    removeMovieProductionHouse: { mutateAsync: vi.fn() },
    addTheatricalRun: { mutateAsync: vi.fn() },
    removeTheatricalRun: { mutateAsync: vi.fn() },
    updateTheatricalRun: { mutateAsync: vi.fn() },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('createMovieEditHandlers', () => {
  it('returns all expected handler functions', () => {
    const handlers = createMovieEditHandlers(createMockDeps());

    expect(handlers.handleSubmit).toBeDefined();
    expect(handlers.handleDelete).toBeDefined();
    expect(handlers.setUploadingPoster).toBeDefined();
    expect(handlers.setUploadingBackdrop).toBeDefined();
    // Common handlers from createCommonFormHandlers
    expect(handlers.updateField).toBeDefined();
    expect(handlers.toggleGenre).toBeDefined();
    expect(handlers.handleImageUpload).toBeDefined();
    expect(handlers.handleVideoRemove).toBeDefined();
    expect(handlers.handlePosterRemove).toBeDefined();
    expect(handlers.handlePlatformRemove).toBeDefined();
    expect(handlers.handlePHRemove).toBeDefined();
    expect(handlers.handleCastRemove).toBeDefined();
    expect(handlers.handleRunRemove).toBeDefined();
    expect(handlers.handleRunEnd).toBeDefined();
  });
});

describe('handleSubmit', () => {
  it('validates form, saves movie, resets pending state, and sets success', async () => {
    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(deps.setIsSaving).toHaveBeenCalledWith(true);
    expect(deps.updateMovie.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'movie-1',
        title: 'Test Movie',
        runtime: 120,
        genres: ['Action'],
        tmdb_id: 12345,
      }),
    );
    expect(deps.resetPendingState).toHaveBeenCalled();
    expect(deps.setSaveStatus).toHaveBeenCalledWith('success');
    expect(deps.setIsSaving).toHaveBeenCalledWith(false);
  });

  it('prevents default form event', async () => {
    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);
    const mockEvent = { preventDefault: vi.fn() } as never;

    await handlers.handleSubmit(mockEvent);

    expect((mockEvent as { preventDefault: () => void }).preventDefault).toHaveBeenCalled();
  });

  it('blocks save on validation errors', async () => {
    const { validateMovieForm } = await import('@/lib/movie-validation');
    (validateMovieForm as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { field: 'title', message: 'Title is required.' },
    ]);

    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(window.alert).toHaveBeenCalled();
    expect(deps.updateMovie.mutateAsync).not.toHaveBeenCalled();
  });

  it('uses pending poster URL when available', async () => {
    const deps = createMockDeps({
      pendingMainPosterId: 'pending-1',
      pendingPosterAdds: [
        {
          _id: 'pending-1',
          image_url: 'https://new-poster.jpg',
          title: 'New',
          description: null,
          poster_date: null,
          is_main_poster: true,
          is_main_backdrop: false,
          image_type: 'poster',
          display_order: 0,
        },
      ],
    });
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(deps.updateMovie.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        poster_url: 'https://new-poster.jpg',
      }),
    );
  });

  it('uses existing DB poster when pendingMainPosterId matches DB poster', async () => {
    const deps = createMockDeps({
      pendingMainPosterId: 'db-poster-1',
      pendingPosterAdds: [],
      postersData: [{ id: 'db-poster-1', image_url: 'https://db-poster.jpg' }],
    });
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(deps.updateMovie.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        poster_url: 'https://db-poster.jpg',
      }),
    );
  });

  it('shows alert with failure details on partial failures', async () => {
    const deps = createMockDeps();
    deps.updateMovie.mutateAsync = vi.fn().mockRejectedValue(new Error('DB error'));
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('1 operation(s) failed'));
  });

  it('catches unexpected errors and alerts', async () => {
    const { buildChildMutationPromises } = await import('@/hooks/useMovieEditSubmitHelpers');
    (buildChildMutationPromises as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Unexpected'),
    );

    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(window.alert).toHaveBeenCalledWith('Save failed: Unexpected');
    expect(deps.setIsSaving).toHaveBeenCalledWith(false);
  });

  it('converts empty string fields to null', async () => {
    const deps = createMockDeps({
      form: {
        title: 'Test',
        poster_url: '',
        backdrop_url: '',
        release_date: '',
        runtime: '',
        genres: [],
        certification: '',
        synopsis: '',
        trailer_url: '',
        in_theaters: false,
        premiere_date: '',
        original_language: '',
        is_featured: false,
        tmdb_id: '',
        tagline: '',
        backdrop_focus_x: null,
        backdrop_focus_y: null,
        poster_focus_x: null,
        poster_focus_y: null,
      } as never,
    });
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(deps.updateMovie.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        poster_url: null,
        backdrop_url: null,
        release_date: null,
        runtime: null,
        certification: null,
        synopsis: null,
        trailer_url: null,
        premiere_date: null,
        original_language: null,
        tmdb_id: null,
        tagline: null,
      }),
    );
  });

  it('invalidates theater-related queries on success', async () => {
    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleSubmit();

    expect(deps.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin', 'theater-movies'],
    });
    expect(deps.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin', 'upcoming-movies'],
    });
  });
});

describe('handleDelete', () => {
  it('deletes movie and redirects to /movies on confirm', async () => {
    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleDelete();

    expect(window.confirm).toHaveBeenCalledWith('Are you sure? This cannot be undone.');
    expect(deps.deleteMovie.mutateAsync).toHaveBeenCalledWith('movie-1');
    expect(deps.router.push).toHaveBeenCalledWith('/movies');
  });

  it('does not delete when user cancels confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleDelete();

    expect(deps.deleteMovie.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows alert on delete failure', async () => {
    const deps = createMockDeps();
    deps.deleteMovie.mutateAsync = vi.fn().mockRejectedValue(new Error('Delete failed'));
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleDelete();

    expect(window.alert).toHaveBeenCalledWith('Delete failed: Delete failed');
  });

  it('invalidates all related caches on delete', async () => {
    const deps = createMockDeps();
    const handlers = createMovieEditHandlers(deps);

    await handlers.handleDelete();

    expect(deps.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin', 'theater-movies'],
    });
    expect(deps.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin', 'dashboard'],
    });
    expect(deps.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin', 'ott'],
    });
  });
});
