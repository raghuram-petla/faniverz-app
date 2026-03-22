import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  formatDuration,
  formatRelativeTime,
  applyTmdbFields,
  CURRENT_YEAR,
  YEARS,
  MONTHS,
  statusStyles,
} from '@/components/sync/syncHelpers';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

describe('formatDuration', () => {
  it('returns "In progress..." when completedAt is null', () => {
    expect(formatDuration('2024-01-01T00:00:00', null)).toBe('In progress...');
  });

  it('returns seconds for durations under 60s', () => {
    expect(formatDuration('2024-01-01T00:00:00', '2024-01-01T00:00:45')).toBe('45s');
  });

  it('returns "0s" for zero duration', () => {
    expect(formatDuration('2024-01-01T00:00:00', '2024-01-01T00:00:00')).toBe('0s');
  });

  it('returns minutes and seconds for durations >= 60s', () => {
    expect(formatDuration('2024-01-01T00:00:00', '2024-01-01T00:01:30')).toBe('1m 30s');
  });

  it('returns minutes and 0s when even minutes', () => {
    expect(formatDuration('2024-01-01T00:00:00', '2024-01-01T00:02:00')).toBe('2m 0s');
  });

  it('handles longer durations', () => {
    expect(formatDuration('2024-01-01T00:00:00', '2024-01-01T00:10:05')).toBe('10m 5s');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than 1 minute ago', () => {
    const date = new Date('2024-06-01T11:59:30Z').toISOString();
    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('returns minutes ago for less than 60 minutes', () => {
    const date = new Date('2024-06-01T11:30:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('30m ago');
  });

  it('returns 1m ago for exactly 1 minute', () => {
    const date = new Date('2024-06-01T11:59:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('1m ago');
  });

  it('returns hours ago for less than 24 hours', () => {
    const date = new Date('2024-06-01T06:00:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('6h ago');
  });

  it('returns days ago for 24+ hours', () => {
    const date = new Date('2024-05-30T12:00:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('2d ago');
  });

  it('returns 1h ago for exactly 60 minutes', () => {
    const date = new Date('2024-06-01T11:00:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('1h ago');
  });
});

describe('applyTmdbFields', () => {
  const baseMovie: ExistingMovieData = {
    id: 'movie-1',
    tmdb_id: 123,
    title: 'Old Title',
    synopsis: null,
    poster_url: null,
    backdrop_url: null,
    trailer_url: null,
    director: null,
    runtime: null,
    genres: null,
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
  };

  const tmdb: LookupMovieData = {
    title: 'New Title',
    overview: 'Great movie',
    posterUrl: 'https://img.tmdb.org/poster.jpg',
    backdropUrl: 'https://img.tmdb.org/backdrop.jpg',
    trailerUrl: 'https://youtube.com/trailer',
    director: 'Director Name',
    runtime: 120,
    genres: ['Action', 'Drama'],
  } as LookupMovieData;

  it('does not mutate original movie', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['title']);
    expect(result).not.toBe(baseMovie);
    expect(baseMovie.title).toBe('Old Title');
  });

  it('applies title field', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['title']);
    expect(result.title).toBe('New Title');
  });

  it('applies synopsis field from overview', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['synopsis']);
    expect(result.synopsis).toBe('Great movie');
  });

  it('applies poster_url field', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['poster_url']);
    expect(result.poster_url).toBe('https://img.tmdb.org/poster.jpg');
  });

  it('applies backdrop_url field', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['backdrop_url']);
    expect(result.backdrop_url).toBe('https://img.tmdb.org/backdrop.jpg');
  });

  it('applies trailer_url field', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['trailer_url']);
    expect(result.trailer_url).toBe('https://youtube.com/trailer');
  });

  it('applies director field', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['director']);
    expect(result.director).toBe('Director Name');
  });

  it('applies runtime field', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['runtime']);
    expect(result.runtime).toBe(120);
  });

  it('applies genres field', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['genres']);
    expect(result.genres).toEqual(['Action', 'Drama']);
  });

  it('applies multiple fields at once', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['title', 'synopsis', 'poster_url']);
    expect(result.title).toBe('New Title');
    expect(result.synopsis).toBe('Great movie');
    expect(result.poster_url).toBe('https://img.tmdb.org/poster.jpg');
  });

  it('ignores unknown fields without error', () => {
    const result = applyTmdbFields(baseMovie, tmdb, ['unknown_field']);
    expect(result).toEqual(baseMovie);
  });

  it('returns movie unchanged for empty fields array', () => {
    const result = applyTmdbFields(baseMovie, tmdb, []);
    expect(result).toEqual(baseMovie);
  });
});

describe('constants', () => {
  it('CURRENT_YEAR is a valid year', () => {
    expect(CURRENT_YEAR).toBeGreaterThan(2000);
    expect(CURRENT_YEAR).toBeLessThanOrEqual(new Date().getFullYear() + 1);
  });

  it('YEARS array starts with next year and extends to 1900', () => {
    expect(YEARS[0]).toBe(CURRENT_YEAR + 1);
    expect(YEARS[YEARS.length - 1]).toBe(1900);
  });

  it('YEARS has the correct length', () => {
    expect(YEARS.length).toBe(CURRENT_YEAR + 2 - 1900);
  });

  it('MONTHS has 12 entries', () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe('January');
    expect(MONTHS[11]).toBe('December');
  });

  it('statusStyles has correct keys', () => {
    expect(statusStyles).toHaveProperty('running');
    expect(statusStyles).toHaveProperty('success');
    expect(statusStyles).toHaveProperty('failed');
  });

  it('statusStyles values have bg and text', () => {
    expect(statusStyles.running).toHaveProperty('bg');
    expect(statusStyles.running).toHaveProperty('text');
    expect(statusStyles.success).toHaveProperty('bg');
    expect(statusStyles.failed).toHaveProperty('text');
  });
});
