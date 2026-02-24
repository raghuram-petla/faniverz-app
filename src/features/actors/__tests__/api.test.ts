const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockIlike = jest.fn();
const mockLimit = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchFavoriteActors, addFavoriteActor, removeFavoriteActor, searchActors } from '../api';

describe('actors api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchFavoriteActors', () => {
    it('queries favorite_actors with actor join for the user', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: [], error: null });

      await fetchFavoriteActors('user-1');
      expect(supabase.from).toHaveBeenCalledWith('favorite_actors');
      expect(mockSelect).toHaveBeenCalledWith('*, actor:actors(*)');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('returns data on success', async () => {
      const favorites = [{ id: 'f1', actor: { name: 'Mahesh Babu' } }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: favorites, error: null });

      const result = await fetchFavoriteActors('user-1');
      expect(result).toEqual(favorites);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchFavoriteActors('user-1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchFavoriteActors('user-1')).rejects.toThrow('DB error');
    });
  });

  describe('addFavoriteActor', () => {
    it('inserts a favorite actor record', async () => {
      mockInsert.mockResolvedValue({ error: null });

      await addFavoriteActor('u1', 'actor-1');
      expect(supabase.from).toHaveBeenCalledWith('favorite_actors');
      expect(mockInsert).toHaveBeenCalledWith({ user_id: 'u1', actor_id: 'actor-1' });
    });

    it('throws on error', async () => {
      mockInsert.mockResolvedValue({ error: new Error('Duplicate') });

      await expect(addFavoriteActor('u1', 'actor-1')).rejects.toThrow('Duplicate');
    });
  });

  describe('removeFavoriteActor', () => {
    it('deletes a favorite actor record', async () => {
      const mockEq2 = jest.fn();
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: null });

      await removeFavoriteActor('u1', 'actor-1');
      expect(supabase.from).toHaveBeenCalledWith('favorite_actors');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
      expect(mockEq2).toHaveBeenCalledWith('actor_id', 'actor-1');
    });

    it('throws on error', async () => {
      const mockEq2 = jest.fn();
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: new Error('Not found') });

      await expect(removeFavoriteActor('u1', 'actor-1')).rejects.toThrow('Not found');
    });
  });

  describe('searchActors', () => {
    it('searches actors by name with ilike', async () => {
      mockSelect.mockReturnValue({ ilike: mockIlike });
      mockIlike.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: [], error: null });

      await searchActors('mahesh');
      expect(supabase.from).toHaveBeenCalledWith('actors');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockIlike).toHaveBeenCalledWith('name', '%mahesh%');
      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('returns matching actors', async () => {
      const actors = [{ id: 'a1', name: 'Mahesh Babu' }];
      mockSelect.mockReturnValue({ ilike: mockIlike });
      mockIlike.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: actors, error: null });

      const result = await searchActors('mahesh');
      expect(result).toEqual(actors);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ ilike: mockIlike });
      mockIlike.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: null });

      const result = await searchActors('unknown');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ ilike: mockIlike });
      mockIlike.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(searchActors('test')).rejects.toThrow('DB error');
    });
  });
});
