import { describe, it, expect } from 'vitest';
import { extractYouTubeId, getStatus, buildFieldDefs, fmt, truncate } from '../fieldDiffHelpers';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

// ── Minimal fixtures ───────────────────────────────────────────────────────────

function makeMovie(overrides: Partial<ExistingMovieData> = {}): ExistingMovieData {
  return {
    id: 'movie-1',
    title: 'Test Movie',
    synopsis: null,
    poster_url: null,
    backdrop_url: null,
    director: null,
    runtime: null,
    genres: null,
    poster_count: 0,
    backdrop_count: 0,
    video_count: 0,
    platform_names: [],
    keyword_count: 0,
    imdb_id: null,
    title_te: null,
    synopsis_te: null,
    tagline: null,
    tmdb_id: 12345,
    tmdb_status: null,
    tmdb_vote_average: null,
    tmdb_vote_count: null,
    budget: null,
    revenue: null,
    certification: null,
    production_house_count: 0,
    spoken_languages: null,
    ...overrides,
  };
}

function makeTmdb(overrides: Partial<LookupMovieData> = {}): LookupMovieData {
  return {
    title: 'Test Movie',
    overview: null,
    posterUrl: null,
    backdropUrl: null,
    director: null,
    runtime: null,
    genres: [],
    posterCount: 0,
    backdropCount: 0,
    videoCount: 0,
    providerNames: [],
    keywordCount: 0,
    imdbId: null,
    titleTe: null,
    synopsisTe: null,
    tagline: null,
    tmdbStatus: null,
    tmdbVoteAverage: null,
    tmdbVoteCount: null,
    budget: null,
    revenue: null,
    certification: null,
    productionCompanyCount: 0,
    spokenLanguages: null,
    castCount: 5,
    crewCount: 3,
    ...overrides,
  };
}

// ── extractYouTubeId ──────────────────────────────────────────────────────────

describe('extractYouTubeId', () => {
  it('returns null for null input', () => {
    expect(extractYouTubeId(null)).toBeNull();
  });

  it('extracts ID from watch?v= format', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from youtu.be/ format', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed/ format', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-youtube url', () => {
    expect(extractYouTubeId('https://vimeo.com/12345')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });
});

// ── fmt ───────────────────────────────────────────────────────────────────────

describe('fmt', () => {
  it('returns empty string for null', () => {
    expect(fmt(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(fmt(undefined)).toBe('');
  });
  it('joins array values', () => {
    expect(fmt(['Action', 'Drama'])).toBe('Action, Drama');
  });
  it('converts number to string', () => {
    expect(fmt(42)).toBe('42');
  });
  it('returns string as-is', () => {
    expect(fmt('hello')).toBe('hello');
  });
});

// ── truncate ─────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns empty string for null', () => {
    expect(truncate(null)).toBe('');
  });
  it('returns short strings unchanged', () => {
    expect(truncate('short')).toBe('short');
  });
  it('truncates long strings with ellipsis', () => {
    const long = 'a'.repeat(90);
    const result = truncate(long, 80);
    expect(result.length).toBe(81); // 80 chars + '…'
    expect(result.endsWith('…')).toBe(true);
  });
  it('respects custom length', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });
});

// ── getStatus — title ─────────────────────────────────────────────────────────

describe('getStatus — title', () => {
  it('returns same when both null', () => {
    const movie = makeMovie({ title: null as unknown as string });
    const tmdb = makeTmdb({ title: null as unknown as string });
    expect(getStatus(movie, tmdb, 'title')).toBe('same');
  });

  it('returns missing when db title is null', () => {
    const movie = makeMovie({ title: null as unknown as string });
    const tmdb = makeTmdb({ title: 'Movie Title' });
    expect(getStatus(movie, tmdb, 'title')).toBe('missing');
  });

  it('returns changed when titles differ', () => {
    const movie = makeMovie({ title: 'Old Title' });
    const tmdb = makeTmdb({ title: 'New Title' });
    expect(getStatus(movie, tmdb, 'title')).toBe('changed');
  });

  it('returns same when titles match', () => {
    const movie = makeMovie({ title: 'Same Title' });
    const tmdb = makeTmdb({ title: 'Same Title' });
    expect(getStatus(movie, tmdb, 'title')).toBe('same');
  });
});

