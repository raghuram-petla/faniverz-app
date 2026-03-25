import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDuration,
  formatRelativeTime,
  statusStyles,
  CURRENT_YEAR,
  YEARS,
  MONTHS,
  applyTmdbFields,
} from '@/components/sync/syncHelpers';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

describe('formatDuration', () => {
  it('returns "In progress..." when completedAt is null', () => {
    expect(formatDuration('2024-01-01T00:00:00Z', null)).toBe('In progress...');
  });

  it('formats duration in seconds when under 60s', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T00:00:45Z';
    expect(formatDuration(started, completed)).toBe('45s');
  });

  it('formats 0 seconds', () => {
    const time = '2024-01-01T00:00:00Z';
    expect(formatDuration(time, time)).toBe('0s');
  });

  it('formats duration in minutes and seconds when 60s or more', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T00:02:30Z';
    expect(formatDuration(started, completed)).toBe('2m 30s');
  });

  it('formats exact minutes with 0 remaining seconds', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T00:03:00Z';
    expect(formatDuration(started, completed)).toBe('3m 0s');
  });

  it('handles large durations', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T01:30:15Z';
    expect(formatDuration(started, completed)).toBe('90m 15s');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than 1 minute ago', () => {
    expect(formatRelativeTime('2024-06-15T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago for 1-59 minutes', () => {
    expect(formatRelativeTime('2024-06-15T11:55:00Z')).toBe('5m ago');
  });

  it('returns 1m ago for exactly 1 minute', () => {
    expect(formatRelativeTime('2024-06-15T11:59:00Z')).toBe('1m ago');
  });

  it('returns hours ago for 1-23 hours', () => {
    expect(formatRelativeTime('2024-06-15T09:00:00Z')).toBe('3h ago');
  });

  it('returns 1h ago for exactly 1 hour', () => {
    expect(formatRelativeTime('2024-06-15T11:00:00Z')).toBe('1h ago');
  });

  it('returns days ago for 24+ hours', () => {
    expect(formatRelativeTime('2024-06-13T12:00:00Z')).toBe('2d ago');
  });

  it('returns 1d ago for exactly 24 hours', () => {
    expect(formatRelativeTime('2024-06-14T12:00:00Z')).toBe('1d ago');
  });
});

describe('CURRENT_YEAR', () => {
  it('equals the current year from Date', () => {
    expect(CURRENT_YEAR).toBe(new Date().getFullYear());
  });
});

describe('YEARS', () => {
  it('starts with CURRENT_YEAR + 1', () => {
    expect(YEARS[0]).toBe(CURRENT_YEAR + 1);
  });

  it('ends with 1900', () => {
    expect(YEARS[YEARS.length - 1]).toBe(1900);
  });

  it('contains the expected number of years (CURRENT_YEAR + 2 - 1900)', () => {
    expect(YEARS).toHaveLength(CURRENT_YEAR + 2 - 1900);
  });

  it('is in descending order', () => {
    for (let i = 0; i < YEARS.length - 1; i++) {
      expect(YEARS[i]).toBeGreaterThan(YEARS[i + 1]);
    }
  });
});

describe('MONTHS', () => {
  it('contains 12 months', () => {
    expect(MONTHS).toHaveLength(12);
  });

  it('starts with January', () => {
    expect(MONTHS[0]).toBe('January');
  });

  it('ends with December', () => {
    expect(MONTHS[11]).toBe('December');
  });

  it('contains all month names', () => {
    const expected = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    expect(MONTHS).toEqual(expected);
  });
});

describe('statusStyles', () => {
  it('has running, success, and failed keys', () => {
    expect(Object.keys(statusStyles)).toEqual(['running', 'success', 'failed']);
  });

  it('has correct running style', () => {
    expect(statusStyles.running).toEqual({
      bg: 'bg-blue-600/20',
      text: 'text-status-blue',
    });
  });

  it('has correct success style', () => {
    expect(statusStyles.success).toEqual({
      bg: 'bg-green-600/20',
      text: 'text-status-green',
    });
  });

  it('has correct failed style', () => {
    expect(statusStyles.failed).toEqual({
      bg: 'bg-red-600/20',
      text: 'text-status-red',
    });
  });

  it('each entry has bg and text properties', () => {
    for (const style of Object.values(statusStyles)) {
      expect(style).toHaveProperty('bg');
      expect(style).toHaveProperty('text');
    }
  });
});

// ── applyTmdbFields ──────────────────────────────────────────────────────────

function makeMovie(overrides: Partial<ExistingMovieData> = {}): ExistingMovieData {
  return {
    id: 'movie-1',
    tmdb_id: 101,
    title: 'Old Title',
    synopsis: 'Old synopsis',
    release_date: '2020-01-01',
    poster_url: '/old-poster.jpg',
    backdrop_url: '/old-backdrop.jpg',
    director: 'Old Director',
    runtime: 90,
    genres: ['Drama'],
    imdb_id: null,
    title_te: null,
    synopsis_te: null,
    tagline: null,
    tmdb_status: null,
    tmdb_vote_average: null,
    tmdb_vote_count: null,
    budget: null,
    revenue: null,
    certification: null,
    spoken_languages: null,
    ...overrides,
  };
}

