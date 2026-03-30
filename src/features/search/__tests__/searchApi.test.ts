const mockOrder = jest.fn(() => ({
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
}));
const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => ({
          order: mockOrder,
          limit: mockLimit,
        })),
      })),
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import {
  searchAll,
  searchMoviesPaginated,
  searchActorsPaginated,
  searchProductionHousesPaginated,
} from '../searchApi';

describe('searchAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries all three tables', async () => {
    await searchAll('pushpa');
    const fromCalls = (supabase.from as jest.Mock).mock.calls;
    expect(fromCalls.some((c: string[]) => c[0] === 'movies')).toBe(true);
    expect(fromCalls.some((c: string[]) => c[0] === 'actors')).toBe(true);
    expect(fromCalls.some((c: string[]) => c[0] === 'production_houses')).toBe(true);
  });

  it('returns grouped results', async () => {
    const result = await searchAll('test');
    expect(result).toHaveProperty('movies');
    expect(result).toHaveProperty('actors');
    expect(result).toHaveProperty('productionHouses');
  });

  it('returns empty arrays when no data', async () => {
    const result = await searchAll('xyz');
    expect(result.movies).toEqual([]);
    expect(result.actors).toEqual([]);
    expect(result.productionHouses).toEqual([]);
  });

  it('returns empty arrays when supabase returns error field set (fulfilled but with error)', async () => {
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockImplementation((table: string) => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => {
          if (table === 'movies') {
            return {
              order: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({ data: null, error: new Error('query error') }),
              })),
            };
          }
          return {
            limit: jest.fn().mockResolvedValue({ data: null, error: new Error('query error') }),
          };
        }),
      })),
    }));

    const result = await searchAll('broken');
    expect(result.movies).toEqual([]);
    expect(result.actors).toEqual([]);
    expect(result.productionHouses).toEqual([]);
  });

  it('returns empty arrays when supabase returns null data and no error', async () => {
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockImplementation((table: string) => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => {
          if (table === 'movies') {
            return {
              order: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            };
          }
          return {
            limit: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      })),
    }));

    const result = await searchAll('empty');
    expect(result.movies).toEqual([]);
    expect(result.actors).toEqual([]);
    expect(result.productionHouses).toEqual([]);
  });

  it('returns data when query returns results', async () => {
    const movieData = [{ id: '1', title: 'Pushpa' }];
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: movieData, error: null }),
          })),
          limit: jest.fn().mockResolvedValue({ data: movieData, error: null }),
        })),
      })),
    }));

    const result = await searchAll('pushpa');
    expect(result.movies).toEqual(movieData);
  });

  it('returns partial results when one query fails', async () => {
    const movieData = [{ id: '1', title: 'Test Movie' }];
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'actors') {
        // actors query rejects
        return {
          select: jest.fn(() => ({
            ilike: jest.fn(() => ({
              limit: jest.fn().mockRejectedValue(new Error('actors timeout')),
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => ({
          ilike: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: movieData, error: null }),
            })),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      };
    });

    const result = await searchAll('test');
    // Movies and productionHouses succeed; actors returns empty due to failure
    expect(result.movies).toEqual(movieData);
    expect(result.actors).toEqual([]);
    expect(result.productionHouses).toEqual([]);
  });
});

// Helper to build a mock supabase chain for paginated queries
// Paginated chain: select → ilike → order → range (movies) or select → ilike → range (actors/houses)
function makePaginatedMock(data: object[], error: { message: string } | null = null) {
  const mockRange = jest.fn().mockResolvedValue({ data, error });
  return {
    select: jest.fn(() => ({
      ilike: jest.fn(() => ({
        order: jest.fn(() => ({ range: mockRange })),
        range: mockRange,
      })),
    })),
    _mockRange: mockRange,
  };
}

describe('searchMoviesPaginated', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries movies with ilike, order, and range', async () => {
    const movies = [{ id: '1', title: 'Pushpa' }];
    const mock = makePaginatedMock(movies);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    const result = await searchMoviesPaginated('pushpa', 0, 10);
    expect(supabase.from).toHaveBeenCalledWith('movies');
    expect(result).toEqual(movies);
  });

  it('returns empty array when data is null', async () => {
    const mock = makePaginatedMock([], null);
    // unwrapList returns [] for empty data
    (supabase.from as jest.Mock).mockReturnValue(mock);

    const result = await searchMoviesPaginated('xyz', 0, 10);
    expect(result).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    const mock = makePaginatedMock([], { message: 'movies error' });
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await expect(searchMoviesPaginated('xyz', 0, 10)).rejects.toMatchObject({
      message: 'movies error',
    });
  });

  it('computes correct range for offset=5, limit=10 (to=14)', async () => {
    const mock = makePaginatedMock([]);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await searchMoviesPaginated('test', 5, 10);
    expect(mock._mockRange).toHaveBeenCalledWith(5, 14);
  });

  it('uses default limit of 10', async () => {
    const mock = makePaginatedMock([]);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await searchMoviesPaginated('test', 0);
    expect(mock._mockRange).toHaveBeenCalledWith(0, 9);
  });
});

describe('searchActorsPaginated', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries actors with ilike and range', async () => {
    const actors = [{ id: 'a1', name: 'Ram Charan' }];
    const mock = makePaginatedMock(actors);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    const result = await searchActorsPaginated('ram', 0, 10);
    expect(supabase.from).toHaveBeenCalledWith('actors');
    expect(result).toEqual(actors);
  });

  it('throws when supabase returns an error', async () => {
    const mock = makePaginatedMock([], { message: 'actors error' });
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await expect(searchActorsPaginated('ram', 0, 10)).rejects.toMatchObject({
      message: 'actors error',
    });
  });

  it('computes correct range for offset=0, limit=5 (to=4)', async () => {
    const mock = makePaginatedMock([]);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await searchActorsPaginated('test', 0, 5);
    expect(mock._mockRange).toHaveBeenCalledWith(0, 4);
  });

  it('uses default limit of 10', async () => {
    const mock = makePaginatedMock([]);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await searchActorsPaginated('test', 0);
    expect(mock._mockRange).toHaveBeenCalledWith(0, 9);
  });
});

describe('searchProductionHousesPaginated', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries production_houses with ilike and range', async () => {
    const houses = [{ id: 'h1', name: 'Mythri' }];
    const mock = makePaginatedMock(houses);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    const result = await searchProductionHousesPaginated('mythri', 0, 10);
    expect(supabase.from).toHaveBeenCalledWith('production_houses');
    expect(result).toEqual(houses);
  });

  it('throws when supabase returns an error', async () => {
    const mock = makePaginatedMock([], { message: 'houses error' });
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await expect(searchProductionHousesPaginated('mythri', 0, 10)).rejects.toMatchObject({
      message: 'houses error',
    });
  });

  it('computes correct range (offset=10, limit=5 → to=14)', async () => {
    const mock = makePaginatedMock([]);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await searchProductionHousesPaginated('test', 10, 5);
    expect(mock._mockRange).toHaveBeenCalledWith(10, 14);
  });

  it('uses default limit of 10', async () => {
    const mock = makePaginatedMock([]);
    (supabase.from as jest.Mock).mockReturnValue(mock);

    await searchProductionHousesPaginated('test', 0);
    expect(mock._mockRange).toHaveBeenCalledWith(0, 9);
  });
});
