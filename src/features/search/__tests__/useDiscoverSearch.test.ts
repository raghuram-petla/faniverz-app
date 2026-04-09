jest.mock('../searchHooks', () => ({
  useSearchMoviesPaginated: jest.fn(),
  useUniversalSearch: jest.fn(),
}));

jest.mock('@/features/productionHouses/hooks', () => ({
  useMoviesByProductionHouseIds: jest.fn(),
}));

import { renderHook } from '@testing-library/react-native';
import { useDiscoverSearch } from '../useDiscoverSearch';
import { useSearchMoviesPaginated, useUniversalSearch } from '../searchHooks';
import { useMoviesByProductionHouseIds } from '@/features/productionHouses/hooks';

const mockSearchPaginated = useSearchMoviesPaginated as jest.Mock;
const mockUniversal = useUniversalSearch as jest.Mock;
const mockPHMovies = useMoviesByProductionHouseIds as jest.Mock;

beforeEach(() => {
  mockSearchPaginated.mockReturnValue({ allItems: [] });
  mockUniversal.mockReturnValue({ data: undefined });
  mockPHMovies.mockReturnValue({ data: [] });
});

describe('useDiscoverSearch', () => {
  it('returns isSearching false when query < 2 chars', () => {
    const { result } = renderHook(() => useDiscoverSearch('a'));
    expect(result.current.isSearching).toBe(false);
  });

  it('returns isSearching true when query >= 2 chars', () => {
    const { result } = renderHook(() => useDiscoverSearch('ab'));
    expect(result.current.isSearching).toBe(true);
  });

  it('merges production house movies with search results', () => {
    mockSearchPaginated.mockReturnValue({
      allItems: [{ id: 'm1', title: 'Movie 1' }],
    });
    mockUniversal.mockReturnValue({
      data: {
        productionHouses: [{ id: 'ph1' }],
        actors: [],
        platforms: [],
        movies: [],
        topMovieScore: 0.5,
        topEntityScore: 0.8,
      },
    });
    mockPHMovies.mockReturnValue({
      data: [
        { id: 'm2', title: 'PH Movie' },
        { id: 'm1', title: 'Movie 1' }, // duplicate
      ],
    });

    const { result } = renderHook(() => useDiscoverSearch('pink'));
    expect(result.current.searchMovies).toHaveLength(2);
    expect(result.current.searchMovies.map((m: { id: string }) => m.id)).toEqual(['m1', 'm2']);
  });

  it('sets entitiesFirst when entity score > movie score', () => {
    mockUniversal.mockReturnValue({
      data: {
        topMovieScore: 0.3,
        topEntityScore: 0.9,
        productionHouses: [],
        actors: [],
        platforms: [],
        movies: [],
      },
    });
    const { result } = renderHook(() => useDiscoverSearch('test'));
    expect(result.current.entitiesFirst).toBe(true);
  });

  it('sets entitiesFirst false when movie score >= entity score', () => {
    mockUniversal.mockReturnValue({
      data: {
        topMovieScore: 0.9,
        topEntityScore: 0.3,
        productionHouses: [],
        actors: [],
        platforms: [],
        movies: [],
      },
    });
    const { result } = renderHook(() => useDiscoverSearch('test'));
    expect(result.current.entitiesFirst).toBe(false);
  });
});
