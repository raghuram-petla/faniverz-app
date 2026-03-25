import { describe, it, expect } from 'vitest';
import {
  extractYouTubeId,
  getStatus,
  buildFieldDefs,
  fmt,
  truncate,
} from '@/components/sync/fieldDiffHelpers';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

const makeMovie = (overrides: Partial<ExistingMovieData> = {}): ExistingMovieData => ({
  id: 'uuid-1',
  tmdb_id: 101,
  title: 'Test Movie',
  synopsis: 'A test synopsis',
  release_date: '2024-01-15',
  poster_url: 'poster.jpg',
  backdrop_url: 'backdrop.jpg',
  director: 'Director Name',
  runtime: 120,
  genres: ['Action', 'Drama'],
  imdb_id: 'tt1234567',
  title_te: 'Telugu Title',
  synopsis_te: 'Telugu synopsis',
  tagline: 'A tagline',
  tmdb_status: 'Released',
  tmdb_vote_average: 7.5,
  tmdb_vote_count: 1000,
  budget: 50000000,
  revenue: 100000000,
  certification: 'U/A',
  spoken_languages: ['en', 'te'],
  ...overrides,
});

const makeTmdb = (overrides: Partial<LookupMovieData> = {}): LookupMovieData => ({
  tmdbId: 101,
  title: 'Test Movie',
  overview: 'A test synopsis',
  releaseDate: '2024-01-15',
  runtime: 120,
  genres: ['Action', 'Drama'],
  posterUrl: 'tmdb-poster.jpg',
  backdropUrl: 'tmdb-backdrop.jpg',
  director: 'Director Name',
  castCount: 10,
  crewCount: 5,
  posterCount: 3,
  backdropCount: 2,
  videoCount: 5,
  providerNames: ['Netflix'],
  keywordCount: 10,
  imdbId: 'tt1234567',
  titleTe: 'Telugu Title',
  synopsisTe: 'Telugu synopsis',
  tagline: 'A tagline',
  tmdbStatus: 'Released',
  tmdbVoteAverage: 7.5,
  tmdbVoteCount: 1000,
  budget: 50000000,
  revenue: 100000000,
  certification: 'U/A',
  spokenLanguages: ['en', 'te'],
  productionCompanyCount: 2,
  originalLanguage: 'te',
  dbPosterCount: 3,
  dbBackdropCount: 2,
  dbVideoCount: 5,
  dbKeywordCount: 10,
  dbProductionHouseCount: 2,
  dbPlatformNames: ['Netflix'],
  ...overrides,
});

describe('extractYouTubeId', () => {
  it('returns null for null input', () => {
    expect(extractYouTubeId(null)).toBeNull();
  });

  it('extracts ID from watch?v= format', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abc12345678')).toBe('abc12345678');
  });

  it('extracts ID from youtu.be/ format', () => {
    expect(extractYouTubeId('https://youtu.be/abc12345678')).toBe('abc12345678');
  });

  it('extracts ID from embed/ format', () => {
    expect(extractYouTubeId('https://youtube.com/embed/abc12345678')).toBe('abc12345678');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeId('https://vimeo.com/12345')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });
});

