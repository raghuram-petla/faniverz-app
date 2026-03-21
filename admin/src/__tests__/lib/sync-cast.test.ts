/**
 * Tests for sync-cast.ts — cast/crew sync and poster mirroring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../lib/tmdb', () => ({
  getMovieDetails: vi.fn(),
  TMDB_IMAGE: {
    profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
  },
}));

vi.mock('../../lib/tmdbTypes', () => ({
  extractKeyCrewMembers: vi.fn().mockReturnValue([]),
}));

vi.mock('../../lib/r2-sync', () => ({
  maybeUploadImage: vi.fn().mockResolvedValue('uploaded.jpg'),
  R2_BUCKETS: {
    actorPhotos: 'faniverz-actor-photos',
  },
}));

vi.mock('../../lib/sync-actor', () => ({
  upsertActorPreserveType: vi.fn().mockResolvedValue('actor-uuid-1'),
}));

vi.mock('crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('crypto')>();
  return {
    ...mod,
    default: { ...mod, randomUUID: () => 'mock-uuid' as const },
    randomUUID: () => 'mock-uuid' as const,
  };
});

import { mirrorMainPoster, syncCastCrew } from '../../lib/sync-cast';
import { extractKeyCrewMembers } from '../../lib/tmdbTypes';
import { upsertActorPreserveType } from '../../lib/sync-actor';

function createMockSupabase() {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return mock;
}

const MOVIE_ID = 'movie-uuid-123';

describe('mirrorMainPoster', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('inserts new main poster when none exists', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await mirrorMainPoster(MOVIE_ID, 'poster.jpg', supabase as never);

    expect(supabase.from).toHaveBeenCalledWith('movie_images');
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: MOVIE_ID,
        image_url: 'poster.jpg',
        image_type: 'poster',
        title: 'Main Poster',
        is_main_poster: true,
        display_order: 0,
      }),
    );
  });

  it('updates existing main poster when one exists', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-poster-id' },
      error: null,
    });
    supabase.update = vi.fn().mockReturnThis();

    await mirrorMainPoster(MOVIE_ID, 'new-poster.jpg', supabase as never);

    expect(supabase.update).toHaveBeenCalledWith({ image_url: 'new-poster.jpg' });
    expect(supabase.eq).toHaveBeenCalledWith('id', 'existing-poster-id');
  });
});

describe('syncCastCrew', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('syncs cast when count is 0', async () => {
    // count query
    supabase.select.mockReturnValueOnce({
      ...supabase,
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor One',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
        ],
        crew: [],
      },
    };
    const updatedFields: string[] = [];

    await syncCastCrew(MOVIE_ID, detail as never, false, supabase as never, updatedFields);

    expect(upsertActorPreserveType).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tmdb_person_id: 1,
        name: 'Actor One',
        default_person_type: 'actor',
      }),
    );
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: MOVIE_ID,
        actor_id: 'actor-uuid-1',
        role_name: 'Hero',
        credit_type: 'cast',
      }),
    );
    expect(updatedFields).toContain('cast');
  });

  it('deletes existing cast before re-insert on force resync', async () => {
    // count query returns existing cast
    supabase.select.mockReturnValueOnce({
      ...supabase,
      eq: vi.fn().mockResolvedValue({ count: 5 }),
    });

    const detail = {
      credits: { cast: [], crew: [] },
    };
    const updatedFields: string[] = [];

    await syncCastCrew(MOVIE_ID, detail as never, true, supabase as never, updatedFields);

    expect(supabase.delete).toHaveBeenCalled();
  });

  it('skips sync when cast exists and not force-resyncing', async () => {
    supabase.select.mockReturnValueOnce({
      ...supabase,
      eq: vi.fn().mockResolvedValue({ count: 10 }),
    });

    const detail = {
      credits: { cast: [{ id: 1, name: 'A' }], crew: [] },
    };
    const updatedFields: string[] = [];

    await syncCastCrew(MOVIE_ID, detail as never, false, supabase as never, updatedFields);

    expect(upsertActorPreserveType).not.toHaveBeenCalled();
    expect(updatedFields).not.toContain('cast');
  });

  it('syncs crew members from extractKeyCrewMembers', async () => {
    supabase.select.mockReturnValueOnce({
      ...supabase,
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 100,
        name: 'Director X',
        profile_path: '/d.jpg',
        roleName: 'Director',
        roleOrder: 0,
        gender: 1,
      },
    ] as never);

    const detail = {
      credits: { cast: [], crew: [{ id: 100, name: 'Director X', job: 'Director' }] },
    };
    const updatedFields: string[] = [];

    await syncCastCrew(MOVIE_ID, detail as never, false, supabase as never, updatedFields);

    expect(upsertActorPreserveType).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tmdb_person_id: 100,
        name: 'Director X',
        default_person_type: 'technician',
      }),
    );
  });

  it('skips cast member when upsertActorPreserveType returns null', async () => {
    supabase.select.mockReturnValueOnce({
      ...supabase,
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    });

    vi.mocked(upsertActorPreserveType).mockResolvedValueOnce(null);

    const detail = {
      credits: {
        cast: [
          { id: 1, name: 'Ghost', character: 'None', order: 0, profile_path: null, gender: null },
        ],
        crew: [],
      },
    };
    const updatedFields: string[] = [];

    await syncCastCrew(MOVIE_ID, detail as never, false, supabase as never, updatedFields);

    // insert should not be called for movie_cast since actorId was null
    // but updatedFields should still have 'cast' pushed
    expect(updatedFields).toContain('cast');
  });
});
