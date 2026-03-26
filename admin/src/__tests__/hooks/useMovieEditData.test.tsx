import { renderHook } from '@testing-library/react';
import { useMovieEditData } from '@/hooks/useMovieEditData';

// Mock all dependent hooks
vi.mock('@/hooks/useAdminMovies', () => ({
  useAdminMovie: () => ({ data: { id: '1', title: 'Test' }, isLoading: false }),
  useUpdateMovie: () => ({ mutateAsync: vi.fn() }),
  useDeleteMovie: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminCast', () => ({
  useMovieCast: () => ({ data: [{ id: 'c1', actor_id: 'a1' }] }),
  useAdminActors: () => ({ data: { pages: [[{ id: 'a1', name: 'Actor' }]] } }),
  useAddCast: () => ({ mutateAsync: vi.fn() }),
  useRemoveCast: () => ({ mutateAsync: vi.fn() }),
  useUpdateCastOrder: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminTheatricalRuns', () => ({
  useMovieTheatricalRuns: () => ({ data: [] }),
  useAddTheatricalRun: () => ({ mutateAsync: vi.fn() }),
  useUpdateTheatricalRun: () => ({ mutateAsync: vi.fn() }),
  useRemoveTheatricalRun: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminVideos', () => ({
  useMovieVideos: () => ({ data: [] }),
  useAddVideo: () => ({ mutateAsync: vi.fn() }),
  useRemoveVideo: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminPosters', () => ({
  useMoviePosters: () => ({ data: [] }),
  useAddPoster: () => ({ mutateAsync: vi.fn() }),
  useRemovePoster: () => ({ mutateAsync: vi.fn() }),
  useSetMainPoster: () => ({ mutateAsync: vi.fn() }),
  useSetMainBackdrop: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useMovieProductionHouses', () => ({
  useMovieProductionHouses: () => ({ data: [] }),
  useAddMovieProductionHouse: () => ({ mutateAsync: vi.fn() }),
  useRemoveMovieProductionHouse: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: () => ({ data: { pages: [] } }),
  useCreateProductionHouse: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminOtt', () => ({
  useMoviePlatforms: () => ({ data: [] }),
  useAddMoviePlatform: () => ({ mutateAsync: vi.fn() }),
  useRemoveMoviePlatform: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({ data: [] }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useMovieAvailability: () => ({ data: [] }),
  useAddMovieAvailability: () => ({ mutateAsync: vi.fn() }),
  useRemoveMovieAvailability: () => ({ mutateAsync: vi.fn() }),
}));

describe('useMovieEditData', () => {
  it('returns movie data and loading state', () => {
    const { result } = renderHook(() => useMovieEditData('1'));
    expect(result.current.movie).toEqual({ id: '1', title: 'Test' });
    expect(result.current.isLoading).toBe(false);
  });

  it('returns cast data', () => {
    const { result } = renderHook(() => useMovieEditData('1'));
    expect(result.current.castData).toEqual([{ id: 'c1', actor_id: 'a1' }]);
  });

  it('returns actors from search', () => {
    const { result } = renderHook(() => useMovieEditData('1'));
    expect(result.current.actors).toEqual([{ id: 'a1', name: 'Actor' }]);
  });

  it('returns empty arrays for collections with no data', () => {
    const { result } = renderHook(() => useMovieEditData('1'));
    expect(result.current.videosData).toEqual([]);
    expect(result.current.postersData).toEqual([]);
    expect(result.current.theatricalRuns).toEqual([]);
    expect(result.current.movieProductionHouses).toEqual([]);
    expect(result.current.moviePlatforms).toEqual([]);
    expect(result.current.allPlatforms).toEqual([]);
  });

  it('provides mutation functions', () => {
    const { result } = renderHook(() => useMovieEditData('1'));
    expect(result.current.updateMovie).toBeDefined();
    expect(result.current.deleteMovie).toBeDefined();
    expect(result.current.addCast).toBeDefined();
    expect(result.current.removeCast).toBeDefined();
  });

  it('provides search state setters', () => {
    const { result } = renderHook(() => useMovieEditData('1'));
    expect(typeof result.current.setCastSearchQuery).toBe('function');
    expect(typeof result.current.setPHSearchQuery).toBe('function');
  });
});
