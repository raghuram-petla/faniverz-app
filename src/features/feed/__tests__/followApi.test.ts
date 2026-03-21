jest.mock('@/lib/supabase', () => {
  const mockOrder = jest.fn();
  const mockEq3 = jest.fn();
  const mockEq2 = jest.fn(() => ({ eq: mockEq3 }));
  const mockEq = jest.fn(() => ({ eq: mockEq2, order: mockOrder }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockInsert = jest.fn();
  const mockDeleteEq2 = jest.fn();
  const mockDeleteEq = jest.fn(() => ({ eq: mockDeleteEq2 }));
  const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));

  return {
    supabase: {
      from: jest.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        delete: mockDelete,
      })),
    },
  };
});

import { supabase } from '@/lib/supabase';
import { fetchUserFollows, fetchEnrichedFollows, followEntity, unfollowEntity } from '../followApi';

const mockFrom = supabase.from as jest.Mock;

describe('fetchUserFollows', () => {
  it('queries entity_follows for the user', async () => {
    const mockOrder = jest.fn().mockResolvedValue({
      data: [{ id: '1', user_id: 'u1', entity_type: 'movie', entity_id: 'm1', created_at: '' }],
      error: null,
    });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await fetchUserFollows('u1');
    expect(mockFrom).toHaveBeenCalledWith('entity_follows');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(result).toHaveLength(1);
  });

  it('throws on error', async () => {
    const mockOrder = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(fetchUserFollows('u1')).rejects.toEqual({ message: 'DB error' });
  });

  it('returns empty array when data is null', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await fetchUserFollows('u1');
    expect(result).toEqual([]);
  });
});

describe('followEntity', () => {
  it('upserts into entity_follows', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await followEntity('u1', 'movie', 'm1');
    expect(mockFrom).toHaveBeenCalledWith('entity_follows');
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'u1', entity_type: 'movie', entity_id: 'm1' },
      { onConflict: 'user_id,entity_type,entity_id' },
    );
  });

  it('throws on error', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await expect(followEntity('u1', 'movie', 'm1')).rejects.toEqual({ message: 'DB error' });
  });
});

describe('unfollowEntity', () => {
  it('deletes from entity_follows', async () => {
    const mockEq3 = jest.fn().mockResolvedValue({ error: null });
    const mockEq2 = jest.fn(() => ({ eq: mockEq3 }));
    const mockEq = jest.fn(() => ({ eq: mockEq2 }));
    const mockDelete = jest.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ delete: mockDelete });

    await unfollowEntity('u1', 'movie', 'm1');
    expect(mockFrom).toHaveBeenCalledWith('entity_follows');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(mockEq2).toHaveBeenCalledWith('entity_type', 'movie');
    expect(mockEq3).toHaveBeenCalledWith('entity_id', 'm1');
  });

  it('throws on error', async () => {
    const mockEq3 = jest.fn().mockResolvedValue({ error: { message: 'Not found' } });
    const mockEq2 = jest.fn(() => ({ eq: mockEq3 }));
    const mockEq = jest.fn(() => ({ eq: mockEq2 }));
    const mockDelete = jest.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ delete: mockDelete });

    await expect(unfollowEntity('u1', 'movie', 'm1')).rejects.toEqual({ message: 'Not found' });
  });
});

describe('fetchEnrichedFollows', () => {
  it('returns empty array when user has no follows', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await fetchEnrichedFollows('u1');
    expect(result).toEqual([]);
  });

  it('enriches follows with entity names and images', async () => {
    const follows = [
      { id: '1', user_id: 'u1', entity_type: 'movie', entity_id: 'm1', created_at: '2026-01-01' },
      { id: '2', user_id: 'u1', entity_type: 'actor', entity_id: 'a1', created_at: '2026-01-02' },
    ];

    // First call: fetchUserFollows
    const mockOrder = jest.fn().mockResolvedValue({ data: follows, error: null });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));

    // Subsequent calls: enrichment queries
    const mockMovieIn = jest.fn().mockResolvedValue({
      data: [{ id: 'm1', title: 'Movie One', poster_url: 'poster.jpg' }],
      error: null,
    });
    const mockActorIn = jest.fn().mockResolvedValue({
      data: [{ id: 'a1', name: 'Actor One', photo_url: 'photo.jpg' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') {
        return { select: mockSelect };
      }
      if (table === 'movies') {
        return { select: jest.fn(() => ({ in: mockMovieIn })) };
      }
      if (table === 'actors') {
        return { select: jest.fn(() => ({ in: mockActorIn })) };
      }
      // production_houses and profiles — not called since no PH/user follows
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    const result = await fetchEnrichedFollows('u1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      entity_type: 'movie',
      entity_id: 'm1',
      name: 'Movie One',
      image_url: 'poster.jpg',
      created_at: '2026-01-01',
    });
    expect(result[1]).toEqual({
      entity_type: 'actor',
      entity_id: 'a1',
      name: 'Actor One',
      image_url: 'photo.jpg',
      created_at: '2026-01-02',
    });
  });

  it('enriches user follows with display_name and avatar_url', async () => {
    const follows = [
      { id: '1', user_id: 'u1', entity_type: 'user', entity_id: 'u2', created_at: '2026-01-01' },
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: follows, error: null });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));

    const mockProfileIn = jest.fn().mockResolvedValue({
      data: [{ id: 'u2', display_name: 'John Doe', avatar_url: 'avatar.jpg' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return { select: mockSelect };
      if (table === 'profiles') {
        return { select: jest.fn(() => ({ in: mockProfileIn })) };
      }
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    const result = await fetchEnrichedFollows('u1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      entity_type: 'user',
      entity_id: 'u2',
      name: 'John Doe',
      image_url: 'avatar.jpg',
      created_at: '2026-01-01',
    });
  });

  it('filters out follows for deleted entities', async () => {
    const follows = [
      { id: '1', user_id: 'u1', entity_type: 'movie', entity_id: 'm1', created_at: '2026-01-01' },
      {
        id: '2',
        user_id: 'u1',
        entity_type: 'movie',
        entity_id: 'm-deleted',
        created_at: '2026-01-02',
      },
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: follows, error: null });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));

    const mockMovieIn = jest.fn().mockResolvedValue({
      data: [{ id: 'm1', title: 'Movie One', poster_url: null }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return { select: mockSelect };
      return { select: jest.fn(() => ({ in: mockMovieIn })) };
    });

    const result = await fetchEnrichedFollows('u1');
    expect(result).toHaveLength(2);
    expect(result[0].entity_id).toBe('m1');
    expect(result[1].name).toBe('Deleted');
  });
});
