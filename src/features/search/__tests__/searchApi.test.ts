const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  searchAll,
  searchMoviesPaginated,
  searchActorsPaginated,
  searchProductionHousesPaginated,
} from '../searchApi';

describe('searchAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls search_universal RPC with search_term and result_limit', async () => {
    mockRpc.mockResolvedValue({
      data: { movies: [], actors: [], production_houses: [] },
      error: null,
    });
    await searchAll('pushpa');
    expect(mockRpc).toHaveBeenCalledWith('search_universal', {
      search_term: 'pushpa',
      result_limit: 10,
    });
  });

  it('returns grouped results with correct keys', async () => {
    mockRpc.mockResolvedValue({
      data: { movies: [], actors: [], production_houses: [] },
      error: null,
    });
    const result = await searchAll('test');
    expect(result).toHaveProperty('movies');
    expect(result).toHaveProperty('actors');
    expect(result).toHaveProperty('productionHouses');
  });

  it('returns empty arrays when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await searchAll('xyz');
    expect(result.movies).toEqual([]);
    expect(result.actors).toEqual([]);
    expect(result.productionHouses).toEqual([]);
  });

  it('maps production_houses key to productionHouses', async () => {
    const house = { id: 'h1', name: 'Mythri' };
    mockRpc.mockResolvedValue({
      data: { movies: [], actors: [], production_houses: [house] },
      error: null,
    });
    const result = await searchAll('mythri');
    expect(result.productionHouses).toEqual([house]);
  });

  it('returns data when RPC returns results', async () => {
    const movie = { id: '1', title: 'Pushpa' };
    const actor = { id: 'a1', name: 'Allu Arjun' };
    mockRpc.mockResolvedValue({
      data: { movies: [movie], actors: [actor], production_houses: [] },
      error: null,
    });
    const result = await searchAll('pushpa');
    expect(result.movies).toEqual([movie]);
    expect(result.actors).toEqual([actor]);
    expect(result.productionHouses).toEqual([]);
  });

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') });
    await expect(searchAll('broken')).rejects.toThrow('RPC error');
  });
});

describe('searchMoviesPaginated', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls search_movies RPC with correct params', async () => {
    const movies = [{ id: '1', title: 'Pushpa' }];
    mockRpc.mockResolvedValue({ data: movies, error: null });
    const result = await searchMoviesPaginated('pushpa', 0, 10);
    expect(mockRpc).toHaveBeenCalledWith('search_movies', {
      search_term: 'pushpa',
      result_limit: 10,
      result_offset: 0,
    });
    expect(result).toEqual(movies);
  });

  it('passes correct offset and limit', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchMoviesPaginated('test', 20, 5);
    expect(mockRpc).toHaveBeenCalledWith('search_movies', {
      search_term: 'test',
      result_limit: 5,
      result_offset: 20,
    });
  });

  it('uses default limit of 10', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchMoviesPaginated('test', 0);
    expect(mockRpc).toHaveBeenCalledWith('search_movies', {
      search_term: 'test',
      result_limit: 10,
      result_offset: 0,
    });
  });

  it('returns empty array when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await searchMoviesPaginated('xyz', 0, 10);
    expect(result).toEqual([]);
  });

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('movies error') });
    await expect(searchMoviesPaginated('xyz', 0, 10)).rejects.toThrow('movies error');
  });
});

describe('searchActorsPaginated', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls search_actors RPC with correct params', async () => {
    const actors = [{ id: 'a1', name: 'Ram Charan' }];
    mockRpc.mockResolvedValue({ data: actors, error: null });
    const result = await searchActorsPaginated('ram', 0, 10);
    expect(mockRpc).toHaveBeenCalledWith('search_actors', {
      search_term: 'ram',
      result_limit: 10,
      result_offset: 0,
    });
    expect(result).toEqual(actors);
  });

  it('uses default limit of 10', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchActorsPaginated('test', 0);
    expect(mockRpc).toHaveBeenCalledWith('search_actors', {
      search_term: 'test',
      result_limit: 10,
      result_offset: 0,
    });
  });

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('actors error') });
    await expect(searchActorsPaginated('ram', 0, 10)).rejects.toThrow('actors error');
  });
});

describe('searchProductionHousesPaginated', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls search_production_houses RPC with correct params', async () => {
    const houses = [{ id: 'h1', name: 'Mythri' }];
    mockRpc.mockResolvedValue({ data: houses, error: null });
    const result = await searchProductionHousesPaginated('mythri', 0, 10);
    expect(mockRpc).toHaveBeenCalledWith('search_production_houses', {
      search_term: 'mythri',
      result_limit: 10,
      result_offset: 0,
    });
    expect(result).toEqual(houses);
  });

  it('passes correct offset and limit', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchProductionHousesPaginated('test', 10, 5);
    expect(mockRpc).toHaveBeenCalledWith('search_production_houses', {
      search_term: 'test',
      result_limit: 5,
      result_offset: 10,
    });
  });

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('houses error') });
    await expect(searchProductionHousesPaginated('mythri', 0, 10)).rejects.toThrow('houses error');
  });
});
