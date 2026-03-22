import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  discoverMoviesByLanguage,
  discoverMoviesByLanguageAndMonth,
  getMovieDetails,
  getPersonDetails,
  getMovieImages,
  getWatchProviders,
  searchMovies,
  searchPersons,
  TMDB_IMAGE,
} from '@/lib/tmdb';

// ── Fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockJsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  };
}

// ── TMDB_IMAGE ───────────────────────────────────────────────────────────────

describe('TMDB_IMAGE', () => {
  it('builds poster URL with w500 size', () => {
    expect(TMDB_IMAGE.poster('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('builds poster original URL', () => {
    expect(TMDB_IMAGE.posterOriginal('/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/original/abc.jpg',
    );
  });

  it('builds backdrop URL with w1280 size', () => {
    expect(TMDB_IMAGE.backdrop('/bg.jpg')).toBe('https://image.tmdb.org/t/p/w1280/bg.jpg');
  });

  it('builds profile URL with w185 size', () => {
    expect(TMDB_IMAGE.profile('/face.jpg')).toBe('https://image.tmdb.org/t/p/w185/face.jpg');
  });
});

// ── discoverMoviesByLanguage ─────────────────────────────────────────────────────

describe('discoverMoviesByLanguage', () => {
  it('fetches single page of results', async () => {
    const movies = [{ id: 1, title: 'Movie 1' }];
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: movies, total_pages: 1 }));

    const result = await discoverMoviesByLanguage(2025, 'te', 'test-key');

    expect(result).toEqual(movies);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/discover/movie');
    expect(url).toContain('api_key=test-key');
    expect(url).toContain('with_original_language=te');
    expect(url).toContain('primary_release_year=2025');
    expect(url).toContain('sort_by=release_date.asc');
  });

  it('paginates through multiple pages', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 1 }], total_pages: 2 }))
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 2 }], total_pages: 2 }));

    const result = await discoverMoviesByLanguage(2025, 'te', 'key');

    expect(result).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(null, false, 401));

    await expect(discoverMoviesByLanguage(2025, 'te', 'bad-key')).rejects.toThrow(
      'TMDB /discover/movie',
    );
  });
});

// ── discoverMoviesByLanguageAndMonth ──────────────────────────────────────────────

describe('discoverMoviesByLanguageAndMonth', () => {
  it('constructs correct date range params', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: [], total_pages: 1 }));

    await discoverMoviesByLanguageAndMonth(2025, 2, 'te', 'key');

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('primary_release_date.gte=2025-02-01');
    expect(url).toContain('primary_release_date.lte=2025-02-28');
  });

  it('handles months with 31 days', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: [], total_pages: 1 }));

    await discoverMoviesByLanguageAndMonth(2025, 1, 'te', 'key');

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('primary_release_date.lte=2025-01-31');
  });

  it('handles leap year February', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: [], total_pages: 1 }));

    await discoverMoviesByLanguageAndMonth(2024, 2, 'te', 'key');

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('primary_release_date.lte=2024-02-29');
  });

  it('paginates multiple pages', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 1 }], total_pages: 2 }))
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 2 }], total_pages: 2 }));

    const result = await discoverMoviesByLanguageAndMonth(2025, 6, 'te', 'key');
    expect(result).toHaveLength(2);
  });
});

// ── getMovieDetails ──────────────────────────────────────────────────────────

describe('getMovieDetails', () => {
  it('fetches movie details with appended resources', async () => {
    const detail = { id: 123, title: 'Test Movie' };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(detail));

    const result = await getMovieDetails(123, 'key');

    expect(result).toEqual(detail);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/movie/123');
    expect(url).toContain(
      'append_to_response=credits%2Cvideos%2Cexternal_ids%2Ctranslations%2Ckeywords%2Crelease_dates',
    );
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(null, false, 404));

    await expect(getMovieDetails(999, 'key')).rejects.toThrow('TMDB /movie/999');
  });
});

// ── getPersonDetails ─────────────────────────────────────────────────────────

describe('getPersonDetails', () => {
  it('fetches person details with external_ids', async () => {
    const person = { id: 42, name: 'Actor' };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(person));

    const result = await getPersonDetails(42, 'key');

    expect(result).toEqual(person);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/person/42');
    expect(url).toContain('append_to_response=external_ids');
  });
});

// ── getMovieImages ───────────────────────────────────────────────────────────

describe('getMovieImages', () => {
  it('fetches images with language filter', async () => {
    const images = { posters: [], backdrops: [], logos: [] };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(images));

    const result = await getMovieImages(100, 'key');

    expect(result).toEqual(images);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/movie/100/images');
    expect(url).toContain('include_image_language=te%2Chi%2Cen%2Cnull');
  });
});

// ── getWatchProviders ────────────────────────────────────────────────────────

describe('getWatchProviders', () => {
  it('returns Indian flatrate providers', async () => {
    const providers = [{ provider_id: 1, provider_name: 'Netflix' }];
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: { IN: { flatrate: providers } } }));

    const result = await getWatchProviders(100, 'key');
    expect(result).toEqual(providers);
  });

  it('returns empty array when no IN data', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: { US: { flatrate: [] } } }));

    const result = await getWatchProviders(100, 'key');
    expect(result).toEqual([]);
  });

  it('returns empty array when no flatrate providers', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: { IN: { rent: [{ id: 1 }] } } }));

    const result = await getWatchProviders(100, 'key');
    expect(result).toEqual([]);
  });

  it('returns empty array when results is empty', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: {} }));

    const result = await getWatchProviders(100, 'key');
    expect(result).toEqual([]);
  });
});

// ── searchMovies ─────────────────────────────────────────────────────────────

describe('searchMovies', () => {
  it('searches with query and language filter', async () => {
    const movies = [{ id: 1, title: 'Pushpa' }];
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: movies, total_pages: 1 }));

    const result = await searchMovies('Pushpa', 'key', 'te');

    expect(result).toEqual(movies);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/search/movie');
    expect(url).toContain('query=Pushpa');
    expect(url).toContain('with_original_language=te');
  });

  it('limits to 3 pages maximum', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 1 }], total_pages: 10 }))
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 2 }], total_pages: 10 }))
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 3 }], total_pages: 10 }));

    const result = await searchMovies('test', 'key');

    expect(result).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('stops at actual total_pages if less than 3', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 1 }], total_pages: 2 }))
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 2 }], total_pages: 2 }));

    const result = await searchMovies('test', 'key');

    expect(result).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ── searchPersons ────────────────────────────────────────────────────────────

describe('searchPersons', () => {
  it('searches for persons by name', async () => {
    const persons = [{ id: 1, name: 'Actor' }];
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: persons, total_pages: 1 }));

    const result = await searchPersons('Actor', 'key');

    expect(result).toEqual(persons);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/search/person');
    expect(url).toContain('query=Actor');
  });

  it('limits to 3 pages maximum', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 1 }], total_pages: 5 }))
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 2 }], total_pages: 5 }))
      .mockResolvedValueOnce(mockJsonResponse({ results: [{ id: 3 }], total_pages: 5 }));

    const result = await searchPersons('test', 'key');

    expect(result).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does not include language filter for person search', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ results: [], total_pages: 1 }));

    await searchPersons('Test', 'key');

    const url = mockFetch.mock.calls[0][0];
    expect(url).not.toContain('with_original_language');
  });
});
