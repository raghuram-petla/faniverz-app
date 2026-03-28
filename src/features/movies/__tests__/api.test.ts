const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockOr = jest.fn();
const mockLimit = jest.fn();
const mockGte = jest.fn();
const mockLte = jest.fn();
const mockRange = jest.fn();
const mockIn = jest.fn();
const mockContains = jest.fn();

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
  getLocalDateString,
} from '../api';

describe('movies api', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // fetchMovies chains .select('*').order() twice (is_featured then sort key).
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

    it('filters by movieStatus in_theaters using eq(in_theaters, true)', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      await fetchMovies({ movieStatus: 'in_theaters' });
      expect(mockEq).toHaveBeenCalledWith('in_theaters', true);
    });
  });

  describe('fetchMovieById', () => {
    function mockFromForById(
      castEntries: object[] = [],
      platforms: object[] = [],
      posters: object[] = [],
      videos: object[] = [],
      productionHouses: object[] = [],
    ) {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movies') return { select: mockSelect };
        if (table === 'movie_cast') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: castEntries, error: null }),
            }),
          };
        }
        if (table === 'movie_images' || table === 'movie_videos') {
          const data = table === 'movie_images' ? posters : videos;
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data, error: null }),
              }),
            }),
          };
        }
        if (table === 'movie_production_houses') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: productionHouses, error: null }),
            }),
          };
        }
        // movie_platforms
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: platforms, error: null }),
          }),
        };
      });
    }

    beforeEach(() => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: { id: '123', title: 'Test' }, error: null });
    });

    it('returns cast, crew, platforms, posters, videos, and productionHouses', async () => {
      mockFromForById();
      const result = await fetchMovieById('123');
      expect(result).toHaveProperty('cast');
      expect(result).toHaveProperty('crew');
      expect(result).toHaveProperty('platforms');
      expect(result).toHaveProperty('posters');
      expect(result).toHaveProperty('videos');
      expect(result).toHaveProperty('productionHouses');
    });

    it('separates cast entries from crew entries', async () => {
      mockFromForById([
        { id: 'c1', credit_type: 'cast', display_order: 0, role_order: null, actor: {} },
        { id: 'c2', credit_type: 'crew', display_order: 0, role_order: 1, actor: null },
      ]);
      const result = await fetchMovieById('123');
      expect(result!.cast).toHaveLength(1);
      expect(result!.cast[0].id).toBe('c1');
      expect(result!.crew).toHaveLength(1);
      expect(result!.crew[0].id).toBe('c2');
    });

    it('sorts cast by display_order ascending', async () => {
      mockFromForById([
        { id: 'third', credit_type: 'cast', display_order: 5, role_order: null, actor: {} },
        { id: 'first', credit_type: 'cast', display_order: 0, role_order: null, actor: {} },
        { id: 'second', credit_type: 'cast', display_order: 2, role_order: null, actor: {} },
      ]);
      const result = await fetchMovieById('123');
      expect(result!.cast.map((c) => c.id)).toEqual(['first', 'second', 'third']);
    });

    it('sorts crew by role_order ascending', async () => {
      mockFromForById([
        { id: 'music', credit_type: 'crew', role_order: 3, actor: null },
        { id: 'director', credit_type: 'crew', role_order: 1, actor: null },
        { id: 'editor', credit_type: 'crew', role_order: 5, actor: null },
      ]);
      const result = await fetchMovieById('123');
      expect(result!.crew.map((c) => c.id)).toEqual(['director', 'music', 'editor']);
    });

    it('places null role_order crew at end', async () => {
      mockFromForById([
        { id: 'unknown', credit_type: 'crew', role_order: null, actor: null },
        { id: 'director', credit_type: 'crew', role_order: 1, actor: null },
      ]);
      const result = await fetchMovieById('123');
      expect(result!.crew[0].id).toBe('director');
      expect(result!.crew[1].id).toBe('unknown');
    });

    it('sorts crew where both items have null role_order', async () => {
      mockFromForById([
        { id: 'crew-a', credit_type: 'crew', role_order: null, actor: null },
        { id: 'crew-b', credit_type: 'crew', role_order: null, actor: null },
      ]);
      const result = await fetchMovieById('123');
      expect(result!.crew).toHaveLength(2);
    });

    it('filters out null production_house entries from productionHouses junction table', async () => {
      // One entry has production_house: null (join failed or orphaned row) — should be filtered out
      mockFromForById(
        [],
        [],
        [],
        [],
        [{ production_house: { id: 'ph1', name: 'Mythri' } }, { production_house: null }],
      );
      const result = await fetchMovieById('123');
      expect(result!.productionHouses).toHaveLength(1);
      expect((result!.productionHouses[0] as { id: string }).id).toBe('ph1');
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
      const mockPlatformLimit = jest.fn();
      const mockMoviesIn = jest.fn();

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });

      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockReturnValue({ limit: mockPlatformLimit });
      mockPlatformLimit.mockResolvedValue({
        data: [{ movie_id: 'm1' }, { movie_id: 'm2' }],
        error: null,
      });
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
      const mockPlatformLimit = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockReturnValue({ limit: mockPlatformLimit });
      mockPlatformLimit.mockResolvedValue({ data: [], error: null });

      const result = await fetchMoviesByPlatform('unknown');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      const mockPlatformLimit = jest.fn();
      const mockMoviesIn = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockReturnValue({ limit: mockPlatformLimit });
      mockPlatformLimit.mockResolvedValue({ data: [{ movie_id: 'm1' }], error: null });
      mockSelect.mockReturnValue({ in: mockMoviesIn });
      mockMoviesIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('Platform fetch failed') });

      await expect(fetchMoviesByPlatform('netflix')).rejects.toThrow('Platform fetch failed');
    });
  });

  describe('fetchMoviesPaginated', () => {
    // fetchMoviesPaginated now passes { featuredFirst: true } to applyMovieFilters,
    // which chains: select → order(is_featured) → order(sortBy) → range
    beforeEach(() => {
      mockRange.mockReturnValue(makeRangeResult());
      mockOrder.mockReturnValue({ order: mockOrder, range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });
    });

    it('queries movies table and calls range(0, 9) for page 0', async () => {
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0);
      expect(supabase.from).toHaveBeenCalledWith('movies');
      expect(mockRange).toHaveBeenCalledWith(0, 9);
    });

    it('calls range(10, 19) for offset 10', async () => {
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(10);
      expect(mockRange).toHaveBeenCalledWith(10, 19);
    });

    it('returns data array on success', async () => {
      const mockData = [{ id: '1', title: 'Movie' }];
      mockRange.mockReturnValue(makeRangeResult(mockData));

      const result = await fetchMoviesPaginated(0);
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      mockRange.mockReturnValue(makeRangeResult(null));

      const result = await fetchMoviesPaginated(0);
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockRange.mockReturnValue(makeRangeResult(null, new Error('Paginated fetch failed')));

      await expect(fetchMoviesPaginated(0)).rejects.toThrow('Paginated fetch failed');
    });

    it('filters by movieStatus in_theaters when provided', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { movieStatus: 'in_theaters' });
      expect(mockEq2).toHaveBeenCalledWith('in_theaters', true);
    });

    it('filters by genre when provided', async () => {
      mockSelect.mockReturnValue({ contains: mockContains });
      mockContains.mockReturnValue({ order: mockOrder });
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { genre: 'Action' });
      expect(mockContains).toHaveBeenCalledWith('genres', ['Action']);
    });

    it('filters by platformId when matching movies exist', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') return { select: mockPlatformSelect };
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: [{ movie_id: 'm1' }] });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
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
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { sortBy: 'top_rated' });
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false });
    });

    it('orders by latest sortBy', async () => {
      mockRange.mockReturnValue(makeRangeResult([]));

      await fetchMoviesPaginated(0, 10, { sortBy: 'latest' });
      expect(mockOrder).toHaveBeenCalledWith('release_date', { ascending: false });
    });

    it('orders by upcoming sortBy', async () => {
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

      await fetchUpcomingMovies(10);
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

  describe('fetchMovies — streaming and released filters', () => {
    it('filters by streaming status when matching movie_platform ids exist', async () => {
      const mockPlatformSelect = jest.fn();
      const _mockPlatformResolved = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockResolvedValue({
        data: [{ movie_id: 'm1' }, { movie_id: 'm1' }, { movie_id: 'm2' }],
        error: null,
      });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue(makeOrderResult([{ id: 'm1' }]));

      const result = await fetchMovies({ movieStatus: 'streaming' });
      // Deduplication: m1, m2 → 2 unique IDs
      expect(mockIn).toHaveBeenCalledWith('id', ['m1', 'm2']);
      expect(result).toHaveLength(1);
    });

    it('returns empty array when streaming status yields no movie_platform rows', async () => {
      const mockPlatformSelect = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockResolvedValue({ data: [], error: null });

      const result = await fetchMovies({ movieStatus: 'streaming' });
      expect(result).toEqual([]);
    });

    it('throws when streaming status query errors', async () => {
      const mockPlatformSelect = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockResolvedValue({
        data: null,
        error: new Error('Streaming query error'),
      });

      await expect(fetchMovies({ movieStatus: 'streaming' })).rejects.toThrow(
        'Streaming query error',
      );
    });

    it('filters by released status using lte and eq(in_theaters, false)', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue(makeOrderResult([]));

      await fetchMovies({ movieStatus: 'released' });
      expect(mockLte).toHaveBeenCalledWith('release_date', expect.any(String));
      expect(mockEq2).toHaveBeenCalledWith('in_theaters', false);
    });

    it('filters by upcoming status using gt(release_date)', async () => {
      mockSelect.mockReturnValue({ gt: jest.fn().mockReturnValue({ order: mockOrder }) });
      mockOrder.mockReturnValue(makeOrderResult([]));

      // Just verify the filter runs without error
      await expect(fetchMovies({ movieStatus: 'upcoming' })).resolves.toBeDefined();
    });
  });

  describe('fetchMovieById — error paths', () => {
    it('throws when main movie query fails', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movies') return { select: mockSelect };
        return { select: jest.fn() };
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: null, error: new Error('Movie not found') });

      await expect(fetchMovieById('unknown')).rejects.toThrow('Movie not found');
    });

    it('returns null when movie data is null and error is null', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movies') return { select: mockSelect };
        return { select: jest.fn() };
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await fetchMovieById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('fetchMoviesByPlatform — null data branch', () => {
    it('returns empty array when movieIds data is null', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      const mockPlatformLimit = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockReturnValue({ limit: mockPlatformLimit });
      mockPlatformLimit.mockResolvedValue({ data: null, error: null });

      const result = await fetchMoviesByPlatform('netflix');
      expect(result).toEqual([]);
    });

    it('throws when platform_id filter errors in fetchMoviesByPlatform', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      const mockPlatformLimit = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockReturnValue({ limit: mockPlatformLimit });
      mockPlatformLimit.mockResolvedValue({ data: null, error: new Error('Platform ID error') });

      await expect(fetchMoviesByPlatform('broken')).rejects.toThrow('Platform ID error');
    });
  });

  describe('fetchMovieById — sub-query error branches in Promise.all', () => {
    function mockFromForByIdWithErrors(options: {
      castError?: boolean;
      platformError?: boolean;
      imageError?: boolean;
      videoError?: boolean;
      phError?: boolean;
    }) {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movies') return { select: mockSelect };
        if (table === 'movie_cast') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: options.castError ? null : [],
                error: options.castError ? new Error('cast fail') : null,
              }),
            }),
          };
        }
        if (table === 'movie_images') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: options.imageError ? null : [],
                  error: options.imageError ? new Error('img fail') : null,
                }),
              }),
            }),
          };
        }
        if (table === 'movie_videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: options.videoError ? null : [],
                  error: options.videoError ? new Error('vid fail') : null,
                }),
              }),
            }),
          };
        }
        if (table === 'movie_production_houses') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: options.phError ? null : [],
                error: options.phError ? new Error('ph fail') : null,
              }),
            }),
          };
        }
        // movie_platforms
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: options.platformError ? null : [],
              error: options.platformError ? new Error('plat fail') : null,
            }),
          }),
        };
      });
      return warnSpy;
    }

    beforeEach(() => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: { id: '123', title: 'Test' }, error: null });
    });

    it('degrades gracefully when cast fetch fails (returns empty cast/crew)', async () => {
      const warnSpy = mockFromForByIdWithErrors({ castError: true });
      const result = await fetchMovieById('123');
      expect(result!.cast).toEqual([]);
      expect(result!.crew).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('fetchMovieById: cast fetch failed', expect.any(Error));
      warnSpy.mockRestore();
    });

    it('degrades gracefully when platform fetch fails', async () => {
      const warnSpy = mockFromForByIdWithErrors({ platformError: true });
      const result = await fetchMovieById('123');
      expect(result!.platforms).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        'fetchMovieById: platforms fetch failed',
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });

    it('degrades gracefully when images fetch fails', async () => {
      const warnSpy = mockFromForByIdWithErrors({ imageError: true });
      const result = await fetchMovieById('123');
      expect(result!.posters).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        'fetchMovieById: images fetch failed',
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });

    it('degrades gracefully when videos fetch fails', async () => {
      const warnSpy = mockFromForByIdWithErrors({ videoError: true });
      const result = await fetchMovieById('123');
      expect(result!.videos).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        'fetchMovieById: videos fetch failed',
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });

    it('degrades gracefully when production houses fetch fails', async () => {
      const warnSpy = mockFromForByIdWithErrors({ phError: true });
      const result = await fetchMovieById('123');
      expect(result!.productionHouses).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        'fetchMovieById: production houses fetch failed',
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });

  describe('applyMovieFilters — platformId error path', () => {
    it('throws when platformId sub-query errors', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') return { select: mockPlatformSelect };
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockResolvedValue({ data: null, error: new Error('Platform query error') });

      await expect(fetchMovies({ platformId: 'bad-id' })).rejects.toThrow('Platform query error');
    });
  });

  describe('fetchMoviesByMonth — null data fallback', () => {
    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchMoviesByMonth(2025, 1);
      expect(result).toEqual([]);
    });
  });

  describe('searchMovies — null data fallback', () => {
    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ or: mockOr });
      mockOr.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: null });

      const result = await searchMovies('test');
      expect(result).toEqual([]);
    });
  });

  describe('fetchMoviesByPlatform — null data fallback for movies query', () => {
    it('returns empty array when movies data is null', async () => {
      const mockPlatformSelect = jest.fn();
      const mockPlatformEq = jest.fn();
      const mockPlatformLimit = jest.fn();
      const mockMoviesIn = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') return { select: mockPlatformSelect };
        return { select: mockSelect };
      });
      mockPlatformSelect.mockReturnValue({ eq: mockPlatformEq });
      mockPlatformEq.mockReturnValue({ limit: mockPlatformLimit });
      mockPlatformLimit.mockResolvedValue({ data: [{ movie_id: 'm1' }], error: null });
      mockSelect.mockReturnValue({ in: mockMoviesIn });
      mockMoviesIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchMoviesByPlatform('netflix');
      expect(result).toEqual([]);
    });
  });

  describe('fetchMovies — no featuredFirst option (internal applyMovieFilters)', () => {
    it('applies popular sort without featuredFirst when calling fetchMoviesPaginated with no filters', async () => {
      // fetchMoviesPaginated passes featuredFirst: true, so test via direct fetchMovies which also passes it
      // This test covers the default switch case without explicit sortBy
      mockRange.mockReturnValue(makeRangeResult([]));
      mockOrder.mockReturnValue({ order: mockOrder, range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });

      await fetchMoviesPaginated(0, 10);
      // Default sort is 'popular' → order by review_count
      expect(mockOrder).toHaveBeenCalledWith('review_count', { ascending: false });
    });
  });

  describe('fetchMovies — streaming filter with null streamingIds data', () => {
    it('returns empty array when streaming query returns null data (no error)', async () => {
      const mockPlatformSelect = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockResolvedValue({ data: null, error: null });

      const result = await fetchMovies({ movieStatus: 'streaming' });
      expect(result).toEqual([]);
    });
  });

  describe('fetchMoviesPaginated — streaming filter returns null', () => {
    it('returns empty array when streaming filter yields null', async () => {
      const mockPlatformSelect = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'movie_platforms') {
          return { select: mockPlatformSelect };
        }
        return { select: mockSelect };
      });
      mockPlatformSelect.mockResolvedValue({ data: null, error: null });

      const result = await fetchMoviesPaginated(0, 10, { movieStatus: 'streaming' });
      expect(result).toEqual([]);
    });
  });

  describe('getLocalDateString', () => {
    it('formats a date as YYYY-MM-DD in local timezone', () => {
      const date = new Date(2025, 2, 15); // March 15, 2025 (month is 0-indexed)
      expect(getLocalDateString(date)).toBe('2025-03-15');
    });

    it('pads single-digit month and day with leading zeros', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(getLocalDateString(date)).toBe('2025-01-05');
    });

    it('uses local date, not UTC (avoids timezone offset bug)', () => {
      // Simulate 11:30 PM on March 11 in a UTC-5 timezone
      // toISOString() would return 2025-03-12T04:30:00Z (next day in UTC)
      // getLocalDateString should return the LOCAL date
      const date = new Date(2025, 2, 11, 23, 30, 0);
      expect(getLocalDateString(date)).toBe('2025-03-11');
    });

    it('defaults to current date when no argument', () => {
      const result = getLocalDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