// ── getStatus — synopsis ──────────────────────────────────────────────────────

describe('getStatus — synopsis', () => {
  it('returns missing when db synopsis null but tmdb has overview', () => {
    expect(
      getStatus(makeMovie({ synopsis: null }), makeTmdb({ overview: 'text' }), 'synopsis'),
    ).toBe('missing');
  });
  it('returns changed when texts differ', () => {
    expect(
      getStatus(makeMovie({ synopsis: 'old' }), makeTmdb({ overview: 'new' }), 'synopsis'),
    ).toBe('changed');
  });
  it('returns same when texts match', () => {
    expect(
      getStatus(makeMovie({ synopsis: 'text' }), makeTmdb({ overview: 'text' }), 'synopsis'),
    ).toBe('same');
  });
});

// ── getStatus — poster_url / backdrop_url ──────────────────────────────────────

describe('getStatus — poster_url', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'poster_url')).toBe('same');
  });
  it('returns missing when db null but tmdb has url', () => {
    expect(getStatus(makeMovie(), makeTmdb({ posterUrl: '/path.jpg' }), 'poster_url')).toBe(
      'missing',
    );
  });
  it('returns same when db has url (cannot compare)', () => {
    expect(
      getStatus(
        makeMovie({ poster_url: '/db.jpg' }),
        makeTmdb({ posterUrl: '/tmdb.jpg' }),
        'poster_url',
      ),
    ).toBe('same');
  });
});

describe('getStatus — backdrop_url', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'backdrop_url')).toBe('same');
  });
  it('returns missing when db null but tmdb has url', () => {
    expect(getStatus(makeMovie(), makeTmdb({ backdropUrl: '/back.jpg' }), 'backdrop_url')).toBe(
      'missing',
    );
  });
  it('returns same when db has url', () => {
    expect(
      getStatus(
        makeMovie({ backdrop_url: '/db.jpg' }),
        makeTmdb({ backdropUrl: '/tmdb.jpg' }),
        'backdrop_url',
      ),
    ).toBe('same');
  });
});

// ── getStatus — director ──────────────────────────────────────────────────────

describe('getStatus — director', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'director')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ director: 'SS Rajamouli' }), 'director')).toBe(
      'missing',
    );
  });
  it('returns changed when names differ', () => {
    expect(
      getStatus(
        makeMovie({ director: 'Old Director' }),
        makeTmdb({ director: 'New Director' }),
        'director',
      ),
    ).toBe('changed');
  });
  it('returns same when names match', () => {
    expect(
      getStatus(makeMovie({ director: 'Same' }), makeTmdb({ director: 'Same' }), 'director'),
    ).toBe('same');
  });
});

// ── getStatus — runtime ────────────────────────────────────────────────────────

describe('getStatus — runtime', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'runtime')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ runtime: 150 }), 'runtime')).toBe('missing');
  });
  it('treats tmdb runtime=0 as null (same)', () => {
    expect(getStatus(makeMovie(), makeTmdb({ runtime: 0 }), 'runtime')).toBe('same');
  });
  it('returns changed when runtimes differ', () => {
    expect(getStatus(makeMovie({ runtime: 120 }), makeTmdb({ runtime: 150 }), 'runtime')).toBe(
      'changed',
    );
  });
  it('returns same when runtimes match', () => {
    expect(getStatus(makeMovie({ runtime: 150 }), makeTmdb({ runtime: 150 }), 'runtime')).toBe(
      'same',
    );
  });
});

// ── getStatus — genres ────────────────────────────────────────────────────────

