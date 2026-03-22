import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TmdbImage } from '../../lib/tmdbTypes';

vi.mock('../../lib/tmdb', () => ({
  getMovieImages: vi.fn(),
  TMDB_IMAGE: {
    poster: (path: string) => `https://image.tmdb.org/t/p/w500${path}`,
    backdrop: (path: string) => `https://image.tmdb.org/t/p/w1280${path}`,
  },
}));

vi.mock('../../lib/r2-sync', () => ({
  uploadImageFromUrl: vi.fn(),
  R2_BUCKETS: {
    moviePosters: 'faniverz-movie-posters',
    movieBackdrops: 'faniverz-movie-backdrops',
    actorPhotos: 'faniverz-actor-photos',
  },
}));

import { syncPosters, syncBackdrops, syncAllImages } from '../../lib/sync-images';
import { getMovieImages } from '../../lib/tmdb';
import { uploadImageFromUrl } from '../../lib/r2-sync';

const mockGetMovieImages = vi.mocked(getMovieImages);
const mockUpload = vi.mocked(uploadImageFromUrl);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(): any {
  const chainState = {
    selectData: null as unknown[] | null,
  };
  const mock = {
    _chainState: chainState,
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  // Default: existing paths query returns empty set (no existing images)
  mock.not.mockImplementation(() => {
    return { data: chainState.selectData ?? [], error: null };
  });
  return mock;
}

function makePoster(overrides: Partial<TmdbImage> = {}): TmdbImage {
  return {
    file_path: '/poster1.jpg',
    width: 500,
    height: 750,
    iso_639_1: 'en',
    vote_average: 5.0,
    ...overrides,
  };
}

function makeBackdrop(overrides: Partial<TmdbImage> = {}): TmdbImage {
  return {
    file_path: '/backdrop1.jpg',
    width: 1280,
    height: 720,
    iso_639_1: null,
    vote_average: 5.0,
    ...overrides,
  };
}

const MOVIE_ID = 'movie-uuid-123';
const TMDB_ID = 99999;

describe('syncPosters', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    mockUpload.mockImplementation(async (_url, _bucket, key) => `https://r2.example.com/${key}`);
  });

  it('returns 0 for empty posters array', async () => {
    const result = await syncPosters(MOVIE_ID, TMDB_ID, { posters: [] }, supabase as never);
    expect(result).toBe(0);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('prioritizes Telugu poster as main over English and Hindi', async () => {
    const posters = [
      makePoster({ file_path: '/en.jpg', iso_639_1: 'en', vote_average: 9.0 }),
      makePoster({ file_path: '/te.jpg', iso_639_1: 'te', vote_average: 3.0 }),
      makePoster({ file_path: '/hi.jpg', iso_639_1: 'hi', vote_average: 7.0 }),
    ];

    const result = await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    expect(result).toBe(3);
    // First upload should be Telugu poster (index 0 after sort)
    expect(mockUpload).toHaveBeenCalledTimes(3);
    expect(mockUpload.mock.calls[0][0]).toBe('https://image.tmdb.org/t/p/w500/te.jpg');
  });

  it('uploads to R2 and inserts into DB for each poster', async () => {
    const posters = [makePoster({ file_path: '/only.jpg', iso_639_1: 'te', vote_average: 8.0 })];

    await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    expect(mockUpload).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/w500/only.jpg',
      'faniverz-movie-posters',
      expect.stringMatching(/^[0-9a-f-]+\.jpg$/),
    );
    expect(supabase.from).toHaveBeenCalledWith('movie_images');
    expect(supabase.insert).toHaveBeenCalled();
  });

  it('updates movies.poster_url for the main poster', async () => {
    const posters = [makePoster({ file_path: '/main.jpg', iso_639_1: 'te' })];

    await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    // Should call update on movies table for poster_url
    expect(supabase.from).toHaveBeenCalledWith('movies');
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ poster_url: expect.any(String) }),
    );
  });

  it('inserts non-main posters with is_main false', async () => {
    const posters = [
      makePoster({ file_path: '/te.jpg', iso_639_1: 'te', vote_average: 8.0 }),
      makePoster({ file_path: '/en.jpg', iso_639_1: 'en', vote_average: 5.0 }),
    ];

    await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_main_poster: false, display_order: 1 }),
    );
  });

  it('syncs all posters without limit', async () => {
    const posters = Array.from({ length: 25 }, (_, i) =>
      makePoster({ file_path: `/p${i}.jpg`, vote_average: 25 - i }),
    );

    const result = await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    expect(result).toBe(25);
    expect(mockUpload).toHaveBeenCalledTimes(25);
  });

  it('skips already-synced posters (additive behavior)', async () => {
    // Simulate 2 posters where 1 already exists in DB
    const posters = [
      makePoster({ file_path: '/existing.jpg', iso_639_1: 'te', vote_average: 9.0 }),
      makePoster({ file_path: '/new.jpg', iso_639_1: 'en', vote_average: 5.0 }),
    ];

    // Return existing path from getExistingPaths query
    supabase.not.mockImplementation(() => ({
      data: [{ tmdb_file_path: '/existing.jpg' }],
      error: null,
    }));

    const result = await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    // Only the new poster should be uploaded
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload.mock.calls[0][0]).toBe('https://image.tmdb.org/t/p/w500/new.jpg');
    // Count includes both existing + new
    expect(result).toBe(2);
  });

  it('skips all uploads when all posters already exist', async () => {
    const posters = [
      makePoster({ file_path: '/a.jpg', iso_639_1: 'te' }),
      makePoster({ file_path: '/b.jpg', iso_639_1: 'en' }),
    ];

    supabase.not.mockImplementation(() => ({
      data: [{ tmdb_file_path: '/a.jpg' }, { tmdb_file_path: '/b.jpg' }],
      error: null,
    }));

    const result = await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    expect(mockUpload).not.toHaveBeenCalled();
    expect(result).toBe(2);
  });

  it('cleans up stale images after syncing', async () => {
    const posters = [makePoster({ file_path: '/current.jpg', iso_639_1: 'te' })];

    // First .not call = getExistingPaths (no existing)
    // Second .not call = cleanupStaleImages query
    supabase.not
      .mockImplementationOnce(() => ({ data: [], error: null }))
      .mockImplementationOnce(() => ({
        data: [
          { id: 'stale-id', tmdb_file_path: '/old-removed.jpg' },
          { id: 'current-id', tmdb_file_path: '/current.jpg' },
        ],
        error: null,
      }));

    await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never);

    // Should delete stale entries (old-removed.jpg is not in current list)
    expect(supabase.delete).toHaveBeenCalled();
    expect(supabase.in).toHaveBeenCalledWith('id', ['stale-id']);
  });

  it('promotes tmdbMainPosterPath to first position', async () => {
    const posters = [
      makePoster({ file_path: '/a.jpg', iso_639_1: 'te', vote_average: 9.0 }),
      makePoster({ file_path: '/main.jpg', iso_639_1: 'en', vote_average: 1.0 }),
    ];

    await syncPosters(MOVIE_ID, TMDB_ID, { posters }, supabase as never, '/main.jpg');

    // The main poster path should be uploaded first (promoted)
    expect(mockUpload.mock.calls[0][0]).toBe('https://image.tmdb.org/t/p/w500/main.jpg');
  });
});

