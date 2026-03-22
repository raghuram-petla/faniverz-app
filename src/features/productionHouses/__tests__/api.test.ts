jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockEq = jest.fn(() => ({ single: mockSingle }));
  const mockIn = jest.fn(() => ({ order: jest.fn().mockResolvedValue({ data: [], error: null }) }));
  const mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return {
    supabase: { from: mockFrom },
    __mockFrom: mockFrom,
    __mockSelect: mockSelect,
    __mockEq: mockEq,
    __mockSingle: mockSingle,
    __mockIn: mockIn,
  };
});

import { fetchProductionHouseById, fetchProductionHouseMovies } from '../api';

const { __mockSingle, __mockEq, __mockIn } = require('@/lib/supabase');

describe('fetchProductionHouseById', () => {
  it('returns production house data', async () => {
    const house = { id: 'ph1', name: 'Test Studio', logo_url: null, description: null };
    __mockSingle.mockResolvedValueOnce({ data: house, error: null });
    const result = await fetchProductionHouseById('ph1');
    expect(result).toEqual(house);
  });

  it('throws on error', async () => {
    __mockSingle.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    await expect(fetchProductionHouseById('ph1')).rejects.toThrow('fail');
  });
});

describe('fetchProductionHouseMovies', () => {
  it('returns empty array when no junction entries', async () => {
    __mockEq.mockReturnValueOnce({ single: __mockSingle });
    // First call for junction table
    const mockJunctionEq = jest.fn().mockResolvedValueOnce({
      data: [],
      error: null,
    });
    const mockJunctionSelect = jest.fn(() => ({ eq: mockJunctionEq }));
    const { __mockFrom } = require('@/lib/supabase');
    __mockFrom.mockReturnValueOnce({ select: mockJunctionSelect });

    const result = await fetchProductionHouseMovies('ph1');
    expect(result).toEqual([]);
  });

  it('returns movies when junction entries exist', async () => {
    const { __mockFrom } = require('@/lib/supabase');
    const movies = [
      { id: 'movie-1', title: 'Test Movie', release_date: '2024-01-01' },
      { id: 'movie-2', title: 'Another Movie', release_date: '2023-06-15' },
    ];

    // First from() call: junction table
    const mockJunctionEq = jest.fn().mockResolvedValueOnce({
      data: [{ movie_id: 'movie-1' }, { movie_id: 'movie-2' }],
      error: null,
    });
    const mockJunctionSelect = jest.fn(() => ({ eq: mockJunctionEq }));

    // Second from() call: movies table
    const mockOrder = jest.fn().mockResolvedValueOnce({ data: movies, error: null });
    const mockMoviesIn = jest.fn(() => ({ order: mockOrder }));
    const mockMoviesSelect = jest.fn(() => ({ in: mockMoviesIn }));

    __mockFrom
      .mockReturnValueOnce({ select: mockJunctionSelect })
      .mockReturnValueOnce({ select: mockMoviesSelect });

    const result = await fetchProductionHouseMovies('ph1');
    expect(result).toEqual(movies);
    expect(mockMoviesIn).toHaveBeenCalledWith('id', ['movie-1', 'movie-2']);
  });

  it('throws when movies fetch fails', async () => {
    const { __mockFrom } = require('@/lib/supabase');

    // First from() call: junction table — success with data
    const mockJunctionEq = jest.fn().mockResolvedValueOnce({
      data: [{ movie_id: 'movie-1' }],
      error: null,
    });
    const mockJunctionSelect = jest.fn(() => ({ eq: mockJunctionEq }));

    // Second from() call: movies table — throws error
    const mockOrder = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: new Error('movies fail') });
    const mockMoviesIn = jest.fn(() => ({ order: mockOrder }));
    const mockMoviesSelect = jest.fn(() => ({ in: mockMoviesIn }));

    __mockFrom
      .mockReturnValueOnce({ select: mockJunctionSelect })
      .mockReturnValueOnce({ select: mockMoviesSelect });

    await expect(fetchProductionHouseMovies('ph1')).rejects.toThrow('movies fail');
  });

  it('returns empty array when movies fetch returns null data', async () => {
    const { __mockFrom } = require('@/lib/supabase');

    const mockJunctionEq = jest.fn().mockResolvedValueOnce({
      data: [{ movie_id: 'movie-1' }],
      error: null,
    });
    const mockJunctionSelect = jest.fn(() => ({ eq: mockJunctionEq }));

    const mockOrder = jest.fn().mockResolvedValueOnce({ data: null, error: null });
    const mockMoviesIn = jest.fn(() => ({ order: mockOrder }));
    const mockMoviesSelect = jest.fn(() => ({ in: mockMoviesIn }));

    __mockFrom
      .mockReturnValueOnce({ select: mockJunctionSelect })
      .mockReturnValueOnce({ select: mockMoviesSelect });

    const result = await fetchProductionHouseMovies('ph1');
    expect(result).toEqual([]);
  });

  it('returns null for PGRST116 error on fetchProductionHouseById', async () => {
    __mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    const result = await fetchProductionHouseById('nonexistent');
    expect(result).toBeNull();
  });

  it('throws on junction error', async () => {
    const mockJunctionEq = jest.fn().mockResolvedValueOnce({
      data: null,
      error: new Error('junction fail'),
    });
    const mockJunctionSelect = jest.fn(() => ({ eq: mockJunctionEq }));
    const { __mockFrom } = require('@/lib/supabase');
    __mockFrom.mockReturnValueOnce({ select: mockJunctionSelect });

    await expect(fetchProductionHouseMovies('ph1')).rejects.toThrow('junction fail');
  });
});