describe('getStatus — genres', () => {
  it('returns same when both empty', () => {
    expect(getStatus(makeMovie({ genres: null }), makeTmdb({ genres: [] }), 'genres')).toBe('same');
  });
  it('returns missing when db empty but tmdb has genres', () => {
    expect(getStatus(makeMovie({ genres: null }), makeTmdb({ genres: ['Action'] }), 'genres')).toBe(
      'missing',
    );
  });
  it('returns same regardless of order', () => {
    expect(
      getStatus(
        makeMovie({ genres: ['Drama', 'Action'] }),
        makeTmdb({ genres: ['Action', 'Drama'] }),
        'genres',
      ),
    ).toBe('same');
  });
  it('returns changed when genres differ', () => {
    expect(
      getStatus(makeMovie({ genres: ['Action'] }), makeTmdb({ genres: ['Drama'] }), 'genres'),
    ).toBe('changed');
  });
});

// ── getStatus — images ────────────────────────────────────────────────────────

describe('getStatus — images', () => {
  it('returns same when tmdb has no images', () => {
    expect(getStatus(makeMovie(), makeTmdb({ posterCount: 0, backdropCount: 0 }), 'images')).toBe(
      'same',
    );
  });
  it('returns missing when db counts are lower', () => {
    expect(
      getStatus(
        makeMovie({ poster_count: 0 }),
        makeTmdb({ posterCount: 5, backdropCount: 3 }),
        'images',
      ),
    ).toBe('missing');
  });
  it('returns same when db counts meet tmdb counts', () => {
    expect(
      getStatus(
        makeMovie({ poster_count: 5, backdrop_count: 3 }),
        makeTmdb({ posterCount: 5, backdropCount: 3 }),
        'images',
      ),
    ).toBe('same');
  });
});

// ── getStatus — videos / watch_providers / keywords ──────────────────────────

describe('getStatus — videos', () => {
  it('returns same when tmdb has no videos', () => {
    expect(getStatus(makeMovie(), makeTmdb({ videoCount: 0 }), 'videos')).toBe('same');
  });
  it('returns missing when db has fewer', () => {
    expect(getStatus(makeMovie({ video_count: 0 }), makeTmdb({ videoCount: 3 }), 'videos')).toBe(
      'missing',
    );
  });
  it('returns same when db count meets tmdb', () => {
    expect(getStatus(makeMovie({ video_count: 3 }), makeTmdb({ videoCount: 3 }), 'videos')).toBe(
      'same',
    );
  });
});

describe('getStatus — watch_providers', () => {
  it('returns same when tmdb has no providers', () => {
    expect(getStatus(makeMovie(), makeTmdb({ providerNames: [] }), 'watch_providers')).toBe('same');
  });
  it('returns missing when db has fewer', () => {
    expect(
      getStatus(
        makeMovie({ platform_names: [] }),
        makeTmdb({ providerNames: ['Netflix', 'Hulu'] }),
        'watch_providers',
      ),
    ).toBe('missing');
  });
});

describe('getStatus — keywords', () => {
  it('returns same when tmdb has no keywords', () => {
    expect(getStatus(makeMovie(), makeTmdb({ keywordCount: 0 }), 'keywords')).toBe('same');
  });
  it('returns missing when db has fewer', () => {
    expect(
      getStatus(makeMovie({ keyword_count: 0 }), makeTmdb({ keywordCount: 10 }), 'keywords'),
    ).toBe('missing');
  });
});

// ── getStatus — imdb_id / title_te / synopsis_te / tagline / tmdb_status ─────

describe('getStatus — imdb_id', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'imdb_id')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ imdbId: 'tt123' }), 'imdb_id')).toBe('missing');
  });
  it('returns changed when different', () => {
    expect(
      getStatus(makeMovie({ imdb_id: 'tt111' }), makeTmdb({ imdbId: 'tt222' }), 'imdb_id'),
    ).toBe('changed');
  });
  it('returns same when matching', () => {
    expect(
      getStatus(makeMovie({ imdb_id: 'tt111' }), makeTmdb({ imdbId: 'tt111' }), 'imdb_id'),
    ).toBe('same');
  });
});

describe('getStatus — title_te', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'title_te')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ titleTe: 'తెలుగు' }), 'title_te')).toBe('missing');
  });
  it('returns changed when different', () => {
    expect(
      getStatus(makeMovie({ title_te: 'old' }), makeTmdb({ titleTe: 'new' }), 'title_te'),
    ).toBe('changed');
  });
});