describe('syncBackdrops', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    mockUpload.mockImplementation(async (_url, _bucket, key) => `https://r2.example.com/${key}`);
  });

  it('returns 0 for empty backdrops array', async () => {
    const result = await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops: [] }, supabase as never);
    expect(result).toBe(0);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('sorts backdrops by vote_average descending', async () => {
    const backdrops = [
      makeBackdrop({ file_path: '/low.jpg', vote_average: 2.0 }),
      makeBackdrop({ file_path: '/high.jpg', vote_average: 9.0 }),
      makeBackdrop({ file_path: '/mid.jpg', vote_average: 5.0 }),
    ];

    await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never);

    // First uploaded should be highest vote_average
    expect(mockUpload.mock.calls[0][0]).toBe('https://image.tmdb.org/t/p/w1280/high.jpg');
    expect(mockUpload.mock.calls[1][0]).toBe('https://image.tmdb.org/t/p/w1280/mid.jpg');
    expect(mockUpload.mock.calls[2][0]).toBe('https://image.tmdb.org/t/p/w1280/low.jpg');
  });

  it('uploads to R2 and inserts into movie_images', async () => {
    const backdrops = [makeBackdrop({ file_path: '/bd.jpg', vote_average: 7.0 })];

    await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never);

    expect(mockUpload).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/w1280/bd.jpg',
      'faniverz-movie-backdrops',
      expect.stringMatching(/^[0-9a-f-]+\.jpg$/),
    );
    expect(supabase.from).toHaveBeenCalledWith('movie_images');
    expect(supabase.insert).toHaveBeenCalled();
  });

  it('updates movies.backdrop_url for the first backdrop', async () => {
    const backdrops = [makeBackdrop({ file_path: '/first.jpg', vote_average: 9.0 })];

    await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never);

    expect(supabase.from).toHaveBeenCalledWith('movies');
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ backdrop_url: expect.any(String) }),
    );
  });

  it('queries existing paths and cleans up stale entries', async () => {
    const backdrops = [makeBackdrop()];

    await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never);

    // Should query for existing tmdb_file_path (additive behavior)
    expect(supabase.not).toHaveBeenCalledWith('tmdb_file_path', 'is', null);
  });

  it('syncs all backdrops without limit', async () => {
    const backdrops = Array.from({ length: 20 }, (_, i) =>
      makeBackdrop({ file_path: `/b${i}.jpg`, vote_average: 20 - i }),
    );

    const result = await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never);

    expect(result).toBe(20);
    expect(mockUpload).toHaveBeenCalledTimes(20);
  });

  it('skips already-synced backdrops (additive behavior)', async () => {
    const backdrops = [
      makeBackdrop({ file_path: '/existing.jpg', vote_average: 9.0 }),
      makeBackdrop({ file_path: '/new.jpg', vote_average: 5.0 }),
    ];

    supabase.not.mockImplementation(() => ({
      data: [{ tmdb_file_path: '/existing.jpg' }],
      error: null,
    }));

    const result = await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload.mock.calls[0][0]).toBe('https://image.tmdb.org/t/p/w1280/new.jpg');
    expect(result).toBe(2);
  });

  it('cleans up stale backdrops not in current TMDB list', async () => {
    const backdrops = [makeBackdrop({ file_path: '/keep.jpg' })];

    supabase.not
      .mockImplementationOnce(() => ({ data: [], error: null }))
      .mockImplementationOnce(() => ({
        data: [
          { id: 'old-id', tmdb_file_path: '/removed.jpg' },
          { id: 'keep-id', tmdb_file_path: '/keep.jpg' },
        ],
        error: null,
      }));

    await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never);

    expect(supabase.in).toHaveBeenCalledWith('id', ['old-id']);
  });

  it('promotes tmdbMainBackdropPath to first position', async () => {
    const backdrops = [
      makeBackdrop({ file_path: '/a.jpg', vote_average: 9.0 }),
      makeBackdrop({ file_path: '/main.jpg', vote_average: 1.0 }),
    ];

    await syncBackdrops(MOVIE_ID, TMDB_ID, { backdrops }, supabase as never, '/main.jpg');

    expect(mockUpload.mock.calls[0][0]).toBe('https://image.tmdb.org/t/p/w1280/main.jpg');
  });
});

