/**
 * Tests for sync-actor.ts — actor upsert and refresh logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('../../lib/tmdb', () => ({
  getPersonDetails: vi.fn(),
  TMDB_IMAGE: {
    profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
  },
}));

vi.mock('../../lib/r2-sync', () => ({
  maybeUploadImage: vi.fn().mockResolvedValue('uploaded-photo.jpg'),
  R2_BUCKETS: {
    actorPhotos: 'faniverz-actor-photos',
  },
}));

vi.mock('crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('crypto')>();
  return {
    ...mod,
    default: { ...mod, randomUUID: () => 'mock-uuid-1234' as const },
    randomUUID: () => 'mock-uuid-1234' as const,
  };
});

import { upsertActorPreserveType, processActorRefresh } from '../../lib/sync-actor';
import { getPersonDetails } from '../../lib/tmdb';
import { maybeUploadImage } from '../../lib/r2-sync';

function createMockSupabase() {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'actor-uuid' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return mock;
}

describe('upsertActorPreserveType', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('inserts new actor when not found by tmdb_person_id', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // not found
    supabase.single.mockResolvedValueOnce({ data: { id: 'new-actor-id' }, error: null });

    const result = await upsertActorPreserveType(supabase as unknown as SupabaseClient, {
      tmdb_person_id: 12345,
      name: 'Test Actor',
      photo_url: 'photo.jpg',
      default_person_type: 'actor',
      gender: 2,
    });

    expect(result).toBe('new-actor-id');
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdb_person_id: 12345,
        name: 'Test Actor',
        photo_url: 'photo.jpg',
        person_type: 'actor',
        gender: 2,
      }),
    );
  });

  it('updates existing actor without changing person_type', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-id' },
      error: null,
    });
    // Mock the chained .update().eq() pattern
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    supabase.update = updateMock;

    const result = await upsertActorPreserveType(supabase as unknown as SupabaseClient, {
      tmdb_person_id: 12345,
      name: 'Updated Name',
      photo_url: 'new-photo.jpg',
      default_person_type: 'technician',
      gender: 1,
    });

    expect(result).toBe('existing-id');
    // Should NOT include person_type in update
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Name',
        photo_url: 'new-photo.jpg',
        gender: 1,
      }),
    );
    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ person_type: expect.anything() }),
    );
  });

  it('returns null when update fails', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-id' },
      error: null,
    });
    supabase.update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'update error' } }),
    });

    const result = await upsertActorPreserveType(supabase as unknown as SupabaseClient, {
      tmdb_person_id: 12345,
      name: 'Actor',
      photo_url: null,
      default_person_type: 'actor',
      gender: null,
    });

    expect(result).toBeNull();
  });

  it('handles insert race condition by falling back to select', async () => {
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // not found initially
      .mockResolvedValueOnce({ data: { id: 'race-winner-id' }, error: null }); // fallback select
    supabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key violation' },
    });

    const result = await upsertActorPreserveType(supabase as unknown as SupabaseClient, {
      tmdb_person_id: 99,
      name: 'Race Actor',
      photo_url: null,
      default_person_type: 'actor',
      gender: null,
    });

    expect(result).toBe('race-winner-id');
  });

  it('returns null when both insert and fallback select fail', async () => {
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // not found
      .mockResolvedValueOnce({ data: null, error: null }); // fallback also fails
    supabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'insert failed' },
    });

    const result = await upsertActorPreserveType(supabase as unknown as SupabaseClient, {
      tmdb_person_id: 99,
      name: 'Ghost Actor',
      photo_url: null,
      default_person_type: 'actor',
      gender: null,
    });

    expect(result).toBeNull();
  });
});

describe('processActorRefresh', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('fetches person details from TMDB and updates changed fields', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      name: 'New Name',
      biography: 'Updated bio',
      place_of_birth: 'Hyderabad',
      birthday: '1990-01-01',
      profile_path: '/new-photo.jpg',
      gender: 2,
      also_known_as: [],
      deathday: null,
      imdb_id: 'nm123',
      known_for_department: 'Acting',
      external_ids: {
        imdb_id: 'nm123',
        instagram_id: 'actor_insta',
        twitter_id: 'actor_twitter',
      },
    } as never);

    supabase.single.mockResolvedValueOnce({
      data: {
        name: 'Old Name',
        biography: 'Old bio',
        place_of_birth: null,
        birth_date: null,
        photo_url: 'old-photo.jpg',
        gender: 1,
        imdb_id: null,
        known_for_department: null,
        also_known_as: null,
        death_date: null,
        instagram_id: null,
        twitter_id: null,
      },
      error: null,
    });
    // Mock the update call
    (supabase as Record<string, unknown>).update = vi
      .fn()
      .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    const result = await processActorRefresh(
      'actor-123',
      999,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(getPersonDetails).toHaveBeenCalledWith(999, 'api-key');
    expect(maybeUploadImage).toHaveBeenCalled();
    expect(result.updated).toBe(true);
    expect(result.actorId).toBe('actor-123');
    expect(result.name).toBe('New Name');
    expect(result.fields).toContain('name');
    expect(result.fields).toContain('biography');
    expect(result.fields).toContain('place_of_birth');
    expect(result.fields).toContain('birth_date');
    expect(result.fields).toContain('gender');
    expect(result.fields).toContain('imdb_id');
    expect(result.fields).toContain('known_for_department');
    expect(result.fields).toContain('instagram_id');
    expect(result.fields).toContain('twitter_id');
  });

  it('returns updated=false when nothing changed', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      name: 'Same Name',
      biography: 'Same bio',
      place_of_birth: 'Same place',
      birthday: '1990-01-01',
      profile_path: null,
      gender: 2,
      also_known_as: ['AKA1'],
      deathday: null,
      imdb_id: null,
      known_for_department: 'Acting',
      external_ids: {},
    } as never);

    vi.mocked(maybeUploadImage).mockResolvedValueOnce(null);
    supabase.single.mockResolvedValueOnce({
      data: {
        name: 'Same Name',
        biography: 'Same bio',
        place_of_birth: 'Same place',
        birth_date: '1990-01-01',
        photo_url: null,
        gender: 2,
        imdb_id: null,
        known_for_department: 'Acting',
        also_known_as: ['AKA1'],
        death_date: null,
        instagram_id: null,
        twitter_id: null,
      },
      error: null,
    });

    const result = await processActorRefresh(
      'actor-123',
      999,
      'api-key',
      supabase as unknown as SupabaseClient,
    );

    expect(result.updated).toBe(false);
    expect(result.fields).toHaveLength(0);
  });

  it('throws when actor fetch fails', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      name: 'Actor',
      profile_path: null,
      also_known_as: [],
      external_ids: {},
    } as never);
    vi.mocked(maybeUploadImage).mockResolvedValueOnce(null);
    supabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'not found' },
    });

    await expect(
      processActorRefresh('bad-id', 999, 'api-key', supabase as unknown as SupabaseClient),
    ).rejects.toThrow('Actor fetch failed: not found');
  });

  it('throws when actor update fails', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      name: 'Changed Name',
      biography: null,
      place_of_birth: null,
      birthday: null,
      profile_path: null,
      gender: 2,
      also_known_as: [],
      deathday: null,
      imdb_id: null,
      known_for_department: null,
      external_ids: {},
    } as never);
    vi.mocked(maybeUploadImage).mockResolvedValueOnce(null);
    supabase.single.mockResolvedValueOnce({
      data: {
        name: 'Old Name',
        biography: null,
        place_of_birth: null,
        birth_date: null,
        photo_url: null,
        gender: 2,
        imdb_id: null,
        known_for_department: null,
        also_known_as: null,
        death_date: null,
        instagram_id: null,
        twitter_id: null,
      },
      error: null,
    });
    (supabase as Record<string, unknown>).update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'DB write error' } }),
    });

    await expect(
      processActorRefresh('actor-123', 999, 'api-key', supabase as unknown as SupabaseClient),
    ).rejects.toThrow('Actor update failed: DB write error');
  });
});
