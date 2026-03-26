import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock all child hooks
vi.mock('@/hooks/useAdminMovies', () => ({
  useAdminMovie: vi.fn(() => ({ data: undefined, isLoading: false })),
  useUpdateMovie: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteMovie: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useAdminCast', () => ({
  useMovieCast: vi.fn(() => ({ data: [] })),
  useAdminActors: vi.fn(() => ({ data: undefined })),
  useAddCast: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRemoveCast: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateCastOrder: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useAdminTheatricalRuns', () => ({
  useMovieTheatricalRuns: vi.fn(() => ({ data: [] })),
  useAddTheatricalRun: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateTheatricalRun: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRemoveTheatricalRun: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useAdminVideos', () => ({
  useMovieVideos: vi.fn(() => ({ data: [] })),
  useAddVideo: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRemoveVideo: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useAdminPosters', () => ({
  useMoviePosters: vi.fn(() => ({ data: [] })),
  useAddPoster: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRemovePoster: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSetMainPoster: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSetMainBackdrop: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useMovieProductionHouses', () => ({
  useMovieProductionHouses: vi.fn(() => ({ data: [] })),
  useAddMovieProductionHouse: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRemoveMovieProductionHouse: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: vi.fn(() => ({ data: undefined })),
  useCreateProductionHouse: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useAdminOtt', () => ({
  useMoviePlatforms: vi.fn(() => ({ data: [] })),
  useAddMoviePlatform: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRemoveMoviePlatform: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useMovieAvailability: vi.fn(() => ({ data: [] })),
  useAddMovieAvailability: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRemoveMovieAvailability: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { useMovieEditData } from '@/hooks/useMovieEditData';
import { useAdminMovie } from '@/hooks/useAdminMovies';
import { useAdminActors } from '@/hooks/useAdminCast';
import { useAdminProductionHouses } from '@/hooks/useAdminProductionHouses';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useMovieEditData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns movie and isLoading from useAdminMovie', () => {
    const mockMovie = { id: 'movie-1', title: 'Test Movie' };
    vi.mocked(useAdminMovie).mockReturnValue({
      data: mockMovie as never,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminMovie>);

    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.movie).toEqual(mockMovie);
    expect(result.current.isLoading).toBe(false);
  });

  it('passes isLoading=true when movie is loading', () => {
    vi.mocked(useAdminMovie).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAdminMovie>);

    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.movie).toBeUndefined();
  });

  it('returns actors as flattened pages from useAdminActors', () => {
    vi.mocked(useAdminActors).mockReturnValue({
      data: {
        pages: [[{ id: 'a-1', name: 'Actor One' }], [{ id: 'a-2', name: 'Actor Two' }]],
      } as never,
    } as unknown as ReturnType<typeof useAdminActors>);

    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.actors).toHaveLength(2);
    expect(result.current.actors[0].name).toBe('Actor One');
  });

  it('returns empty actors array when useAdminActors has no data', () => {
    vi.mocked(useAdminActors).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useAdminActors>);

    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.actors).toEqual([]);
  });

  it('returns phSearchResults as flattened pages from useAdminProductionHouses', () => {
    vi.mocked(useAdminProductionHouses).mockReturnValue({
      data: {
        pages: [[{ id: 'ph-1', name: 'Studio A' }]],
      } as never,
    } as unknown as ReturnType<typeof useAdminProductionHouses>);

    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.phSearchResults).toHaveLength(1);
  });

  it('returns empty phSearchResults when no data', () => {
    vi.mocked(useAdminProductionHouses).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useAdminProductionHouses>);

    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.phSearchResults).toEqual([]);
  });

  it('initializes castSearchQuery and setCastSearchQuery', () => {
    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.castSearchQuery).toBe('');
    expect(typeof result.current.setCastSearchQuery).toBe('function');
  });

  it('initializes phSearchQuery and setPHSearchQuery', () => {
    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.phSearchQuery).toBe('');
    expect(typeof result.current.setPHSearchQuery).toBe('function');
  });

  it('exposes all mutation hooks', () => {
    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.updateMovie).toBeTruthy();
    expect(result.current.deleteMovie).toBeTruthy();
    expect(result.current.addCast).toBeTruthy();
    expect(result.current.removeCast).toBeTruthy();
    expect(result.current.addVideo).toBeTruthy();
    expect(result.current.removeVideo).toBeTruthy();
    expect(result.current.addPoster).toBeTruthy();
    expect(result.current.removePoster).toBeTruthy();
    expect(result.current.setMainPoster).toBeTruthy();
    expect(result.current.setMainBackdrop).toBeTruthy();
    expect(result.current.addMovieProductionHouse).toBeTruthy();
    expect(result.current.removeMovieProductionHouse).toBeTruthy();
    expect(result.current.createProductionHouse).toBeTruthy();
    expect(result.current.addMoviePlatform).toBeTruthy();
    expect(result.current.removeMoviePlatform).toBeTruthy();
  });

  it('exposes data arrays with defaults', () => {
    const { result } = renderHook(() => useMovieEditData('movie-1'), {
      wrapper: makeWrapper(),
    });

    expect(Array.isArray(result.current.castData)).toBe(true);
    expect(Array.isArray(result.current.theatricalRuns)).toBe(true);
    expect(Array.isArray(result.current.videosData)).toBe(true);
    expect(Array.isArray(result.current.postersData)).toBe(true);
    expect(Array.isArray(result.current.movieProductionHouses)).toBe(true);
    expect(Array.isArray(result.current.moviePlatforms)).toBe(true);
    expect(Array.isArray(result.current.allPlatforms)).toBe(true);
  });
});
