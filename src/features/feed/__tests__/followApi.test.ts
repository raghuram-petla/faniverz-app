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
import {
  fetchUserFollows,
  fetchEnrichedFollows,
  fetchEnrichedFollowsPaginated,
  followEntity,
  unfollowEntity,
} from '../followApi';

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

  it('enriches production_house follows with name and logo_url', async () => {
    const follows = [
      {
        id: '1',
        user_id: 'u1',
        entity_type: 'production_house',
        entity_id: 'ph1',
        created_at: '2026-01-01',
      },
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: follows, error: null });
    const mockEqLocal = jest.fn(() => ({ order: mockOrder }));
    const mockSelectLocal = jest.fn(() => ({ eq: mockEqLocal }));

    const mockHouseIn = jest.fn().mockResolvedValue({
      data: [{ id: 'ph1', name: 'My House', logo_url: 'logo.jpg' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return { select: mockSelectLocal };
      if (table === 'production_houses') {
        return { select: jest.fn(() => ({ in: mockHouseIn })) };
      }
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    const result = await fetchEnrichedFollows('u1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      entity_type: 'production_house',
      entity_id: 'ph1',
      name: 'My House',
      image_url: 'logo.jpg',
      created_at: '2026-01-01',
    });
  });

  it('handles enrichment query errors via unwrap', async () => {
    const follows = [
      {
        id: '1',
        user_id: 'u1',
        entity_type: 'movie',
        entity_id: 'm1',
        created_at: '2026-01-01',
      },
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: follows, error: null });
    const mockEqLocal = jest.fn(() => ({ order: mockOrder }));
    const mockSelectLocal = jest.fn(() => ({ eq: mockEqLocal }));

    const mockMovieIn = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Movie query failed' },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return { select: mockSelectLocal };
      if (table === 'movies') {
        return { select: jest.fn(() => ({ in: mockMovieIn })) };
      }
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    await expect(fetchEnrichedFollows('u1')).rejects.toEqual({ message: 'Movie query failed' });
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

// Helper: build a paginated entity_follows mock returning `follows` and optional error
function makePaginatedFollowsMock(follows: object[], error: { message: string } | null = null) {
  const mockRange = jest.fn().mockResolvedValue({ data: follows, error });
  const mockOrder = jest.fn(() => ({ range: mockRange }));
  const mockEq = jest.fn(() => ({ order: mockOrder }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  return { select: mockSelect, _mockRange: mockRange };
}

describe('fetchEnrichedFollowsPaginated', () => {
  it('returns empty array when no follows exist in the page', async () => {
    const mock = makePaginatedFollowsMock([]);
    mockFrom.mockReturnValue(mock);

    const result = await fetchEnrichedFollowsPaginated('u1', 0, 10);
    expect(result).toEqual([]);
  });

  it('returns empty array when supabase returns null data with no error', async () => {
    // null data with no error → data ?? [] → empty follows → early return []
    const mockRange = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await fetchEnrichedFollowsPaginated('u1', 0, 10);
    expect(result).toEqual([]);
  });

  it('throws when entity_follows query returns an error', async () => {
    const mock = makePaginatedFollowsMock([], { message: 'paged follows error' });
    mockFrom.mockReturnValue(mock);

    await expect(fetchEnrichedFollowsPaginated('u1', 0, 10)).rejects.toEqual({
      message: 'paged follows error',
    });
  });

  it('computes correct range (offset=5, limit=10 → to=14)', async () => {
    const mock = makePaginatedFollowsMock([]);
    mockFrom.mockReturnValue(mock);

    await fetchEnrichedFollowsPaginated('u1', 5, 10);
    expect(mock._mockRange).toHaveBeenCalledWith(5, 14);
  });

  it('uses default limit of 10', async () => {
    const mock = makePaginatedFollowsMock([]);
    mockFrom.mockReturnValue(mock);

    await fetchEnrichedFollowsPaginated('u1', 0);
    expect(mock._mockRange).toHaveBeenCalledWith(0, 9);
  });

  it('enriches movie follows and returns id field', async () => {
    const follows = [
      { user_id: 'u1', entity_type: 'movie', entity_id: 'm1', created_at: '2026-01-01' },
    ];
    const mockMovieIn = jest.fn().mockResolvedValue({
      data: [{ id: 'm1', title: 'Movie One', poster_url: 'poster.jpg' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') {
        return makePaginatedFollowsMock(follows);
      }
      if (table === 'movies') {
        return { select: jest.fn(() => ({ in: mockMovieIn })) };
      }
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    const result = await fetchEnrichedFollowsPaginated('u1', 0, 10);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'movie:m1',
      entity_type: 'movie',
      entity_id: 'm1',
      name: 'Movie One',
      image_url: 'poster.jpg',
      created_at: '2026-01-01',
    });
  });

  it('enriches actor follows with name and photo_url', async () => {
    const follows = [
      { user_id: 'u1', entity_type: 'actor', entity_id: 'a1', created_at: '2026-01-02' },
    ];
    const mockActorIn = jest.fn().mockResolvedValue({
      data: [{ id: 'a1', name: 'Actor One', photo_url: 'photo.jpg' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return makePaginatedFollowsMock(follows);
      if (table === 'actors') return { select: jest.fn(() => ({ in: mockActorIn })) };
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    const result = await fetchEnrichedFollowsPaginated('u1', 0, 10);
    expect(result[0].id).toBe('actor:a1');
    expect(result[0].name).toBe('Actor One');
    expect(result[0].image_url).toBe('photo.jpg');
  });

  it('enriches production_house follows with name and logo_url', async () => {
    const follows = [
      {
        user_id: 'u1',
        entity_type: 'production_house',
        entity_id: 'ph1',
        created_at: '2026-01-03',
      },
    ];
    const mockHouseIn = jest.fn().mockResolvedValue({
      data: [{ id: 'ph1', name: 'My House', logo_url: 'logo.jpg' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return makePaginatedFollowsMock(follows);
      if (table === 'production_houses') return { select: jest.fn(() => ({ in: mockHouseIn })) };
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    const result = await fetchEnrichedFollowsPaginated('u1', 0, 10);
    expect(result[0].id).toBe('production_house:ph1');
    expect(result[0].name).toBe('My House');
    expect(result[0].image_url).toBe('logo.jpg');
  });

  it('enriches user follows with display_name and avatar_url', async () => {
    const follows = [
      { user_id: 'u1', entity_type: 'user', entity_id: 'u2', created_at: '2026-01-04' },
    ];
    const mockProfileIn = jest.fn().mockResolvedValue({
      data: [{ id: 'u2', display_name: 'John Doe', avatar_url: 'avatar.jpg' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return makePaginatedFollowsMock(follows);
      if (table === 'profiles') return { select: jest.fn(() => ({ in: mockProfileIn })) };
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    const result = await fetchEnrichedFollowsPaginated('u1', 0, 10);
    expect(result[0].id).toBe('user:u2');
    expect(result[0].name).toBe('John Doe');
    expect(result[0].image_url).toBe('avatar.jpg');
  });

  it('shows Deleted for follows with missing entity records', async () => {
    const follows = [
      { user_id: 'u1', entity_type: 'movie', entity_id: 'm-gone', created_at: '2026-01-05' },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return makePaginatedFollowsMock(follows);
      return {
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      };
    });

    const result = await fetchEnrichedFollowsPaginated('u1', 0, 10);
    expect(result[0].name).toBe('Deleted');
    expect(result[0].image_url).toBeNull();
  });

  it('throws when an enrichment query returns an error via unwrap', async () => {
    const follows = [
      { user_id: 'u1', entity_type: 'movie', entity_id: 'm1', created_at: '2026-01-06' },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'entity_follows') return makePaginatedFollowsMock(follows);
      if (table === 'movies') {
        return {
          select: jest.fn(() => ({
            in: jest.fn().mockResolvedValue({ data: null, error: { message: 'enrichment fail' } }),
          })),
        };
      }
      return {
        select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    });

    await expect(fetchEnrichedFollowsPaginated('u1', 0, 10)).rejects.toEqual({
      message: 'enrichment fail',
    });
  });
});
