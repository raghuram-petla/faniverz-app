const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockOr = jest.fn();
const mockLimit = jest.fn();
const mockGte = jest.fn();
const mockLte = jest.fn();
const mockRange = jest.fn();

// Creates a chainable+thenable result for mockOrder.
// Chaining: .order().order() / .order().range() works.
// Awaitable: `await query` works because the object has a .then() method.
function makeOrderResult(data: unknown[] | null = [], error: Error | null = null) {
  const result = {
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
    then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
      return Promise.resolve({ data, error }).then(resolve, reject);
    },
    catch(reject: (e: unknown) => void) {
      return Promise.resolve({ data, error }).catch(reject);
    },
  };
  return result;
}

function makeRangeResult(data: unknown[] | null = [], error: Error | null = null) {
  return {
    then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
      return Promise.resolve({ data, error }).then(resolve, reject);
    },
    catch(reject: (e: unknown) => void) {
      return Promise.resolve({ data, error }).catch(reject);
    },
  };
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import {
  fetchMovies,
  fetchMovieById,
  searchMovies,
  fetchMoviesByMonth,
  fetchMoviesByPlatform,
  fetchMoviesPaginated,
  fetchUpcomingMovies,
} from '../api';

describe('movies api', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // fetchMovies chains .order() twice (is_featured then sort key).
    // makeOrderResult() is both chainable ({ order: mockOrder }) and thenable (await-able).
    mockSelect.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue(makeOrderResult());

    // Default chain for fetchMovieById
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: null, error: null });

    // Default chain for searchMovies
    mockOr.mockReturnValue({ order: mockOrder });
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  describe('fetchMovies', () => {
    it('queries the movies table', async () => {
      await fetchMovies();
      expect(supabase.from).toHaveBeenCalledWith('movies');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('orders by is_featured first, then review_count by default (popular)', async () => {
      await fetchMovies();
      expect(mockOrder).toHaveBeenCalledWith('is_featured', { ascending: false });
      expect(mockOrder).toHaveBeenCalledWith('review_count', { ascending: false });
    });

    it('orders by rating when sortBy is top_rated', async () => {
      await fetchMovies({ sortBy: 'top_rated' });
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false });
    });

    it('returns empty array when no data', async () => {
      mockOrder.mockReturnValue(makeOrderResult(null, null));
      const result = await fetchMovies();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockOrder.mockReturnValue(makeOrderResult(null, new Error('DB error')));
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
      mockOrder.mockReturnValue(makeOrderResult(mockData));
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

  describe('fetchMovies — genre and platform filters', () => {
    const mockContains = jest.fn();
    const mockIn = jest.fn();

    it('filters by genre when provided', async () => {
      mockSelect.mockReturnValue({ contains: mockContains });
      mockContains.mockReturnValue({ order: mockOrder });
      await fetchMovies({ genre: 'Action' });
      expect(mockContains).toHaveBeenCalledWith('genres', ['Action']);
    });

    it('filters by platformId when matching movies exist', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [{ movie_id: 'm1' }] });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue(makeOrderResult([{ id: 'm1', title: 'Test' }]));

      const result = await fetchMovies({ platformId: 'netflix' });
      expect(mockPlatformEq).toHaveBeenCalledWith('platform_id', 'netflix');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when platformId has no matching movies', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [] });

      const result = await fetchMovies({ platformId: 'nonexistent' });
      expect(result).toEqual([]);
    });
  });

  describe('fetchMoviesByPlatform', () => {
    it('queries movie_platforms then fetches movies', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      const mockMoviesIn = jest.fn();

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });

      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [{ movie_id: 'm1' }, { movie_id: 'm2' }] });
      mockSelect.mockReturnValue({ in: mockMoviesIn });
      mockMoviesIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({
        data: [{ id: 'm1', title: 'Movie 1' }],
        error: null,
      });

      const result = await fetchMoviesByPlatform('netflix');
      expect(mockPlatformEq).toHaveBeenCalledWith('platform_id', 'netflix');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no movies for platform', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [] });

      const result = await fetchMoviesByPlatform('unknown');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      const mockMoviesIn = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [{ movie_id: 'm1' }] });
      mockSelect.mockReturnValue({ in: mockMoviesIn });
      mockMoviesIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('Platform fetch failed') });

      await expect(fetchMoviesByPlatform('netflix')).rejects.toThrow('Platform fetch failed');
    });
  });

  describe('fetchMoviesPaginated', () => {
    beforeEach(() => {
      mockRange.mockReturnValue(makeRangeResult());
      mockOrder.mockReturnValue(makeOrderResult());
      mockSelect.mockReturnValue({ order: mockOrder });
    });

    it('queries movies table and calls range(0, 9) for page 0', async () => {
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0);
      expect(supabase.from).toHaveBeenCalledWith('movies');
      expect(mockRange).toHaveBeenCalledWith(0, 9);
    });

    it('calls range(10, 19) for page 1', async () => {
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(1);
      expect(mockRange).toHaveBeenCalledWith(10, 19);
    });

    it('returns data array on success', async () => {
      const mockData = [{ id: '1', title: 'Movie' }];
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult(mockData));

      const result = await fetchMoviesPaginated(0);
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult(null));

      const result = await fetchMoviesPaginated(0);
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult(null, new Error('Paginated fetch failed')));

      await expect(fetchMoviesPaginated(0)).rejects.toThrow('Paginated fetch failed');
    });

    it('filters by releaseType when provided', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { releaseType: 'theatrical' });
      expect(mockEq2).toHaveBeenCalledWith('release_type', 'theatrical');
    });

    it('filters by genre when provided', async () => {
      const mockContains = jest.fn();
      mockSelect.mockReturnValue({ contains: mockContains });
      mockContains.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { genre: 'Action' });
      expect(mockContains).toHaveBeenCalledWith('genres', ['Action']);
    });

    it('filters by platformId when matching movies exist', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      const mockIn = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') return { select: mockPlatformSelect };
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [{ movie_id: 'm1' }] });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([{ id: 'm1' }]));

      const result = await fetchMoviesPaginated(0, 10, { platformId: 'netflix' });
      expect(result).toHaveLength(1);
    });

    it('returns empty array when platformId has no matching movies', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') return { select: mockPlatformSelect };
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [] });

      const result = await fetchMoviesPaginated(0, 10, { platformId: 'none' });
      expect(result).toEqual([]);
    });

    it('orders by top_rated sortBy', async () => {
      mockSelect.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { sortBy: 'top_rated' });
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false });
    });

    it('orders by latest sortBy', async () => {
      mockSelect.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { sortBy: 'latest' });
      expect(mockOrder).toHaveBeenCalledWith('release_date', { ascending: false });
    });

    it('orders by upcoming sortBy', async () => {
      mockSelect.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { sortBy: 'upcoming' });
      expect(mockOrder).toHaveBeenCalledWith('release_date', { ascending: true });
    });
  });

  describe('fetchUpcomingMovies', () => {
    it('queries movies with gte release_date filter', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchUpcomingMovies(0);
      expect(supabase.from).toHaveBeenCalledWith('movies');
      expect(mockGte).toHaveBeenCalledWith('release_date', expect.any(String));
    });

    it('calls range(0, 9) for page 0', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchUpcomingMovies(0);
      expect(mockRange).toHaveBeenCalledWith(0, 9);
    });

    it('calls range(10, 19) for page 1', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchUpcomingMovies(1);
      expect(mockRange).toHaveBeenCalledWith(10, 19);
    });

    it('returns data array on success', async () => {
      const mockData = [{ id: '1', title: 'Upcoming' }];
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult(mockData));

      const result = await fetchUpcomingMovies(0);
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult(null));

      const result = await fetchUpcomingMovies(0);
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockReturnValue(makeRangeResult(null, new Error('Upcoming fetch failed')));

      await expect(fetchUpcomingMovies(0)).rejects.toThrow('Upcoming fetch failed');
    });
  });
});
