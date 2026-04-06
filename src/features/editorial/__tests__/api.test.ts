const mockRpc = jest.fn();
const mockUpsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: jest.fn(() => ({
      upsert: mockUpsert,
      delete: mockDelete,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchEditorialReview, upsertPollVote, removePollVote, upsertCraftRating } from '../api';

describe('editorial api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchEditorialReview', () => {
    it('calls supabase.rpc with movie id and user id', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'er1' }], error: null });

      await fetchEditorialReview('movie-1', 'user-1');
      expect(mockRpc).toHaveBeenCalledWith('get_editorial_review', {
        p_movie_id: 'movie-1',
        p_user_id: 'user-1',
      });
    });

    it('passes null for user_id when not provided', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'er1' }], error: null });

      await fetchEditorialReview('movie-1');
      expect(mockRpc).toHaveBeenCalledWith('get_editorial_review', {
        p_movie_id: 'movie-1',
        p_user_id: null,
      });
    });

    it('returns first item from data array', async () => {
      const review = { id: 'er1', title: 'Review Title' };
      mockRpc.mockResolvedValue({ data: [review, { id: 'er2' }], error: null });

      const result = await fetchEditorialReview('movie-1');
      expect(result).toEqual(review);
    });

    it('returns null when data is empty array', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await fetchEditorialReview('movie-1');
      expect(result).toBeNull();
    });

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await fetchEditorialReview('movie-1');
      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') });

      await expect(fetchEditorialReview('movie-1')).rejects.toThrow('RPC failed');
    });
  });

  describe('upsertPollVote', () => {
    it('upserts vote with correct params and onConflict', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await upsertPollVote('er1', 'u1', 'agree');
      expect(supabase.from).toHaveBeenCalledWith('editorial_review_polls');
      expect(mockUpsert).toHaveBeenCalledWith(
        { editorial_review_id: 'er1', user_id: 'u1', vote: 'agree' },
        { onConflict: 'editorial_review_id,user_id' },
      );
    });

    it('upserts disagree vote', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await upsertPollVote('er1', 'u1', 'disagree');
      expect(mockUpsert).toHaveBeenCalledWith(
        { editorial_review_id: 'er1', user_id: 'u1', vote: 'disagree' },
        { onConflict: 'editorial_review_id,user_id' },
      );
    });

    it('throws on error', async () => {
      mockUpsert.mockResolvedValue({ error: new Error('Upsert failed') });

      await expect(upsertPollVote('er1', 'u1', 'agree')).rejects.toThrow('Upsert failed');
    });
  });

  describe('removePollVote', () => {
    it('deletes vote matching editorial_review_id and user_id', async () => {
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: null });

      await removePollVote('er1', 'u1');
      expect(supabase.from).toHaveBeenCalledWith('editorial_review_polls');
      expect(mockEq).toHaveBeenCalledWith('editorial_review_id', 'er1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    });

    it('throws on error', async () => {
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: new Error('Delete failed') });

      await expect(removePollVote('er1', 'u1')).rejects.toThrow('Delete failed');
    });
  });

  describe('upsertCraftRating', () => {
    it('upserts rating with dynamic column name', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await upsertCraftRating('m1', 'u1', 'direction' as never, 4);
      expect(supabase.from).toHaveBeenCalledWith('user_craft_ratings');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          movie_id: 'm1',
          user_id: 'u1',
          rating_direction: 4,
        }),
        { onConflict: 'user_id,movie_id' },
      );
    });

    it('includes updated_at in upsert payload', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await upsertCraftRating('m1', 'u1', 'music' as never, 5);
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.updated_at).toBeDefined();
      expect(payload.rating_music).toBe(5);
    });

    it('handles different craft names', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await upsertCraftRating('m1', 'u1', 'screenplay' as never, 3);
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.rating_screenplay).toBe(3);
    });

    it('throws on error', async () => {
      mockUpsert.mockResolvedValue({ error: new Error('Rating failed') });

      await expect(upsertCraftRating('m1', 'u1', 'direction' as never, 4)).rejects.toThrow(
        'Rating failed',
      );
    });
  });
});
