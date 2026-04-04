import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: vi.fn(),
  TMDB_IMAGE: { profile: (p: string) => `https://tmdb.org${p}` },
}));

vi.mock('@/lib/tmdbTypes', () => ({
  extractKeyCrewMembers: vi.fn(() => []),
}));

vi.mock('@/lib/r2-sync', () => ({
  maybeUploadImage: vi.fn((_p: string | null) => Promise.resolve('https://r2.example/photo.jpg')),
  R2_BUCKETS: { actorPhotos: 'actor-photos' },
}));

vi.mock('@/lib/sync-actor', () => ({
  upsertActorPreserveType: vi.fn(() => Promise.resolve('actor-uuid')),
}));

// crypto is a Node built-in; no need to mock it

import { syncCastCrew, syncCastCrewAdditive } from '@/lib/sync-cast';
import { extractKeyCrewMembers } from '@/lib/tmdbTypes';
import { upsertActorPreserveType } from '@/lib/sync-actor';
import { maybeUploadImage } from '@/lib/r2-sync';

function buildSupabase(overrides: Record<string, unknown> = {}) {
  const base = {
    from: vi.fn(),
  };
  return { ...base, ...overrides };
}

describe('syncCastCrew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips sync when cast already exists and forceResync is false', async () => {
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      }),
    });

    const updatedFields: string[] = [];
    const detail = { credits: { cast: [], crew: [] } };
    await syncCastCrew('movie-1', detail as never, false, sb as never, updatedFields);
    expect(updatedFields).not.toContain('cast');
  });

  it('deletes and re-inserts when forceResync=true and cast exists', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 2 }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: insertFn,
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const cast = [
      { id: 1, name: 'Actor A', character: 'Hero', order: 0, profile_path: '/a.jpg', gender: 1 },
    ];
    const detail = { credits: { cast, crew: [] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, true, sb as never, updatedFields);
    expect(updatedFields).toContain('cast');
  });

  it('inserts cast when count is 0 and forceResync is false', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      }),
      insert: insertFn,
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const cast = [
      { id: 1, name: 'Actor A', character: 'Hero', order: 0, profile_path: null, gender: 2 },
    ];
    const detail = { credits: { cast, crew: [] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, false, sb as never, updatedFields);
    expect(updatedFields).toContain('cast');
    expect(vi.mocked(upsertActorPreserveType)).toHaveBeenCalled();
  });

  it('skips cast insert when upsertActorPreserveType returns null', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      }),
      insert: insertFn,
    });

    vi.mocked(upsertActorPreserveType).mockResolvedValue(null);
    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const cast = [
      { id: 1, name: 'Actor A', character: '', order: 0, profile_path: null, gender: 0 },
    ];
    const detail = { credits: { cast, crew: [] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, false, sb as never, updatedFields);
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('processes crew members via extractKeyCrewMembers', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      }),
      insert: insertFn,
    });

    vi.mocked(upsertActorPreserveType).mockResolvedValue('crew-uuid');
    vi.mocked(extractKeyCrewMembers).mockReturnValue([
      {
        id: 10,
        name: 'Director D',
        profile_path: '/d.jpg',
        gender: 1,
        roleName: 'Director',
        roleOrder: 1,
      },
    ] as never);
    const detail = { credits: { cast: [], crew: [{ id: 10, name: 'D', job: 'Director' }] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, false, sb as never, updatedFields);
    expect(updatedFields).toContain('cast');
  });

  it('warns on cast insert failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      }),
      insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate key' } }),
    });

    vi.mocked(upsertActorPreserveType).mockResolvedValue('actor-uuid');
    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const cast = [
      { id: 1, name: 'Actor A', character: 'Hero', order: 0, profile_path: null, gender: 1 },
    ];
    const detail = { credits: { cast, crew: [] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, false, sb as never, updatedFields);
    expect(console.warn).toHaveBeenCalled();
  });

  it('warns on crew insert failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      }),
      insert: vi.fn().mockResolvedValue({ error: { message: 'crew insert fail' } }),
    });

    vi.mocked(upsertActorPreserveType).mockResolvedValue('crew-uuid');
    vi.mocked(extractKeyCrewMembers).mockReturnValue([
      {
        id: 10,
        name: 'Director D',
        profile_path: null,
        gender: 1,
        roleName: 'Director',
        roleOrder: 1,
      },
    ] as never);
    const detail = { credits: { cast: [], crew: [] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, false, sb as never, updatedFields);
    expect(console.warn).toHaveBeenCalled();
  });

  it('warns on delete failure during forceResync', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 1 }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'delete error' } }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = { credits: { cast: [], crew: [] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, true, sb as never, updatedFields);
    expect(console.warn).toHaveBeenCalledWith('syncCastCrew: cast delete failed', 'delete error');
  });

  it('skips crew member when upsertActorPreserveType returns null', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      }),
      insert: insertFn,
    });

    vi.mocked(upsertActorPreserveType).mockResolvedValue(null);
    vi.mocked(extractKeyCrewMembers).mockReturnValue([
      {
        id: 10,
        name: 'Director D',
        profile_path: null,
        gender: 1,
        roleName: 'Director',
        roleOrder: 1,
      },
    ] as never);
    const detail = { credits: { cast: [], crew: [] } };
    const updatedFields: string[] = [];
    await syncCastCrew('movie-1', detail as never, false, sb as never, updatedFields);
    // insert should not be called for crew when actorId is null
    expect(insertFn).not.toHaveBeenCalled();
  });
});