describe('getStatus — synopsis_te', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'synopsis_te')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ synopsisTe: 'text' }), 'synopsis_te')).toBe('missing');
  });
});

describe('getStatus — tagline', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'tagline')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ tagline: 'A cool tagline' }), 'tagline')).toBe(
      'missing',
    );
  });
  it('returns changed when different', () => {
    expect(getStatus(makeMovie({ tagline: 'old' }), makeTmdb({ tagline: 'new' }), 'tagline')).toBe(
      'changed',
    );
  });
});

describe('getStatus — tmdb_status', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'tmdb_status')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ tmdbStatus: 'Released' }), 'tmdb_status')).toBe(
      'missing',
    );
  });
});

// ── getStatus — tmdb_ratings ─────────────────────────────────────────────────

describe('getStatus — tmdb_ratings', () => {
  it('returns same when both null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'tmdb_ratings')).toBe('same');
  });
  it('returns missing when db null', () => {
    expect(getStatus(makeMovie(), makeTmdb({ tmdbVoteAverage: 7.5 }), 'tmdb_ratings')).toBe(
      'missing',
    );
  });
  it('returns changed when different', () => {
    expect(
      getStatus(
        makeMovie({ tmdb_vote_average: 7.0 }),
        makeTmdb({ tmdbVoteAverage: 8.0 }),
        'tmdb_ratings',
      ),
    ).toBe('changed');
  });
  it('returns same when matching', () => {
    expect(
      getStatus(
        makeMovie({ tmdb_vote_average: 7.5 }),
        makeTmdb({ tmdbVoteAverage: 7.5 }),
        'tmdb_ratings',
      ),
    ).toBe('same');
  });
});

// ── getStatus — budget_revenue ────────────────────────────────────────────────

describe('getStatus — budget_revenue', () => {
  it('returns same when all null', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'budget_revenue')).toBe('same');
  });
  it('returns missing when db null but tmdb has data', () => {
    expect(
      getStatus(makeMovie(), makeTmdb({ budget: 100000000, revenue: 500000000 }), 'budget_revenue'),
    ).toBe('missing');
  });
  it('returns changed when values differ', () => {
    expect(
      getStatus(
        makeMovie({ budget: 100, revenue: 200 }),
        makeTmdb({ budget: 300, revenue: 400 }),
        'budget_revenue',
      ),
    ).toBe('changed');
  });
  it('returns same when values match', () => {
    expect(
      getStatus(
        makeMovie({ budget: 100, revenue: 200 }),
        makeTmdb({ budget: 100, revenue: 200 }),
        'budget_revenue',
      ),
    ).toBe('same');
  });
});

// ── getStatus — certification_auto ───────────────────────────────────────────

describe('getStatus — certification_auto', () => {
  it('returns same when tmdb has no cert', () => {
    expect(getStatus(makeMovie(), makeTmdb({ certification: null }), 'certification_auto')).toBe(
      'same',
    );
  });
  it('returns missing when db null and tmdb has cert', () => {
    expect(getStatus(makeMovie(), makeTmdb({ certification: 'U/A' }), 'certification_auto')).toBe(
      'missing',
    );
  });
  it('returns changed when different', () => {
    expect(
      getStatus(
        makeMovie({ certification: 'U' }),
        makeTmdb({ certification: 'A' }),
        'certification_auto',
      ),
    ).toBe('changed');
  });
  it('returns same when matching', () => {
    expect(
      getStatus(
        makeMovie({ certification: 'U/A' }),
        makeTmdb({ certification: 'U/A' }),
        'certification_auto',
      ),
    ).toBe('same');
  });
});

// ── getStatus — production_companies ─────────────────────────────────────────

