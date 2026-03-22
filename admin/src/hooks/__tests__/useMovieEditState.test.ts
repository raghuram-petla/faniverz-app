import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// @boundary: mock all sub-hooks so unit test is isolated
const mockUseMovieEditData = vi.fn();
const mockUseMovieEditDerived = vi.fn();
const mockCreateMovieEditHandlers = vi.fn();
const mockUseUnsavedChangesWarning = vi.fn();
const mockUseRouter = vi.fn();
const mockUseQueryClient = vi.fn();

vi.mock('@/hooks/useMovieEditData', () => ({
  useMovieEditData: (...args: unknown[]) => mockUseMovieEditData(...args),
}));

vi.mock('@/hooks/useMovieEditDerived', () => ({
  useMovieEditDerived: (...args: unknown[]) => mockUseMovieEditDerived(...args),
}));

vi.mock('@/hooks/useMovieEditHandlers', () => ({
  createMovieEditHandlers: (...args: unknown[]) => mockCreateMovieEditHandlers(...args),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: (...args: unknown[]) => mockUseUnsavedChangesWarning(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => mockUseQueryClient(),
  };
});

const makeDataResult = (overrides = {}) => ({
  movie: null,
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
  ...overrides,
});

const makeDerivedResult = (overrides = {}) => ({
  visibleCast: [],
  visibleVideos: [],
  visiblePosters: [],
  visiblePlatforms: [],
  visibleProductionHouses: [],
  visibleRuns: [],
  isDirty: false,
  savedMainPosterId: null,
  ...overrides,
});

const makeHandlers = () => ({
  updateField: vi.fn(),
  toggleGenre: vi.fn(),
  handleSubmit: vi.fn(),
  handleDelete: vi.fn(),
  handleImageUpload: vi.fn(),
  handleVideoRemove: vi.fn(),
  handlePosterRemove: vi.fn(),
  handlePlatformRemove: vi.fn(),
  handlePHRemove: vi.fn(),
  handleCastRemove: vi.fn(),
  handleRunRemove: vi.fn(),
  handleRunEnd: vi.fn(),
});

import { useMovieEditState } from '@/hooks/useMovieEditState';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe('useMovieEditState', () => {
  const mockRouter = { push: vi.fn(), replace: vi.fn() };
  const mockQC = { invalidateQueries: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseQueryClient.mockReturnValue(mockQC);
    mockUseMovieEditData.mockReturnValue(makeDataResult());
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult());
    mockCreateMovieEditHandlers.mockReturnValue(makeHandlers());
    mockUseUnsavedChangesWarning.mockReturnValue(undefined);
  });

  it('returns isLoading from data hook', () => {
    mockUseMovieEditData.mockReturnValue(makeDataResult({ isLoading: true }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns movie as null initially', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.movie).toBeNull();
  });

  it('returns form with empty defaults initially', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.form.title).toBe('');
    expect(result.current.form.genres).toEqual([]);
    expect(result.current.form.in_theaters).toBe(false);
  });

  it('hydrates form when movie data loads', () => {
    const movie = {
      id: 'movie-1',
      title: 'Test Movie',
      poster_url: 'https://cdn/poster.jpg',
      backdrop_url: null,
      release_date: '2024-01-01',
      runtime: 120,
      genres: ['Action'],
      certification: 'U',
      synopsis: 'A great movie',
      trailer_url: null,
      in_theaters: true,
      premiere_date: null,
      original_language: 'te',
      is_featured: false,
      tmdb_id: 12345,
      tagline: 'Epic',
      backdrop_focus_x: null,
      backdrop_focus_y: null,
      poster_focus_x: 0.5,
      poster_focus_y: 0.5,
      spotlight_focus_x: null,
      spotlight_focus_y: null,
      detail_focus_x: null,
      detail_focus_y: null,
    };
    mockUseMovieEditData.mockReturnValue(makeDataResult({ movie }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.form.title).toBe('Test Movie');
    expect(result.current.form.runtime).toBe('120');
    expect(result.current.form.in_theaters).toBe(true);
    expect(result.current.form.genres).toEqual(['Action']);
    expect(result.current.form.tmdb_id).toBe('12345');
  });

  it('returns isDirty from derived hook', () => {
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ isDirty: true }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.isDirty).toBe(true);
  });

  it('calls useUnsavedChangesWarning with isDirty', () => {
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ isDirty: true }));
    const { Wrapper } = makeWrapper();
    renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(mockUseUnsavedChangesWarning).toHaveBeenCalledWith(true);
  });

  it('returns handlers from createMovieEditHandlers', () => {
    const handlers = makeHandlers();
    mockCreateMovieEditHandlers.mockReturnValue(handlers);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.updateField).toBe(handlers.updateField);
    expect(result.current.toggleGenre).toBe(handlers.toggleGenre);
    expect(result.current.handleSubmit).toBe(handlers.handleSubmit);
    expect(result.current.handleDelete).toBe(handlers.handleDelete);
  });

  it('returns visiblePosters from derived result', () => {
    const posters = [{ id: 'p1', image_url: 'url', is_main_poster: true }];
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ visiblePosters: posters }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.visiblePosters).toEqual(posters);
  });

  it('returns savedMainPosterId from derived', () => {
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ savedMainPosterId: 'poster-123' }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.savedMainPosterId).toBe('poster-123');
  });

  it('passes actors from data hook', () => {
    const actors = [{ id: 'actor-1', name: 'Jane Doe' }];
    mockUseMovieEditData.mockReturnValue(makeDataResult({ actors }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.actors).toEqual(actors);
  });

  it('passes allPlatforms from data hook', () => {
    const platforms = [{ id: 'netflix', name: 'Netflix' }];
    mockUseMovieEditData.mockReturnValue(makeDataResult({ allPlatforms: platforms }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.allPlatforms).toEqual(platforms);
  });

  it('isSaving starts as false', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.isSaving).toBe(false);
  });

  it('saveStatus starts as idle', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.saveStatus).toBe('idle');
  });

  it('handleSelectMainPoster updates form.poster_url and calls setPendingMainPosterId', () => {
    const posters = [{ id: 'p1', image_url: 'https://cdn/p1.jpg', is_main_poster: false }];
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ visiblePosters: posters }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    act(() => {
      result.current.handleSelectMainPoster('p1');
    });
    expect(result.current.form.poster_url).toBe('https://cdn/p1.jpg');
  });

  it('handleSelectMainPoster does nothing when imageId not found in visiblePosters', () => {
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ visiblePosters: [] }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    const initialUrl = result.current.form.poster_url;
    act(() => {
      result.current.handleSelectMainPoster('nonexistent');
    });
    expect(result.current.form.poster_url).toBe(initialUrl);
  });

  it('handleSelectMainBackdrop updates form.backdrop_url', () => {
    const posters = [{ id: 'b1', image_url: 'https://cdn/b1.jpg', is_main_poster: false }];
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ visiblePosters: posters }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    act(() => {
      result.current.handleSelectMainBackdrop('b1');
    });
    expect(result.current.form.backdrop_url).toBe('https://cdn/b1.jpg');
  });

  it('handleSelectMainBackdrop does nothing when imageId not found', () => {
    mockUseMovieEditDerived.mockReturnValue(makeDerivedResult({ visiblePosters: [] }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    const initialUrl = result.current.form.backdrop_url;
    act(() => {
      result.current.handleSelectMainBackdrop('ghost');
    });
    expect(result.current.form.backdrop_url).toBe(initialUrl);
  });

  it('pendingCastIds is a Set of pending cast add _ids', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.pendingCastIds).toBeInstanceOf(Set);
    expect(result.current.pendingCastIds.size).toBe(0);
  });

  it('pendingVideoIds is a Set of pending video add _ids', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.pendingVideoIds).toBeInstanceOf(Set);
  });

  it('pendingRunIds is a Set of pending run add _ids', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.pendingRunIds).toBeInstanceOf(Set);
  });

  it('changesParams includes form, setForm, and castData', () => {
    mockUseMovieEditData.mockReturnValue(makeDataResult({ castData: [{ id: 'c1' }] }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.changesParams.castData).toEqual([{ id: 'c1' }]);
    expect(result.current.changesParams.form).toBeDefined();
    expect(result.current.changesParams.setForm).toBeDefined();
  });

  it('movie data with null optionals defaults to empty strings in form', () => {
    const movie = {
      id: 'movie-1',
      title: 'Movie',
      poster_url: null,
      backdrop_url: null,
      release_date: null,
      runtime: null,
      genres: null,
      certification: null,
      synopsis: null,
      trailer_url: null,
      in_theaters: false,
      premiere_date: null,
      original_language: null,
      is_featured: false,
      tmdb_id: null,
      tagline: null,
      backdrop_focus_x: null,
      backdrop_focus_y: null,
      poster_focus_x: null,
      poster_focus_y: null,
      spotlight_focus_x: null,
      spotlight_focus_y: null,
      detail_focus_x: null,
      detail_focus_y: null,
    };
    mockUseMovieEditData.mockReturnValue(makeDataResult({ movie }));
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovieEditState('movie-1'), { wrapper: Wrapper });
    expect(result.current.form.poster_url).toBe('');
    expect(result.current.form.runtime).toBe('');
    expect(result.current.form.genres).toEqual([]);
    expect(result.current.form.certification).toBe('');
  });
});
