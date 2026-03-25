/**
 * Tests for sync-cast.ts — cast/crew sync, poster mirroring, and additive sync.
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

import { mirrorMainPoster, syncCastCrew, syncCastCrewAdditive } from '../../lib/sync-cast';
import { extractKeyCrewMembers } from '../../lib/tmdbTypes';
import { upsertActorPreserveType } from '../../lib/sync-actor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockSupabase = Record<string, any>;

/**
 * Basic mock for mirrorMainPoster / syncCastCrew — simple chainable mock.
 */
function createBasicMockSupabase() {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return mock;
}

/**
 * Advanced mock for syncCastCrewAdditive — supports chained `.eq().eq()`,
 * single `.eq()`, and `.delete().in()` patterns.
 *
 * Read results are consumed from a queue when `select()` is called (starting
 * a read chain). Write chains (insert/delete) use fixed mock returns.
 */
function createAdditiveMockSupabase() {
  const readResults: Array<{ data: unknown; error: unknown }> = [];
  const defaultResult = { data: [], error: null };

  const mock: MockSupabase = {};

  /** Build a chainable + thenable object that resolves to `result`. */
  function chainObj(result: { data: unknown; error: unknown }): MockSupabase {
    return {
      select: (...args: unknown[]) => {
        mock.select(...args);
        // Consume next read result from queue
        const readResult = readResults.shift() ?? defaultResult;
        return chainObj(readResult);
      },
      eq: (...args: unknown[]) => {
        mock.eq(...args);
        return chainObj(result);
      },
      in: (...args: unknown[]) => {
        mock.in(...args);
        return chainObj(result);
      },
      delete: (...args: unknown[]) => {
        mock.delete(...args);
        return chainObj(result);
      },
      insert: mock.insert,
      update: (...args: unknown[]) => {
        mock.update(...args);
        return chainObj(result);
      },
      maybeSingle: mock.maybeSingle,
      data: result.data,
      error: result.error,
      then: (onFulfill: (v: unknown) => unknown, onReject?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(onFulfill, onReject),
    };
  }

  mock.from = vi.fn(() => chainObj(defaultResult));
  mock.select = vi.fn();
  mock.insert = vi.fn().mockResolvedValue({ error: null });
  mock.update = vi.fn();
  mock.delete = vi.fn();
  mock.eq = vi.fn();
  mock.in = vi.fn().mockResolvedValue({ error: null });
  mock.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  /** Push a read result that will be consumed by the next `select()` call. */
  mock._pushResult = (result: { data: unknown; error: unknown }) => {
    readResults.push(result);
  };

  return mock;
}

const MOVIE_ID = 'movie-uuid-123';

describe('mirrorMainPoster', () => {
  let supabase: ReturnType<typeof createBasicMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createBasicMockSupabase();
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
  let supabase: ReturnType<typeof createBasicMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createBasicMockSupabase();
  });

  it('syncs cast when count is 0', async () => {
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

  it('warns when crew insert fails in syncCastCrew', async () => {
    supabase.select.mockReturnValueOnce({
      ...supabase,
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 100,
        name: 'Failing Crew',
        profile_path: null,
        roleName: 'Director',
        roleOrder: 0,
        gender: null,
      },
    ] as never);

    supabase.insert.mockResolvedValueOnce({ error: { message: 'crew insert failed' } });

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detail = {
      credits: { cast: [], crew: [{ id: 100, name: 'Failing Crew', job: 'Director' }] },
    };
    const updatedFields: string[] = [];

    await syncCastCrew(MOVIE_ID, detail as never, false, supabase as never, updatedFields);

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('crew insert failed'),
      'crew insert failed',
    );
    consoleWarn.mockRestore();
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

    expect(updatedFields).toContain('cast');
  });
});

