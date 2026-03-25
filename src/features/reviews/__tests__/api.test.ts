const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
      update: mockUpdate,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import {
  fetchMovieReviews,
  fetchUserReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleHelpful,
} from '../api';

describe('reviews api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMovieReviews', () => {
    it('queries reviews with profile join for a movie', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: [], error: null });

      await fetchMovieReviews('movie-1');
      expect(supabase.from).toHaveBeenCalledWith('reviews');
      expect(mockSelect).toHaveBeenCalledWith('*, profile:profiles(id, display_name, avatar_url)');
      expect(mockEq).toHaveBeenCalledWith('movie_id', 'movie-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('returns data on success', async () => {
      const reviews = [{ id: 'r1', content: 'Great!' }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: reviews, error: null });

      const result = await fetchMovieReviews('movie-1');
      expect(result).toEqual(reviews);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: null });

      const result = await fetchMovieReviews('movie-1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchMovieReviews('movie-1')).rejects.toThrow('DB error');
    });
  });

  describe('fetchUserReviews', () => {
    it('queries reviews with movie join for a user', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: [], error: null });

      await fetchUserReviews('user-1');
      expect(supabase.from).toHaveBeenCalledWith('reviews');
      expect(mockSelect).toHaveBeenCalledWith('*, movie:movies(id, title, poster_url)');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('returns data on success', async () => {
      const reviews = [{ id: 'r1', rating: 5 }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: reviews, error: null });

      const result = await fetchUserReviews('user-1');
      expect(result).toEqual(reviews);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('Fail') });

      await expect(fetchUserReviews('user-1')).rejects.toThrow('Fail');
    });
  });

  describe('createReview', () => {
    it('inserts a new review and returns it', async () => {
      const input = { movie_id: 'm1', user_id: 'u1', rating: 4, content: 'Good' };
      const created = { id: 'r1', ...input };
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: created, error: null });

      const result = await createReview(input as never);
      expect(supabase.from).toHaveBeenCalledWith('reviews');
      expect(mockInsert).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });

    it('throws on error', async () => {
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: null, error: new Error('Validation') });

      await expect(createReview({} as never)).rejects.toThrow('Validation');
    });
  });

  describe('updateReview', () => {
    it('updates a review by id and returns it', async () => {
      const input = { rating: 5, content: 'Updated' };
      const updated = { id: 'r1', ...input };
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: updated, error: null });

      const result = await updateReview('r1', input as never);
      expect(supabase.from).toHaveBeenCalledWith('reviews');
      expect(mockUpdate).toHaveBeenCalledWith(input);
      expect(mockEq).toHaveBeenCalledWith('id', 'r1');
      expect(result).toEqual(updated);
    });

    it('throws on error', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') });

      await expect(updateReview('r1', {} as never)).rejects.toThrow('Not found');
    });
  });

  describe('deleteReview', () => {
    it('deletes a review by id', async () => {
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await deleteReview('r1');
      expect(supabase.from).toHaveBeenCalledWith('reviews');
      expect(mockEq).toHaveBeenCalledWith('id', 'r1');
    });

    it('throws on error', async () => {
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: new Error('Failed') });

      await expect(deleteReview('r1')).rejects.toThrow('Failed');
    });
  });

  describe('toggleHelpful', () => {
    it('removes helpful mark when already exists', async () => {
      // Delete finds existing row
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: [{ id: 'h1' }], error: null }),
            }),
          }),
        }),
      }));

      const result = await toggleHelpful('u1', 'r1');
      expect(result).toBe(false);
    });

    it('adds helpful mark when not exists', async () => {
      // Delete finds nothing
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }));

      // Upsert
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }));

      const result = await toggleHelpful('u1', 'r1');
      expect(result).toBe(true);
    });

    it('throws when upsert fails after successful delete with empty result', async () => {
      // Delete finds nothing — fall through to upsert
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }));

      // Upsert fails
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        upsert: jest.fn().mockResolvedValue({ error: new Error('Upsert constraint error') }),
      }));

      await expect(toggleHelpful('u1', 'r1')).rejects.toThrow('Upsert constraint error');
    });

    it('throws when delete operation fails — does NOT fall through to upsert', async () => {
      // Regression: previously the delete error was not checked, so a failed delete
      // would fall through to upsert and create a duplicate helpful vote instead.
      const deleteError = new Error('RLS rejected delete');
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: null, error: deleteError }),
            }),
          }),
        }),
      }));

      // upsert should never be called
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        upsert: upsertMock,
      }));

      await expect(toggleHelpful('u1', 'r1')).rejects.toThrow('RLS rejected delete');
      expect(upsertMock).not.toHaveBeenCalled();
    });
  });
});
