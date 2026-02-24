const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockOr = jest.fn();
const mockLimit = jest.fn();
const mockGte = jest.fn();
const mockLte = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchMovies, fetchMovieById, searchMovies, fetchMoviesByMonth } from '../api';

describe('movies api', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default chain for fetchMovies (no filters)
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

    it('orders by review_count by default (popular)', async () => {
      await fetchMovies();
      expect(mockOrder).toHaveBeenCalledWith('review_count', { ascending: false });
    });

    it('orders by rating when sortBy is top_rated', async () => {
      await fetchMovies({ sortBy: 'top_rated' });
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false });
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

    it('filters by releaseType when provided', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      await fetchMovies({ releaseType: 'theatrical' });
      expect(mockEq).toHaveBeenCalledWith('release_type', 'theatrical');
    });
  });

  describe('fetchMovieById', () => {
    it('queries by id and fetches joins', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: { id: '123', title: 'Test' }, error: null });

      // Mock the cast and platform sub-queries
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movies') {
          return { select: mockSelect };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const result = await fetchMovieById('123');
      expect(result).toHaveProperty('cast');
      expect(result).toHaveProperty('platforms');
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

  describe('fetchMoviesByMonth', () => {
    it('fetches movies for a specific month', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: [], error: null });

      await fetchMoviesByMonth(2025, 1);
      expect(supabase.from).toHaveBeenCalledWith('movies');
      expect(mockGte).toHaveBeenCalledWith('release_date', '2025-02-01');
    });

    it('throws on error in fetchMoviesByMonth', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('Month query failed') });

      await expect(fetchMoviesByMonth(2025, 1)).rejects.toThrow('Month query failed');
    });
  });

  describe('fetchMovies — additional sort variants', () => {
    it('orders by release_date ascending when sortBy is upcoming', async () => {
      await fetchMovies({ sortBy: 'upcoming' });
      expect(mockOrder).toHaveBeenCalledWith('release_date', { ascending: true });
    });

    it('orders by release_date descending when sortBy is latest', async () => {
      await fetchMovies({ sortBy: 'latest' });
      expect(mockOrder).toHaveBeenCalledWith('release_date', { ascending: false });
    });

    it('returns data array when data is not null', async () => {
      const mockData = [{ id: '1', title: 'Test Movie' }];
      mockOrder.mockResolvedValue({ data: mockData, error: null });
      const result = await fetchMovies();
      expect(result).toEqual(mockData);
    });
  });

  describe('searchMovies — additional', () => {
    it('throws on error in searchMovies', async () => {
      mockSelect.mockReturnValue({ or: mockOr });
      mockOr.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: new Error('Search failed') });

      await expect(searchMovies('test')).rejects.toThrow('Search failed');
    });
  });
});