describe('getStatus', () => {
  const movie = makeMovie();
  const tmdb = makeTmdb();

  describe('title', () => {
    it('returns same when titles match', () => {
      expect(getStatus(movie, tmdb, 'title')).toBe('same');
    });

    it('returns missing when DB title is null', () => {
      expect(getStatus(makeMovie({ title: null }), tmdb, 'title')).toBe('missing');
    });

    it('returns changed when titles differ', () => {
      expect(getStatus(makeMovie({ title: 'Different' }), tmdb, 'title')).toBe('changed');
    });

    it('returns same when both are null/empty', () => {
      expect(getStatus(makeMovie({ title: null }), makeTmdb({ title: '' }), 'title')).toBe('same');
    });
  });

  describe('synopsis', () => {
    it('returns same when synopses match', () => {
      expect(getStatus(movie, tmdb, 'synopsis')).toBe('same');
    });

    it('returns missing when DB synopsis is null', () => {
      expect(getStatus(makeMovie({ synopsis: null }), tmdb, 'synopsis')).toBe('missing');
    });

    it('returns changed when synopses differ', () => {
      expect(getStatus(makeMovie({ synopsis: 'Other' }), tmdb, 'synopsis')).toBe('changed');
    });
  });

  describe('poster_url', () => {
    it('returns same when both have poster', () => {
      expect(getStatus(movie, tmdb, 'poster_url')).toBe('same');
    });

    it('returns missing when DB poster is null', () => {
      expect(getStatus(makeMovie({ poster_url: null }), tmdb, 'poster_url')).toBe('missing');
    });

    it('returns same when both are null', () => {
      expect(
        getStatus(makeMovie({ poster_url: null }), makeTmdb({ posterUrl: null }), 'poster_url'),
      ).toBe('same');
    });
  });

  describe('backdrop_url', () => {
    it('returns same when DB has backdrop', () => {
      expect(getStatus(movie, tmdb, 'backdrop_url')).toBe('same');
    });

    it('returns missing when DB backdrop is null', () => {
      expect(getStatus(makeMovie({ backdrop_url: null }), tmdb, 'backdrop_url')).toBe('missing');
    });
  });

  describe('director', () => {
    it('returns same when directors match', () => {
      expect(getStatus(movie, tmdb, 'director')).toBe('same');
    });

    it('returns missing when DB director is null', () => {
      expect(getStatus(makeMovie({ director: null }), tmdb, 'director')).toBe('missing');
    });
  });

  describe('runtime', () => {
    it('returns same when runtimes match', () => {
      expect(getStatus(movie, tmdb, 'runtime')).toBe('same');
    });

    it('returns missing when DB runtime is null', () => {
      expect(getStatus(makeMovie({ runtime: null }), tmdb, 'runtime')).toBe('missing');
    });

    it('returns same when both are null/0', () => {
      expect(getStatus(makeMovie({ runtime: null }), makeTmdb({ runtime: 0 }), 'runtime')).toBe(
        'same',
      );
    });
  });

  describe('genres', () => {
    it('returns same when genres match regardless of order', () => {
      expect(getStatus(makeMovie({ genres: ['Drama', 'Action'] }), tmdb, 'genres')).toBe('same');
    });

    it('returns missing when DB genres is null', () => {
      expect(getStatus(makeMovie({ genres: null }), tmdb, 'genres')).toBe('missing');
    });

    it('returns same when both are empty', () => {
      expect(getStatus(makeMovie({ genres: [] }), makeTmdb({ genres: [] }), 'genres')).toBe('same');
    });

    it('returns changed when genres differ', () => {
      expect(getStatus(makeMovie({ genres: ['Comedy'] }), tmdb, 'genres')).toBe('changed');
    });
  });

  describe('images', () => {
    it('returns same when DB has enough images', () => {
      expect(getStatus(movie, tmdb, 'images')).toBe('same');
    });

    it('returns missing when DB has fewer images', () => {
      expect(
        getStatus(
          makeMovie(),
          makeTmdb({ dbPosterCount: 1, dbBackdropCount: 0, posterCount: 5, backdropCount: 3 }),
          'images',
        ),
      ).toBe('missing');
    });
  });

  describe('videos', () => {
    it('returns same when DB has enough videos', () => {
      expect(getStatus(movie, tmdb, 'videos')).toBe('same');
    });

    it('returns same when TMDB has 0 videos', () => {
      expect(getStatus(movie, makeTmdb({ videoCount: 0 }), 'videos')).toBe('same');
    });
  });

  describe('imdb_id', () => {
    it('returns same when IDs match', () => {
      expect(getStatus(movie, tmdb, 'imdb_id')).toBe('same');
    });

    it('returns missing when DB has no imdb_id', () => {
      expect(getStatus(makeMovie({ imdb_id: null }), tmdb, 'imdb_id')).toBe('missing');
    });
  });

  describe('certification_auto', () => {
    it('returns same when TMDB has no certification', () => {
      expect(getStatus(movie, makeTmdb({ certification: null }), 'certification_auto')).toBe(
        'same',
      );
    });

    it('returns missing when DB has no certification but TMDB does', () => {
      expect(getStatus(makeMovie({ certification: null }), tmdb, 'certification_auto')).toBe(
        'missing',
      );
    });
  });

  describe('spoken_languages', () => {
    it('returns same when languages match', () => {
      expect(getStatus(movie, tmdb, 'spoken_languages')).toBe('same');
    });

    it('returns missing when DB has no languages', () => {
      expect(getStatus(makeMovie({ spoken_languages: null }), tmdb, 'spoken_languages')).toBe(
        'missing',
      );
    });
  });

  describe('cast', () => {
    it('always returns missing', () => {
      expect(getStatus(movie, tmdb, 'cast')).toBe('missing');
    });
  });
});

