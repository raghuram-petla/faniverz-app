import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock all dependencies before importing the hook

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

const mockMovie = {
  id: '1',
  title: 'Test Movie',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: null,
  release_date: '2026-01-01',
  runtime: 120,
  genres: ['Action'],
  certification: 'UA',
  synopsis: 'A synopsis',
  trailer_url: null,
  in_theaters: false,
  premiere_date: null,
  original_language: 'te',
  is_featured: false,
  tmdb_id: 12345,
  tagline: 'A tagline',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
};

vi.mock('@/hooks/useMovieEditData', () => ({
  useMovieEditData: () => ({
    movie: mockMovie,
    isLoading: false,
    updateMovie: { mutateAsync: vi.fn() },
    deleteMovie: { mutateAsync: vi.fn() },
    castData: [],
    castSearchQuery: '',
    setCastSearchQuery: vi.fn(),
    actors: [],
    addCast: { mutateAsync: vi.fn() },
    removeCast: { mutateAsync: vi.fn() },
    updateCastOrder: { mutateAsync: vi.fn() },
    theatricalRuns: [],
    addTheatricalRun: { mutateAsync: vi.fn() },
    updateTheatricalRun: { mutateAsync: vi.fn() },
    removeTheatricalRun: { mutateAsync: vi.fn() },
    videosData: [],
    addVideo: { mutateAsync: vi.fn() },
    removeVideo: { mutateAsync: vi.fn() },
    postersData: [],
    addPoster: { mutateAsync: vi.fn() },
    removePoster: { mutateAsync: vi.fn() },
    setMainPoster: { mutateAsync: vi.fn() },
    setMainBackdrop: { mutateAsync: vi.fn() },
    movieProductionHouses: [],
    addMovieProductionHouse: { mutateAsync: vi.fn() },
    removeMovieProductionHouse: { mutateAsync: vi.fn() },
    phSearchQuery: '',
    setPHSearchQuery: vi.fn(),
    phSearchResults: [],
    createProductionHouse: { mutateAsync: vi.fn() },
    moviePlatforms: [],
    allPlatforms: [],
    addMoviePlatform: { mutateAsync: vi.fn() },
    removeMoviePlatform: { mutateAsync: vi.fn() },
  }),
}));

vi.mock('@/hooks/useMovieEditPendingState', () => ({
  useMovieEditPendingState: () => ({
    pendingCastAdds: [],
    setPendingCastAdds: vi.fn(),
    pendingCastRemoveIds: new Set(),
    setPendingCastRemoveIds: vi.fn(),
    localCastOrder: null,
    setLocalCastOrder: vi.fn(),
    pendingVideoAdds: [],
    setPendingVideoAdds: vi.fn(),
    pendingVideoRemoveIds: new Set(),
    setPendingVideoRemoveIds: vi.fn(),
    pendingPosterAdds: [],
    setPendingPosterAdds: vi.fn(),
    pendingPosterRemoveIds: new Set(),
    setPendingPosterRemoveIds: vi.fn(),
    pendingMainPosterId: null,
    setPendingMainPosterId: vi.fn(),
    pendingPlatformAdds: [],
    setPendingPlatformAdds: vi.fn(),
    pendingPlatformRemoveIds: new Set(),
    setPendingPlatformRemoveIds: vi.fn(),
    pendingPHAdds: [],
    setPendingPHAdds: vi.fn(),
    pendingPHRemoveIds: new Set(),
    setPendingPHRemoveIds: vi.fn(),
    pendingRunAdds: [],
    setPendingRunAdds: vi.fn(),
    pendingRunRemoveIds: new Set(),
    setPendingRunRemoveIds: vi.fn(),
    pendingRunEndIds: new Map(),
    setPendingRunEndIds: vi.fn(),
    resetPendingState: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMovieEditHandlers', () => ({
  createMovieEditHandlers: () => ({
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
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    setUploadingPoster: vi.fn(),
    setUploadingBackdrop: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMovieEditDerived', () => ({
  useMovieEditDerived: () => ({
    visibleCast: [],
    visibleVideos: [],
    visiblePosters: [],
    visiblePlatforms: [],
    visibleProductionHouses: [],
    visibleRuns: [],
    isDirty: false,
    savedMainPosterId: null,
  }),
}));

import { useMovieEditState } from '@/hooks/useMovieEditState';

describe('useMovieEditState', () => {
  it('returns movie data and loading state', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.movie).toEqual(mockMovie);
    expect(result.current.isLoading).toBe(false);
  });

  it('hydrates form from movie data', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.form.title).toBe('Test Movie');
    expect(result.current.form.poster_url).toBe('https://example.com/poster.jpg');
    expect(result.current.form.runtime).toBe('120');
    expect(result.current.form.genres).toEqual(['Action']);
    expect(result.current.form.tmdb_id).toBe('12345');
  });

  it('converts null movie fields to empty strings in form', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.form.backdrop_url).toBe('');
    expect(result.current.form.trailer_url).toBe('');
    expect(result.current.form.premiere_date).toBe('');
  });

  it('returns handler functions', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(typeof result.current.handleSubmit).toBe('function');
    expect(typeof result.current.handleDelete).toBe('function');
    expect(typeof result.current.updateField).toBe('function');
    expect(typeof result.current.toggleGenre).toBe('function');
  });

  it('returns pending state setters', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(typeof result.current.setPendingVideoAdds).toBe('function');
    expect(typeof result.current.setPendingPosterAdds).toBe('function');
    expect(typeof result.current.setPendingPlatformAdds).toBe('function');
    expect(typeof result.current.setPendingPHAdds).toBe('function');
    expect(typeof result.current.setPendingCastAdds).toBe('function');
    expect(typeof result.current.setPendingRunAdds).toBe('function');
  });

  it('returns derived visible lists', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.visibleCast).toEqual([]);
    expect(result.current.visibleVideos).toEqual([]);
    expect(result.current.visiblePosters).toEqual([]);
    expect(result.current.visiblePlatforms).toEqual([]);
    expect(result.current.visibleProductionHouses).toEqual([]);
    expect(result.current.visibleRuns).toEqual([]);
  });

  it('returns save state', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.isDirty).toBe(false);
  });

  it('returns changesParams for useMovieEditChanges', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.changesParams).toBeDefined();
    expect(result.current.changesParams.form).toBeDefined();
    expect(result.current.changesParams.initialForm).toBeDefined();
  });

  it('returns memoized pending ID sets', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.pendingCastIds).toBeInstanceOf(Set);
    expect(result.current.pendingVideoIds).toBeInstanceOf(Set);
    expect(result.current.pendingRunIds).toBeInstanceOf(Set);
  });

  it('provides handleSelectMainPoster function', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(typeof result.current.handleSelectMainPoster).toBe('function');
    expect(typeof result.current.handleSelectMainBackdrop).toBe('function');
  });

  it('returns upload state', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.uploadingPoster).toBe(false);
    expect(result.current.uploadingBackdrop).toBe(false);
  });

  it('returns search-related props', () => {
    const { result } = renderHook(() => useMovieEditState('1'));

    expect(result.current.actors).toEqual([]);
    expect(result.current.castSearchQuery).toBe('');
    expect(typeof result.current.setCastSearchQuery).toBe('function');
    expect(result.current.allPlatforms).toEqual([]);
    expect(result.current.phSearchResults).toEqual([]);
    expect(result.current.phSearchQuery).toBe('');
    expect(typeof result.current.setPHSearchQuery).toBe('function');
  });
});