describe('syncCastCrewAdditive', () => {
  let supabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createAdditiveMockSupabase();
  });

  it('syncs all cast when none exist', async () => {
    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup query -> empty
    supabase._pushResult({ data: [], error: null });

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor A',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
          {
            id: 2,
            name: 'Actor B',
            character: 'Villain',
            order: 1,
            profile_path: '/b.jpg',
            gender: 1,
          },
        ],
        crew: [],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    expect(upsertActorPreserveType).toHaveBeenCalledTimes(2);
    expect(result.castCount).toBe(2);
    expect(result.crewCount).toBe(0);
  });

  it('skips already-synced cast members', async () => {
    // getExistingCastIds(cast) -> person 1 exists
    supabase._pushResult({
      data: [{ actor_id: 'a1', actors: { tmdb_person_id: 1 } }],
      error: null,
    });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup query
    supabase._pushResult({
      data: [{ id: 'mc-1', actor_id: 'a1', actors: { tmdb_person_id: 1 } }],
      error: null,
    });

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Existing',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
          { id: 2, name: 'New', character: 'Villain', order: 1, profile_path: '/b.jpg', gender: 1 },
        ],
        crew: [],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    // Only Actor B (id:2) should be processed
    expect(upsertActorPreserveType).toHaveBeenCalledTimes(1);
    expect(upsertActorPreserveType).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tmdb_person_id: 2, name: 'New' }),
    );
    expect(result.castCount).toBe(2);
  });

  it('syncs crew members additively', async () => {
    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 10,
        name: 'Director',
        profile_path: '/d.jpg',
        roleName: 'Director',
        roleOrder: 0,
        gender: 2,
      },
      {
        id: 20,
        name: 'Writer',
        profile_path: '/w.jpg',
        roleName: 'Screenplay',
        roleOrder: 1,
        gender: 1,
      },
    ] as never);

    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    const detail = {
      credits: {
        cast: [],
        crew: [
          { id: 10, name: 'Director', job: 'Director' },
          { id: 20, name: 'Writer', job: 'Screenplay' },
        ],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    expect(result.crewCount).toBe(2);
    expect(upsertActorPreserveType).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ default_person_type: 'technician' }),
    );
  });

  it('skips cast member when upsertActorPreserveType returns null', async () => {
    vi.mocked(upsertActorPreserveType).mockResolvedValueOnce(null);

    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    const detail = {
      credits: {
        cast: [
          { id: 1, name: 'Ghost', character: 'None', order: 0, profile_path: null, gender: null },
        ],
        crew: [],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    expect(result.castCount).toBe(0);
  });

  it('cleans up stale cast entries after processing', async () => {
    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup query: includes a stale entry (person 999 not in TMDB data)
    supabase._pushResult({
      data: [
        { id: 'mc-1', actor_id: 'a1', actors: { tmdb_person_id: 1 } },
        { id: 'mc-stale', actor_id: 'a-stale', actors: { tmdb_person_id: 999 } },
      ],
      error: null,
    });

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor A',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
        ],
        crew: [],
      },
    };

    await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    expect(supabase.delete).toHaveBeenCalled();
    expect(supabase.in).toHaveBeenCalledWith('id', ['mc-stale']);
  });

  it('processes missing cast in batches of 5', async () => {
    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    const castMembers = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `Actor ${i + 1}`,
      character: `Role ${i + 1}`,
      order: i,
      profile_path: `/p${i}.jpg`,
      gender: 2,
    }));

    const detail = {
      credits: {
        cast: castMembers,
        crew: [],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    // All 7 should be processed (in 2 batches: 5 + 2)
    expect(upsertActorPreserveType).toHaveBeenCalledTimes(7);
    expect(result.castCount).toBe(7);
  });

  it('handles insert error that is NOT a duplicate constraint', async () => {
    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    // Insert fails with a non-unique-constraint error
    supabase.insert.mockResolvedValue({ error: { message: 'foreign key violation' } });
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor A',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
        ],
        crew: [],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    // Non-dupe error: ok=false, so castCount stays at 0
    expect(result.castCount).toBe(0);
    consoleWarn.mockRestore();
  });

  it('handles insert error that IS a duplicate constraint (isDupe branch)', async () => {
    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    // Insert fails with unique constraint error
    supabase.insert.mockResolvedValue({ error: { message: 'unique constraint violation' } });

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor A',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
        ],
        crew: [],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    // Dupe error: ok=true (isDupe), so castCount includes it
    expect(result.castCount).toBe(1);
  });

  it('handles crew insert error with unique constraint (isDupe branch)', async () => {
    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 10,
        name: 'Director',
        profile_path: '/d.jpg',
        roleName: 'Director',
        roleOrder: 0,
        gender: 2,
      },
    ] as never);

    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    // Insert fails with unique constraint error
    supabase.insert.mockResolvedValue({ error: { message: 'unique constraint violation' } });

    const detail = {
      credits: {
        cast: [],
        crew: [{ id: 10, name: 'Director', job: 'Director' }],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    // Dupe error on crew: ok=true (isDupe), so crewCount includes it
    expect(result.crewCount).toBe(1);
  });

  it('handles crew insert error that is NOT a duplicate constraint', async () => {
    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 10,
        name: 'Director',
        profile_path: '/d.jpg',
        roleName: 'Director',
        roleOrder: 0,
        gender: 2,
      },
    ] as never);

    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    supabase.insert.mockResolvedValue({ error: { message: 'foreign key violation' } });
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const detail = {
      credits: {
        cast: [],
        crew: [{ id: 10, name: 'Director', job: 'Director' }],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    expect(result.crewCount).toBe(0);
    consoleWarn.mockRestore();
  });

  it('skips crew member when upsertActorPreserveType returns null', async () => {
    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      {
        id: 10,
        name: 'Director',
        profile_path: '/d.jpg',
        roleName: 'Director',
        roleOrder: 0,
        gender: 2,
      },
    ] as never);
    vi.mocked(upsertActorPreserveType).mockResolvedValueOnce(null);

    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    const detail = {
      credits: {
        cast: [],
        crew: [{ id: 10, name: 'Director', job: 'Director' }],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    expect(result.crewCount).toBe(0);
  });

  it('handles getExistingCastKeys query error gracefully (returns empty set)', async () => {
    // getExistingCastIds(cast) -> error, returns empty set so all cast treated as missing
    supabase._pushResult({ data: null, error: { message: 'query failed' } });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup
    supabase._pushResult({ data: [], error: null });

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor A',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
        ],
        crew: [],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    // Should still process all cast since error makes all treated as missing
    expect(result.castCount).toBe(1);
    consoleWarn.mockRestore();
  });

  it('does not delete stale entries when none are stale', async () => {
    // getExistingCastIds(cast) -> empty
    supabase._pushResult({ data: [], error: null });
    // getExistingCastIds(crew) -> empty
    supabase._pushResult({ data: [], error: null });
    // cleanup: all entries are in TMDB data, none stale
    supabase._pushResult({
      data: [{ id: 'mc-1', actor_id: 'a1', actors: { tmdb_person_id: 1 } }],
      error: null,
    });

    const detail = {
      credits: {
        cast: [
          {
            id: 1,
            name: 'Actor A',
            character: 'Hero',
            order: 0,
            profile_path: '/a.jpg',
            gender: 2,
          },
        ],
        crew: [],
      },
    };

    await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    // delete should NOT have been called with .in() since staleIds is empty
    // The delete is only called when staleIds.length > 0
    expect(supabase.in).not.toHaveBeenCalledWith('id', expect.any(Array));
  });

  it('returns correct counts when both cast and crew already exist', async () => {
    // getExistingCastIds(cast) -> person 1 exists
    supabase._pushResult({
      data: [{ actor_id: 'a1', actors: { tmdb_person_id: 1 } }],
      error: null,
    });
    // getExistingCastKeys(crew) -> person 10 with roleOrder 0 exists (composite key: "10-0")
    supabase._pushResult({
      data: [{ actor_id: 'a10', role_order: 0, actors: { tmdb_person_id: 10 } }],
      error: null,
    });
    // cleanup
    supabase._pushResult({
      data: [
        { id: 'mc-1', actor_id: 'a1', actors: { tmdb_person_id: 1 } },
        { id: 'mc-10', actor_id: 'a10', actors: { tmdb_person_id: 10 } },
      ],
      error: null,
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValueOnce([
      { id: 10, name: 'Dir', profile_path: null, roleName: 'Director', roleOrder: 0, gender: 2 },
    ] as never);

    const detail = {
      credits: {
        cast: [
          { id: 1, name: 'Actor', character: 'Hero', order: 0, profile_path: null, gender: 2 },
        ],
        crew: [{ id: 10, name: 'Dir', job: 'Director' }],
      },
    };

    const result = await syncCastCrewAdditive(MOVIE_ID, detail as never, supabase as never);

    expect(upsertActorPreserveType).not.toHaveBeenCalled();
    expect(result.castCount).toBe(1);
    expect(result.crewCount).toBe(1);
  });
});
