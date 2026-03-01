const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockIlike = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();

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
import {
  fetchFavoriteActors,
  addFavoriteActor,
  removeFavoriteActor,
  searchActors,
  fetchActorById,
  fetchActorFilmography,
} from '../api';

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

  describe('fetchActorById', () => {
    it('fetches a single actor by id', async () => {
      const actor = { id: 'a1', name: 'Nagarjuna' };
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: actor, error: null });

      const result = await fetchActorById('a1');
      expect(supabase.from).toHaveBeenCalledWith('actors');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'a1');
      expect(result).toEqual(actor);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') });

      await expect(fetchActorById('bad-id')).rejects.toThrow('Not found');
    });
  });

  describe('fetchActorFilmography', () => {
    it('fetches credits with movie join for an actor', async () => {
      const credits = [
        {
          id: 'c1',
          actor_id: 'a1',
          movie_id: 'm1',
          credit_type: 'cast',
          role_name: 'Hero',
          display_order: 0,
          movie: { id: 'm1', title: 'Movie A', release_date: '2024-01-01', rating: 4.2 },
        },
        {
          id: 'c2',
          actor_id: 'a1',
          movie_id: 'm2',
          credit_type: 'cast',
          role_name: 'Villain',
          display_order: 1,
          movie: { id: 'm2', title: 'Movie B', release_date: '2025-06-15', rating: 3.8 },
        },
      ];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: credits, error: null });

      const result = await fetchActorFilmography('a1');
      expect(supabase.from).toHaveBeenCalledWith('movie_cast');
      expect(mockSelect).toHaveBeenCalledWith('*, movie:movies(*)');
      expect(mockEq).toHaveBeenCalledWith('actor_id', 'a1');
      // Should be sorted by release_date descending (newest first)
      expect(result[0].movie?.title).toBe('Movie B');
      expect(result[1].movie?.title).toBe('Movie A');
    });

    it('returns empty array when no credits', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: null, error: null });

      const result = await fetchActorFilmography('a1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchActorFilmography('a1')).rejects.toThrow('DB error');
    });
  });
});
