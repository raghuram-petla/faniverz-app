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
import { fetchUserFollows, followEntity, unfollowEntity } from '../followApi';

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
  it('inserts into entity_follows', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await followEntity('u1', 'movie', 'm1');
    expect(mockFrom).toHaveBeenCalledWith('entity_follows');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'u1',
      entity_type: 'movie',
      entity_id: 'm1',
    });
  });

  it('throws on error', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'Duplicate' } });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await expect(followEntity('u1', 'movie', 'm1')).rejects.toEqual({ message: 'Duplicate' });
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
