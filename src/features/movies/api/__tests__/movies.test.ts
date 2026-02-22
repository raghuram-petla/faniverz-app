const mockFrom = jest.fn();

// Helper to create a chainable mock that returns { data, error } at the terminal method
function createChain(terminalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'gte', 'lte', 'not', 'order', 'eq', 'single', 'or', 'limit'];
  for (const method of methods) {
    chain[method] = jest.fn().mockReturnValue(
      // Terminal methods return the result directly
      ['order', 'single', 'limit'].includes(method) ? terminalResult : chain // Non-terminal methods return the chain
    );
  }
  // Also make terminal methods chainable (some paths use them mid-chain)
  chain['order'] = jest.fn().mockReturnValue({ ...terminalResult, ...chain });
  chain['single'] = jest.fn().mockReturnValue(terminalResult);
  chain['limit'] = jest.fn().mockReturnValue(terminalResult);
  return chain;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { fetchMoviesByMonth, fetchMovieDetail, fetchMovieCast, searchMovies } from '../movies';

describe('movies API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMoviesByMonth', () => {
    it('queries both movies and ott_releases tables', async () => {
      const moviesChain = createChain({ data: [], error: null });
      const ottChain = createChain({ data: [], error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movies') return moviesChain;
        if (table === 'ott_releases') return ottChain;
        return createChain({ data: [], error: null });
      });

      await fetchMoviesByMonth(2026, 1);

      expect(mockFrom).toHaveBeenCalledWith('movies');
      expect(mockFrom).toHaveBeenCalledWith('ott_releases');
    });

    it('excludes cancelled movies', async () => {
      const moviesChain = createChain({ data: [], error: null });
      const ottChain = createChain({ data: [], error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movies') return moviesChain;
        return ottChain;
      });

      await fetchMoviesByMonth(2026, 0);

      expect(moviesChain.not).toHaveBeenCalledWith('status', 'eq', 'cancelled');
    });

    it('returns theatrical entries with correct dotType', async () => {
      const theatricalMovie = {
        id: 1,
        title: 'Pushpa 3',
        release_date: '2026-02-15',
        release_type: 'theatrical',
        status: 'upcoming',
      };
      const moviesChain = createChain({ data: [theatricalMovie], error: null });
      const ottChain = createChain({ data: [], error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movies') return moviesChain;
        return ottChain;
      });

      const result = await fetchMoviesByMonth(2026, 1);

      expect(result).toHaveLength(1);
      expect(result[0].dotType).toBe('theatrical');
      expect(result[0].date).toBe('2026-02-15');
    });

    it('returns ott_original entries with correct dotType', async () => {
      const ottOriginal = {
        id: 2,
        title: 'OTT Movie',
        release_date: '2026-02-20',
        release_type: 'ott_original',
        status: 'upcoming',
      };
      const moviesChain = createChain({ data: [ottOriginal], error: null });
      const ottChain = createChain({ data: [], error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movies') return moviesChain;
        return ottChain;
      });

      const result = await fetchMoviesByMonth(2026, 1);

      expect(result).toHaveLength(1);
      expect(result[0].dotType).toBe('ott_original');
    });

    it('returns OTT premiere entries from ott_releases', async () => {
      const moviesChain = createChain({ data: [], error: null });
      const ottRelease = {
        ott_release_date: '2026-02-25',
        platform_id: 1,
        movies: {
          id: 3,
          title: 'Released on OTT',
          status: 'released',
        },
      };
      const ottChain = createChain({ data: [ottRelease], error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movies') return moviesChain;
        return ottChain;
      });

      const result = await fetchMoviesByMonth(2026, 1);

      expect(result).toHaveLength(1);
      expect(result[0].dotType).toBe('ott_premiere');
      expect(result[0].platform_id).toBe(1);
    });

    it('filters out cancelled movies from OTT results', async () => {
      const moviesChain = createChain({ data: [], error: null });
      const ottRelease = {
        ott_release_date: '2026-02-25',
        platform_id: 1,
        movies: { id: 3, title: 'Cancelled', status: 'cancelled' },
      };
      const ottChain = createChain({ data: [ottRelease], error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'movies') return moviesChain;
        return ottChain;
      });

      const result = await fetchMoviesByMonth(2026, 1);
      expect(result).toHaveLength(0);
    });
  });

  describe('fetchMovieDetail', () => {
    it('fetches single movie by id', async () => {
      const movie = { id: 1, title: 'Test Movie' };
      const chain = createChain({ data: movie, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await fetchMovieDetail(1);

      expect(mockFrom).toHaveBeenCalledWith('movies');
      expect(chain.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(movie);
    });

    it('throws on error', async () => {
      const chain = createChain({ data: null, error: { message: 'Not found' } });
      mockFrom.mockReturnValue(chain);

      await expect(fetchMovieDetail(999)).rejects.toEqual({ message: 'Not found' });
    });
  });

  describe('fetchMovieCast', () => {
    it('fetches cast ordered by display_order', async () => {
      const cast = [
        { id: 1, name: 'Actor 1', display_order: 0 },
        { id: 2, name: 'Actor 2', display_order: 1 },
      ];
      const chain = createChain({ data: cast, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await fetchMovieCast(1);

      expect(mockFrom).toHaveBeenCalledWith('movie_cast');
      expect(chain.eq).toHaveBeenCalledWith('movie_id', 1);
      expect(chain.order).toHaveBeenCalledWith('display_order', { ascending: true });
      expect(result).toEqual(cast);
    });
  });

  describe('searchMovies', () => {
    it('returns empty array for empty query', async () => {
      const result = await searchMovies('');
      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns empty array for whitespace query', async () => {
      const result = await searchMovies('   ');
      expect(result).toEqual([]);
    });

    it('searches by title and title_te', async () => {
      const movies = [{ id: 1, title: 'Pushpa' }];
      const chain = createChain({ data: movies, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await searchMovies('Pushpa');

      expect(mockFrom).toHaveBeenCalledWith('movies');
      expect(chain.not).toHaveBeenCalledWith('status', 'eq', 'cancelled');
      expect(chain.or).toHaveBeenCalledWith('title.ilike.%Pushpa%,title_te.ilike.%Pushpa%');
      expect(result).toEqual(movies);
    });
  });
});
