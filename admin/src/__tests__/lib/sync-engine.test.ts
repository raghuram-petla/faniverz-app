/**
 * Tests for sync-engine.ts — movie import/refresh from TMDB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('../../lib/tmdb', () => ({
  getMovieDetails: vi.fn(),
  TMDB_IMAGE: {
    poster: (path: string) => `https://image.tmdb.org/t/p/w500${path}`,
    backdrop: (path: string) => `https://image.tmdb.org/t/p/w1280${path}`,
    profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
  },
}));

vi.mock('../../lib/tmdbTypes', () => ({
  extractTrailerUrl: vi.fn().mockReturnValue('https://youtube.com/watch?v=trailer1'),
  extractKeyCrewMembers: vi.fn().mockReturnValue([]),
  extractTeluguTranslation: vi.fn().mockReturnValue({ titleTe: null, synopsisTe: null }),
  extractIndiaCertification: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/r2-sync', () => ({
  maybeUploadImage: vi.fn().mockResolvedValue('uploaded.jpg'),
  R2_BUCKETS: {
    moviePosters: 'faniverz-movie-posters',
    movieBackdrops: 'faniverz-movie-backdrops',
    actorPhotos: 'faniverz-actor-photos',
  },
}));

vi.mock('../../lib/sync-images', () => ({
  syncAllImages: vi.fn().mockResolvedValue({ posterCount: 0, backdropCount: 0 }),
}));

vi.mock('../../lib/sync-extended', () => ({
  syncVideos: vi.fn().mockResolvedValue(0),
  syncKeywords: vi.fn().mockResolvedValue(0),
  syncProductionCompanies: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../lib/sync-watch-providers', () => ({
  syncWatchProvidersMultiCountry: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../lib/sync-actor', () => ({
  upsertActorPreserveType: vi.fn().mockResolvedValue('actor-uuid'),
}));

vi.mock('../../lib/sync-log', () => ({
  createSyncLog: vi.fn(),
  completeSyncLog: vi.fn(),
}));

vi.mock('crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('crypto')>();
  return {
    ...mod,
    default: { ...mod, randomUUID: () => 'mock-uuid' as const },
    randomUUID: () => 'mock-uuid' as const,
  };
});

import { processMovieFromTmdb } from '../../lib/sync-engine';
import { getMovieDetails } from '../../lib/tmdb';
import { upsertActorPreserveType } from '../../lib/sync-actor';
import { syncAllImages } from '../../lib/sync-images';
import { syncVideos, syncKeywords, syncProductionCompanies } from '../../lib/sync-extended';
import { syncWatchProvidersMultiCountry } from '../../lib/sync-watch-providers';

function createMockSupabase() {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: 'movie-uuid-123' }, error: null }),
  };
  return mock;
}

const makeTmdbDetail = (overrides = {}) => ({
  id: 12345,
  title: 'Test Movie',
  overview: 'A test movie synopsis',
  release_date: '2025-03-15',
  runtime: 150,
  genres: [
    { id: 1, name: 'Action' },
    { id: 2, name: 'Drama' },
  ],
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  original_language: 'te',
  status: 'Released',
  tagline: 'A cool tagline',
  vote_average: 7.5,
  vote_count: 1200,
  budget: 50000000,
  revenue: 200000000,
  popularity: 45.6,
  spoken_languages: [{ iso_639_1: 'te' }, { iso_639_1: 'en' }],
  belongs_to_collection: null,
  production_companies: [{ id: 1, name: 'Studio One' }],
  videos: { results: [] },
  credits: {
    cast: [],
    crew: [{ id: 10, name: 'Director Name', job: 'Director' }],
  },
  external_ids: { imdb_id: 'tt1234567' },
  translations: { translations: [] },
  release_dates: { results: [] },
  ...overrides,
});

describe('processMovieFromTmdb', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    vi.mocked(getMovieDetails).mockResolvedValue(makeTmdbDetail() as never);
  });

  it('fetches TMDB details and upserts movie', async () => {
    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(getMovieDetails).toHaveBeenCalledWith(12345, 'api-key');
    expect(result.tmdbId).toBe(12345);
    expect(result.title).toBe('Test Movie');
    expect(result.movieId).toBe('movie-uuid-123');
    expect(result.isNew).toBe(true);
  });

  it('marks movie as not new when it already exists', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-id' },
      error: null,
    });

    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(result.isNew).toBe(false);
  });

  it('throws when movie upsert fails', async () => {
    supabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'upsert failed' },
    });

    await expect(
      processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient),
    ).rejects.toThrow('Movie upsert failed: upsert failed');
  });

  it('throws when cast delete fails', async () => {
    // upsert succeeds, delete fails
    supabase.single.mockResolvedValueOnce({
      data: { id: 'movie-id' },
      error: null,
    });
    // The delete chain needs to resolve with error
    const deleteEq = vi.fn().mockResolvedValue({ error: { message: 'delete error' } });
    supabase.delete.mockReturnValue({ eq: deleteEq } as never);

    await expect(
      processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient),
    ).rejects.toThrow('Cast delete failed: delete error');
  });

  it('syncs cast and returns cast count', async () => {
    const detail = makeTmdbDetail({
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor One',
            character: 'Hero',
            order: 0,
            profile_path: '/a1.jpg',
            gender: 2,
          },
          {
            id: 2,
            name: 'Actor Two',
            character: 'Villain',
            order: 1,
            profile_path: '/a2.jpg',
            gender: 1,
          },
        ],
        crew: [{ id: 10, name: 'Director', job: 'Director' }],
      },
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(upsertActorPreserveType).toHaveBeenCalledTimes(2);
    expect(result.castCount).toBe(2);
  });

  it('skips cast member when upsertActorPreserveType returns null', async () => {
    const detail = makeTmdbDetail({
      credits: {
        cast: [
          { id: 1, name: 'Actor', character: 'Role', order: 0, profile_path: null, gender: null },
        ],
        crew: [],
      },
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(upsertActorPreserveType).mockResolvedValueOnce(null);

    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(result.castCount).toBe(0);
  });

  it('runs extended sync (images, videos, providers, keywords, production companies)', async () => {
    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(syncAllImages).toHaveBeenCalled();
    expect(syncVideos).toHaveBeenCalled();
    expect(syncWatchProvidersMultiCountry).toHaveBeenCalled();
    expect(syncKeywords).toHaveBeenCalled();
    expect(syncProductionCompanies).toHaveBeenCalled();
  });

  it('does not fail when extended sync throws', async () => {
    vi.mocked(syncAllImages).mockRejectedValueOnce(new Error('image sync failed'));

    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    // Should still return a result despite extended sync failure
    expect(result.movieId).toBe('movie-uuid-123');
  });

  it('extracts director from crew', async () => {
    const detail = makeTmdbDetail({
      credits: {
        cast: [],
        crew: [{ id: 10, name: 'SS Rajamouli', job: 'Director' }],
      },
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ director: 'SS Rajamouli' }),
      expect.anything(),
    );
  });

  it('sets director to null when no director in crew', async () => {
    const detail = makeTmdbDetail({
      credits: {
        cast: [],
        crew: [{ id: 10, name: 'Writer', job: 'Screenplay' }],
      },
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ director: null }),
      expect.anything(),
    );
  });

  it('includes collection info when movie belongs to a collection', async () => {
    const detail = makeTmdbDetail({
      belongs_to_collection: { id: 99, name: 'Baahubali Collection' },
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_id: 99,
        collection_name: 'Baahubali Collection',
      }),
      expect.anything(),
    );
  });
});