describe('syncCastCrewAdditive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(upsertActorPreserveType).mockResolvedValue('actor-uuid');
    vi.mocked(maybeUploadImage).mockResolvedValue('https://r2/photo.jpg');
  });

  it('skips already-synced cast members', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ role_order: null, actors: { tmdb_person_id: 1 } }],
                error: null,
              }),
            }),
          }),
          insert: insertFn,
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = {
      credits: {
        cast: [{ id: 1, name: 'A', character: 'H', order: 0, profile_path: null, gender: 1 }],
        crew: [],
      },
    };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    // Cast member already existed, so insert should not be called for cast
    expect(result.castCount).toBe(1);
  });

  it('inserts missing cast members and counts successes', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: insertFn,
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = {
      credits: {
        cast: [{ id: 2, name: 'B', character: 'V', order: 1, profile_path: null, gender: 2 }],
        crew: [],
      },
    };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    expect(result.castCount).toBe(1);
    expect(insertFn).toHaveBeenCalled();
  });

  it('handles unique constraint duplicates for cast', async () => {
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'violates unique constraint' } }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = {
      credits: {
        cast: [{ id: 2, name: 'B', character: 'V', order: 1, profile_path: null, gender: 1 }],
        crew: [],
      },
    };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    // Duplicate should count as success
    expect(result.castCount).toBe(1);
  });

  it('skips cast when upsertActorPreserveType returns null', async () => {
    vi.mocked(upsertActorPreserveType).mockResolvedValue(null);
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn(),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = {
      credits: {
        cast: [{ id: 2, name: 'B', character: 'V', order: 1, profile_path: null, gender: 1 }],
        crew: [],
      },
    };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    expect(result.castCount).toBe(0);
  });

  it('inserts missing crew members with composite key', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: insertFn,
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([
      {
        id: 10,
        name: 'Dir',
        profile_path: null,
        gender: 1,
        roleName: 'Director',
        roleOrder: 1,
      },
    ] as never);
    const detail = { credits: { cast: [], crew: [] } };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    expect(result.crewCount).toBe(1);
  });

  it('cleans up stale entries not in current TMDB data', async () => {
    const deleteFn = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    const sb = buildSupabase();
    let callCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        callCount++;
        // First two calls are for getExistingCastKeys (cast + crew)
        // Third call is for the final cleanup select
        if (callCount <= 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        // Cleanup query — return a stale entry
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'stale-1', actor_id: 'a-stale', actors: { tmdb_person_id: 999 } }],
            }),
          }),
          delete: deleteFn,
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = { credits: { cast: [], crew: [] } };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    expect(deleteFn).toHaveBeenCalled();
    expect(result.castCount).toBe(0);
    expect(result.crewCount).toBe(0);
  });

  it('warns on getExistingCastKeys query failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'query failed' },
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = { credits: { cast: [], crew: [] } };
    await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    expect(console.warn).toHaveBeenCalledWith('getExistingCastKeys: query failed', 'query failed');
  });

  it('handles unique constraint duplicates for crew', async () => {
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'violates unique constraint' } }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([
      {
        id: 10,
        name: 'Dir',
        profile_path: null,
        gender: 1,
        roleName: 'Director',
        roleOrder: 1,
      },
    ] as never);
    const detail = { credits: { cast: [], crew: [] } };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    // Duplicate should count as success
    expect(result.crewCount).toBe(1);
  });

  it('skips crew when upsertActorPreserveType returns null in additive mode', async () => {
    vi.mocked(upsertActorPreserveType).mockResolvedValue(null);
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn(),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([
      {
        id: 10,
        name: 'Dir',
        profile_path: null,
        gender: 1,
        roleName: 'Director',
        roleOrder: 1,
      },
    ] as never);
    const detail = { credits: { cast: [], crew: [] } };
    const result = await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    expect(result.crewCount).toBe(0);
  });

  it('skips stale cleanup when no stale entries exist', async () => {
    const deleteFn = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: deleteFn,
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = { credits: { cast: [], crew: [] } };
    await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    // No stale entries means delete should not have been called
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('handles non-unique constraint cast insert errors', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sb = buildSupabase();
    sb.from.mockImplementation((table: string) => {
      if (table === 'movie_cast') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'some other error' } }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    vi.mocked(extractKeyCrewMembers).mockReturnValue([]);
    const detail = {
      credits: {
        cast: [{ id: 2, name: 'B', character: 'V', order: 1, profile_path: null, gender: 1 }],
        crew: [],
      },
    };
    await syncCastCrewAdditive('movie-1', detail as never, sb as never);
    expect(console.warn).toHaveBeenCalled();
  });
});