describe('syncAllImages', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    mockUpload.mockImplementation(async (_url, _bucket, key) => `https://r2.example.com/${key}`);
  });

  it('fetches images from TMDB and syncs both posters and backdrops', async () => {
    mockGetMovieImages.mockResolvedValue({
      posters: [makePoster({ file_path: '/p.jpg', iso_639_1: 'te' })],
      backdrops: [makeBackdrop({ file_path: '/b.jpg' })],
      logos: [],
    });

    const result = await syncAllImages(MOVIE_ID, TMDB_ID, 'api-key', supabase as never);

    expect(mockGetMovieImages).toHaveBeenCalledWith(TMDB_ID, 'api-key');
    expect(result).toEqual({ posterCount: 1, backdropCount: 1 });
  });

  it('returns zero counts when TMDB returns no images', async () => {
    mockGetMovieImages.mockResolvedValue({ posters: [], backdrops: [], logos: [] });

    const result = await syncAllImages(MOVIE_ID, TMDB_ID, 'api-key', supabase as never);

    expect(result).toEqual({ posterCount: 0, backdropCount: 0 });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('handles poster insert error and warns', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetMovieImages.mockResolvedValue({
      posters: [makePoster({ file_path: '/fail.jpg', iso_639_1: null })],
      backdrops: [],
      logos: [],
    });
    // Poster insert fails
    supabase.insert.mockResolvedValueOnce({ error: { message: 'insert failed' } });

    const result = await syncAllImages(MOVIE_ID, TMDB_ID, 'api-key', supabase as never);

    expect(consoleWarn).toHaveBeenCalledWith('syncPosters: insert failed', 'insert failed');
    expect(result.posterCount).toBe(0);
    consoleWarn.mockRestore();
  });

  it('handles backdrop insert error and warns', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetMovieImages.mockResolvedValue({
      posters: [],
      backdrops: [makeBackdrop({ file_path: '/fail-b.jpg' })],
      logos: [],
    });
    supabase.insert.mockResolvedValueOnce({ error: { message: 'backdrop insert failed' } });

    const result = await syncAllImages(MOVIE_ID, TMDB_ID, 'api-key', supabase as never);

    expect(consoleWarn).toHaveBeenCalledWith(
      'syncBackdrops: insert failed',
      'backdrop insert failed',
    );
    expect(result.backdropCount).toBe(0);
    consoleWarn.mockRestore();
  });

  it('uses "no lang" fallback when poster iso_639_1 is null', async () => {
    mockGetMovieImages.mockResolvedValue({
      posters: [
        makePoster({ file_path: '/main.jpg', iso_639_1: 'te', vote_average: 9 }),
        makePoster({ file_path: '/nolang.jpg', iso_639_1: null, vote_average: 3 }),
      ],
      backdrops: [],
      logos: [],
    });

    const result = await syncAllImages(MOVIE_ID, TMDB_ID, 'api-key', supabase as never);

    // Non-main poster with null iso_639_1 should use "no lang" fallback
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Poster (no lang)' }),
    );
    expect(result.posterCount).toBe(2);
  });

  it('passes tmdbMainPaths to syncPosters and syncBackdrops', async () => {
    mockGetMovieImages.mockResolvedValue({
      posters: [makePoster({ file_path: '/p.jpg', iso_639_1: 'te' })],
      backdrops: [makeBackdrop({ file_path: '/b.jpg' })],
      logos: [],
    });

    await syncAllImages(MOVIE_ID, TMDB_ID, 'api-key', supabase as never, {
      posterPath: '/main-poster.jpg',
      backdropPath: '/main-backdrop.jpg',
    });

    expect(mockGetMovieImages).toHaveBeenCalledWith(TMDB_ID, 'api-key');
  });
});
