const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockOr = jest.fn();
const mockLimit = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchMovies, fetchMovieById, searchMovies } from '../api';

describe('movies api', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default chain for fetchMovies
    mockSelect.mockReturnValue({ order: mockOrder });
    mockOrder.mockResolvedValue({ data: [], error: null });

    // Default chain for fetchMovieById
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: null, error: null });

    // Default chain for searchMovies
    mockOr.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  describe('fetchMovies', () => {
    it('queries the movies table', async () => {
      await fetchMovies();
      expect(supabase.from).toHaveBeenCalledWith('movies');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('orders by release_date descending', async () => {
      await fetchMovies();
      expect(mockOrder).toHaveBeenCalledWith('release_date', { ascending: false });
    });

    it('returns empty array when no data', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      const result = await fetchMovies();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });
      await expect(fetchMovies()).rejects.toThrow('DB error');
    });
  });

  describe('fetchMovieById', () => {
    it('queries by id', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      await fetchMovieById('123');
      expect(supabase.from).toHaveBeenCalledWith('movies');
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(mockSingle).toHaveBeenCalled();
    });
  });

  describe('searchMovies', () => {
    it('searches by title and director', async () => {
      mockSelect.mockReturnValue({ or: mockOr });
      await searchMovies('test');
      expect(mockOr).toHaveBeenCalledWith('title.ilike.%test%,director.ilike.%test%');
    });

    it('limits results to 20', async () => {
      mockSelect.mockReturnValue({ or: mockOr });
      await searchMovies('test');
      expect(mockLimit).toHaveBeenCalledWith(20);
    });
  });
});