describe('buildFieldDefs', () => {
  it('returns an array of field definitions', () => {
    const defs = buildFieldDefs(makeMovie(), makeTmdb());
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0]).toHaveProperty('key');
    expect(defs[0]).toHaveProperty('label');
    expect(defs[0]).toHaveProperty('dbDisplay');
    expect(defs[0]).toHaveProperty('tmdbDisplay');
  });

  it('includes title field', () => {
    const defs = buildFieldDefs(makeMovie(), makeTmdb());
    const titleDef = defs.find((d) => d.key === 'title');
    expect(titleDef?.label).toBe('Title');
    expect(titleDef?.dbDisplay).toBe('Test Movie');
  });

  it('formats poster field correctly', () => {
    const defs = buildFieldDefs(makeMovie(), makeTmdb());
    const posterDef = defs.find((d) => d.key === 'poster_url');
    expect(posterDef?.dbDisplay).toContain('set');
    expect(posterDef?.tmdbDisplay).toContain('available');
  });

  it('formats empty poster as empty string', () => {
    const defs = buildFieldDefs(makeMovie({ poster_url: null }), makeTmdb({ posterUrl: null }));
    const posterDef = defs.find((d) => d.key === 'poster_url');
    expect(posterDef?.dbDisplay).toBe('');
    expect(posterDef?.tmdbDisplay).toBe('');
  });

  it('formats runtime with "min" suffix', () => {
    const defs = buildFieldDefs(makeMovie(), makeTmdb());
    const runtimeDef = defs.find((d) => d.key === 'runtime');
    expect(runtimeDef?.dbDisplay).toBe('120 min');
  });

  it('formats genres as comma-separated', () => {
    const defs = buildFieldDefs(makeMovie(), makeTmdb());
    const genresDef = defs.find((d) => d.key === 'genres');
    expect(genresDef?.dbDisplay).toBe('Action, Drama');
  });
});

describe('fmt', () => {
  it('returns empty string for null', () => {
    expect(fmt(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(fmt(undefined)).toBe('');
  });

  it('returns string as-is', () => {
    expect(fmt('hello')).toBe('hello');
  });

  it('joins arrays with comma', () => {
    expect(fmt(['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('converts number to string', () => {
    expect(fmt(42)).toBe('42');
  });
});

describe('truncate', () => {
  it('returns empty string for null', () => {
    expect(truncate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncate(undefined)).toBe('');
  });

  it('returns short strings unchanged', () => {
    expect(truncate('short')).toBe('short');
  });

  it('truncates long strings with ellipsis', () => {
    const long = 'a'.repeat(100);
    const result = truncate(long, 80);
    expect(result.length).toBe(81); // 80 chars + ellipsis character
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('respects custom max length', () => {
    const result = truncate('hello world', 5);
    expect(result).toBe('hello\u2026');
  });

  it('returns exact-length strings unchanged', () => {
    const exact = 'a'.repeat(80);
    expect(truncate(exact, 80)).toBe(exact);
  });
});