describe('getStatus — production_companies', () => {
  it('returns same when tmdb has 0', () => {
    expect(
      getStatus(makeMovie(), makeTmdb({ productionCompanyCount: 0 }), 'production_companies'),
    ).toBe('same');
  });
  it('returns missing when db has fewer', () => {
    expect(
      getStatus(
        makeMovie({ production_house_count: 0 }),
        makeTmdb({ productionCompanyCount: 2 }),
        'production_companies',
      ),
    ).toBe('missing');
  });
  it('returns same when db meets tmdb count', () => {
    expect(
      getStatus(
        makeMovie({ production_house_count: 2 }),
        makeTmdb({ productionCompanyCount: 2 }),
        'production_companies',
      ),
    ).toBe('same');
  });
});

// ── getStatus — spoken_languages ──────────────────────────────────────────────

describe('getStatus — spoken_languages', () => {
  it('returns same when both empty', () => {
    expect(
      getStatus(
        makeMovie({ spoken_languages: null }),
        makeTmdb({ spokenLanguages: null }),
        'spoken_languages',
      ),
    ).toBe('same');
  });
  it('returns missing when db empty and tmdb has data', () => {
    expect(
      getStatus(
        makeMovie({ spoken_languages: null }),
        makeTmdb({ spokenLanguages: ['te', 'en'] }),
        'spoken_languages',
      ),
    ).toBe('missing');
  });
  it('returns same regardless of order', () => {
    expect(
      getStatus(
        makeMovie({ spoken_languages: ['en', 'te'] }),
        makeTmdb({ spokenLanguages: ['te', 'en'] }),
        'spoken_languages',
      ),
    ).toBe('same');
  });
  it('returns changed when different', () => {
    expect(
      getStatus(
        makeMovie({ spoken_languages: ['te'] }),
        makeTmdb({ spokenLanguages: ['hi'] }),
        'spoken_languages',
      ),
    ).toBe('changed');
  });
});

// ── getStatus — cast ──────────────────────────────────────────────────────────

describe('getStatus — cast', () => {
  it('always returns missing', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'cast')).toBe('missing');
  });
});

// ── getStatus — default fallthrough ──────────────────────────────────────────

describe('getStatus — unknown field', () => {
  it('returns missing for unrecognized field key', () => {
    expect(getStatus(makeMovie(), makeTmdb(), 'unknown_field' as never)).toBe('missing');
  });
});

// ── buildFieldDefs ────────────────────────────────────────────────────────────

describe('buildFieldDefs', () => {
  it('returns array with expected field keys', () => {
    const defs = buildFieldDefs(makeMovie(), makeTmdb());
    const keys = defs.map((d) => d.key);
    expect(keys).toContain('title');
    expect(keys).toContain('synopsis');
    expect(keys).toContain('genres');
    expect(keys).toContain('imdb_id');
    expect(keys).toContain('budget_revenue');
  });

  it('shows ✓ set for db poster when present', () => {
    const defs = buildFieldDefs(makeMovie({ poster_url: '/poster.jpg' }), makeTmdb());
    const posterDef = defs.find((d) => d.key === 'poster_url')!;
    expect(posterDef.dbDisplay).toBe('✓ set');
  });

  it('shows empty string for db poster when null', () => {
    const defs = buildFieldDefs(makeMovie({ poster_url: null }), makeTmdb());
    const posterDef = defs.find((d) => d.key === 'poster_url')!;
    expect(posterDef.dbDisplay).toBe('');
  });

  it('shows rating display when tmdb has vote_average', () => {
    const defs = buildFieldDefs(
      makeMovie({ tmdb_vote_average: 7.5, tmdb_vote_count: 1000 }),
      makeTmdb({ tmdbVoteAverage: 8.0, tmdbVoteCount: 2000 }),
    );
    const ratingDef = defs.find((d) => d.key === 'tmdb_ratings')!;
    expect(ratingDef.dbDisplay).toContain('7.5');
    expect(ratingDef.tmdbDisplay).toContain('8');
  });

  it('shows budget/revenue display when both set', () => {
    const defs = buildFieldDefs(
      makeMovie({ budget: 50000000, revenue: 200000000 }),
      makeTmdb({ budget: 50000000, revenue: 200000000 }),
    );
    const budgetDef = defs.find((d) => d.key === 'budget_revenue')!;
    expect(budgetDef.dbDisplay).toContain('50,000,000');
  });
});
