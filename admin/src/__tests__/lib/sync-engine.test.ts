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

vi.mock('../../lib/sync-cast', () => ({
  syncCastCrewAdditive: vi.fn().mockResolvedValue({ castCount: 3, crewCount: 1 }),
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
import { syncCastCrewAdditive } from '../../lib/sync-cast';

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

  it('throws when cast delete fails (fullReplaceSync)', async () => {
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

  it('syncs cast and returns cast count (fullReplaceSync)', async () => {
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

describe('processMovieFromTmdb — additional branch coverage', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    vi.mocked(getMovieDetails).mockResolvedValue(makeTmdbDetail() as never);
  });

  it('syncs crew members via extractKeyCrewMembers', async () => {
    const { extractKeyCrewMembers } = await import('../../lib/tmdbTypes');
    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 20,
        name: 'Prabhas',
        job: 'Director',
        department: 'Directing',
        roleName: 'Director',
        roleOrder: 0,
        profile_path: '/prabhas.jpg',
        gender: 2,
      },
    ]);

    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(upsertActorPreserveType).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ default_person_type: 'technician' }),
    );
    expect(result.crewCount).toBe(1);
  });

  it('skips crew member when upsertActorPreserveType returns null', async () => {
    const { extractKeyCrewMembers } = await import('../../lib/tmdbTypes');
    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 20,
        name: 'Director',
        job: 'Director',
        department: 'Directing',
        roleName: 'Director',
        roleOrder: 0,
        profile_path: null,
        gender: 0,
      },
    ]);
    vi.mocked(upsertActorPreserveType).mockResolvedValueOnce(null);

    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(result.crewCount).toBe(0);
  });

  it('sets budget and revenue to null when 0 from TMDB', async () => {
    const detail = makeTmdbDetail({ budget: 0, revenue: 0 });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ budget: null, revenue: null }),
      expect.anything(),
    );
  });

  it('sets original_language to "te" as fallback when missing', async () => {
    const detail = makeTmdbDetail({ original_language: undefined });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ original_language: 'te' }),
      expect.anything(),
    );
  });

  it('sets spoken_languages to null when not provided', async () => {
    const detail = makeTmdbDetail({ spoken_languages: undefined });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ spoken_languages: null }),
      expect.anything(),
    );
  });

  it('does not include in_theaters field for existing movies', async () => {
    // Mark movie as existing
    supabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing-id' }, error: null });

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    const upsertCall = (supabase.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(upsertCall).not.toHaveProperty('in_theaters');
  });

  it('includes imdb_id when external_ids.imdb_id is present', async () => {
    const detail = makeTmdbDetail({ external_ids: { imdb_id: 'tt9876543' } });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ imdb_id: 'tt9876543' }),
      expect.anything(),
    );
  });

  it('does not include imdb_id when external_ids is missing', async () => {
    const detail = makeTmdbDetail({ external_ids: undefined });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    const upsertCall = (supabase.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(upsertCall).not.toHaveProperty('imdb_id');
  });
});

describe('processMovieFromTmdb — resumable option', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    vi.mocked(getMovieDetails).mockResolvedValue(makeTmdbDetail() as never);
  });

  it('uses syncCastCrewAdditive when resumable=true', async () => {
    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
      { resumable: true },
    );

    expect(syncCastCrewAdditive).toHaveBeenCalledWith(
      'movie-uuid-123',
      expect.anything(),
      expect.anything(),
    );
    // Should use the counts from syncCastCrewAdditive mock (3 cast, 1 crew)
    expect(result.castCount).toBe(3);
    expect(result.crewCount).toBe(1);
  });

  it('does not delete-then-reinsert cast when resumable=true', async () => {
    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient, {
      resumable: true,
    });

    // fullReplaceSync does delete().eq() — resumable should NOT
    // The delete call on the supabase mock should not be for movie_cast
    expect(supabase.delete).not.toHaveBeenCalled();
  });

  it('still runs extended sync and images when resumable=true', async () => {
    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient, {
      resumable: true,
    });

    expect(syncAllImages).toHaveBeenCalled();
    expect(syncVideos).toHaveBeenCalled();
    expect(syncWatchProvidersMultiCountry).toHaveBeenCalled();
    expect(syncKeywords).toHaveBeenCalled();
    expect(syncProductionCompanies).toHaveBeenCalled();
  });

  it('uses fullReplaceSync when resumable=false (default)', async () => {
    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient);

    // fullReplaceSync does NOT call syncCastCrewAdditive
    expect(syncCastCrewAdditive).not.toHaveBeenCalled();
    // fullReplaceSync deletes cast first
    expect(supabase.delete).toHaveBeenCalled();
  });

  it('uses fullReplaceSync when resumable option is not provided', async () => {
    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient, undefined);

    expect(syncCastCrewAdditive).not.toHaveBeenCalled();
  });

  it('handles extended sync failure gracefully in resumable mode', async () => {
    vi.mocked(syncVideos).mockRejectedValueOnce(new Error('video sync failed'));

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
      { resumable: true },
    );
    consoleWarn.mockRestore();

    // Should still return result despite extended sync failure
    expect(result.movieId).toBe('movie-uuid-123');
    expect(result.castCount).toBe(3);
  });

  it('handles image sync failure gracefully in resumable mode', async () => {
    vi.mocked(syncAllImages).mockRejectedValueOnce(new Error('image sync failed'));

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
      { resumable: true },
    );
    consoleWarn.mockRestore();

    expect(result.movieId).toBe('movie-uuid-123');
    expect(result.castCount).toBe(3);
  });

  it('runs phases in correct order: Cast -> Extended -> Images (resumable)', async () => {
    const callOrder: string[] = [];
    vi.mocked(syncCastCrewAdditive).mockImplementation(async () => {
      callOrder.push('cast');
      return { castCount: 1, crewCount: 0 };
    });
    vi.mocked(syncVideos).mockImplementation(async () => {
      callOrder.push('extended');
      return 0;
    });
    vi.mocked(syncAllImages).mockImplementation(async () => {
      callOrder.push('images');
      return { posterCount: 0, backdropCount: 0 };
    });

    await processMovieFromTmdb(12345, 'api-key', supabase as unknown as SupabaseClient, {
      resumable: true,
    });

    // Cast must come before extended and images
    expect(callOrder.indexOf('cast')).toBeLessThan(callOrder.indexOf('extended'));
    expect(callOrder.indexOf('extended')).toBeLessThan(callOrder.indexOf('images'));
  });

  it('returns correct isNew=true for new movies in resumable mode', async () => {
    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
      { resumable: true },
    );

    expect(result.isNew).toBe(true);
  });

  it('returns correct isNew=false for existing movies in resumable mode', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-id' },
      error: null,
    });

    const result = await processMovieFromTmdb(
      12345,
      'api-key',
      supabase as unknown as SupabaseClient,
      { resumable: true },
    );

    expect(result.isNew).toBe(false);
  });
});