function makeTmdb(overrides: Partial<LookupMovieData> = {}): LookupMovieData {
  return {
    tmdbId: 101,
    title: 'TMDB Title',
    overview: 'TMDB overview',
    releaseDate: '2025-06-01',
    runtime: 150,
    genres: ['Action', 'Thriller'],
    posterUrl: '/tmdb-poster.jpg',
    backdropUrl: '/tmdb-backdrop.jpg',
    director: 'TMDB Director',
    castCount: 10,
    crewCount: 5,
    posterCount: 3,
    backdropCount: 2,
    videoCount: 4,
    providerNames: ['Netflix', 'Hotstar'],
    keywordCount: 6,
    imdbId: 'tt99999',
    titleTe: 'తెలుగు టైటిల్',
    synopsisTe: 'తెలుగు సినాప్సిస్',
    tagline: 'A great tagline',
    tmdbStatus: 'Released',
    tmdbVoteAverage: 8.5,
    tmdbVoteCount: 1000,
    budget: 50000000,
    revenue: 200000000,
    certification: 'UA',
    spokenLanguages: ['te', 'en'],
    productionCompanyCount: 3,
    originalLanguage: 'te',
    dbPosterCount: 0,
    dbBackdropCount: 0,
    dbVideoCount: 0,
    dbKeywordCount: 0,
    dbProductionHouseCount: 0,
    dbPlatformNames: [],
    ...overrides,
  };
}

describe('applyTmdbFields', () => {
  it('applies title field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['title']);
    expect(movie.title).toBe('TMDB Title');
  });

  it('applies synopsis field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['synopsis']);
    expect(movie.synopsis).toBe('TMDB overview');
  });

  it('applies release_date field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['release_date']);
    expect(movie.release_date).toBe('2025-06-01');
  });

  it('applies poster_url field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['poster_url']);
    expect(movie.poster_url).toBe('/tmdb-poster.jpg');
  });

  it('applies backdrop_url field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['backdrop_url']);
    expect(movie.backdrop_url).toBe('/tmdb-backdrop.jpg');
  });

  it('applies director field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['director']);
    expect(movie.director).toBe('TMDB Director');
  });

  it('applies runtime field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['runtime']);
    expect(movie.runtime).toBe(150);
  });

  it('applies genres field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['genres']);
    expect(movie.genres).toEqual(['Action', 'Thriller']);
  });

  it('applies videos field (sets dbVideoCount)', () => {
    const { tmdb } = applyTmdbFields(makeMovie(), makeTmdb(), ['videos']);
    expect(tmdb.dbVideoCount).toBe(4);
  });

  it('applies images field (sets dbPosterCount and dbBackdropCount)', () => {
    const { tmdb } = applyTmdbFields(makeMovie(), makeTmdb(), ['images']);
    expect(tmdb.dbPosterCount).toBe(3);
    expect(tmdb.dbBackdropCount).toBe(2);
  });

  it('applies keywords field (sets dbKeywordCount)', () => {
    const { tmdb } = applyTmdbFields(makeMovie(), makeTmdb(), ['keywords']);
    expect(tmdb.dbKeywordCount).toBe(6);
  });

  it('applies watch_providers field (sets dbPlatformNames)', () => {
    const { tmdb } = applyTmdbFields(makeMovie(), makeTmdb(), ['watch_providers']);
    expect(tmdb.dbPlatformNames).toEqual(['Netflix', 'Hotstar']);
  });

  it('applies production_companies field (sets dbProductionHouseCount)', () => {
    const { tmdb } = applyTmdbFields(makeMovie(), makeTmdb(), ['production_companies']);
    expect(tmdb.dbProductionHouseCount).toBe(3);
  });

  it('applies imdb_id field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['imdb_id']);
    expect(movie.imdb_id).toBe('tt99999');
  });

  it('applies title_te field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['title_te']);
    expect(movie.title_te).toBe('తెలుగు టైటిల్');
  });

  it('applies synopsis_te field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['synopsis_te']);
    expect(movie.synopsis_te).toBe('తెలుగు సినాప్సిస్');
  });

  it('applies tagline field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['tagline']);
    expect(movie.tagline).toBe('A great tagline');
  });

  it('applies tmdb_status field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['tmdb_status']);
    expect(movie.tmdb_status).toBe('Released');
  });

  it('applies tmdb_ratings field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['tmdb_ratings']);
    expect(movie.tmdb_vote_average).toBe(8.5);
    expect(movie.tmdb_vote_count).toBe(1000);
  });

  it('applies budget_revenue field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['budget_revenue']);
    expect(movie.budget).toBe(50000000);
    expect(movie.revenue).toBe(200000000);
  });

  it('applies certification_auto field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['certification_auto']);
    expect(movie.certification).toBe('UA');
  });

  it('applies spoken_languages field', () => {
    const { movie } = applyTmdbFields(makeMovie(), makeTmdb(), ['spoken_languages']);
    expect(movie.spoken_languages).toEqual(['te', 'en']);
  });

  it('applies multiple fields at once', () => {
    const { movie, tmdb } = applyTmdbFields(makeMovie(), makeTmdb(), [
      'title',
      'synopsis',
      'videos',
      'images',
    ]);
    expect(movie.title).toBe('TMDB Title');
    expect(movie.synopsis).toBe('TMDB overview');
    expect(tmdb.dbVideoCount).toBe(4);
    expect(tmdb.dbPosterCount).toBe(3);
  });

  it('does not modify original movie or tmdb objects', () => {
    const original = makeMovie();
    const tmdb = makeTmdb();
    applyTmdbFields(original, tmdb, ['title']);
    expect(original.title).toBe('Old Title');
  });

  it('ignores unknown fields', () => {
    const movie = makeMovie();
    const tmdb = makeTmdb();
    const { movie: updated } = applyTmdbFields(movie, tmdb, ['unknown_field']);
    expect(updated.title).toBe('Old Title');
  });
});
