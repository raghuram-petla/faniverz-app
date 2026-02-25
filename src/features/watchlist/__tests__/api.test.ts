const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
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
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  markAsWatched,
  moveBackToWatchlist,
  isMovieWatchlisted,
  fetchWatchlistPaginated,
} from '../api';

describe('watchlist api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWatchlist', () => {
    it('queries watchlists with movie join for the user', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: [], error: null });

      await fetchWatchlist('user-1');
      expect(supabase.from).toHaveBeenCalledWith('watchlists');
      expect(mockSelect).toHaveBeenCalledWith('*, movie:movies(*)');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('added_at', { ascending: false });
    });

    it('returns data on success', async () => {
      const mockData = [{ id: '1', movie_id: 'm1' }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchWatchlist('user-1');
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchWatchlist('user-1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchWatchlist('user-1')).rejects.toThrow('DB error');
    });
  });

  describe('addToWatchlist', () => {
    it('inserts a new watchlist entry', async () => {
      const entry = { id: '1', user_id: 'u1', movie_id: 'm1', status: 'watchlist' };
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: entry, error: null });

      const result = await addToWatchlist('u1', 'm1');
      expect(supabase.from).toHaveBeenCalledWith('watchlists');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'u1',
        movie_id: 'm1',
        status: 'watchlist',
      });
      expect(result).toEqual(entry);
    });

    it('throws on error', async () => {
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: null, error: new Error('Duplicate') });

      await expect(addToWatchlist('u1', 'm1')).rejects.toThrow('Duplicate');
    });
  });

  describe('removeFromWatchlist', () => {
    it('deletes the watchlist entry by user and movie', async () => {
      const mockEq2 = jest.fn();
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: null });

      await removeFromWatchlist('u1', 'm1');
      expect(supabase.from).toHaveBeenCalledWith('watchlists');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
      expect(mockEq2).toHaveBeenCalledWith('movie_id', 'm1');
    });

    it('throws on error', async () => {
      const mockEq2 = jest.fn();
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: new Error('Not found') });

      await expect(removeFromWatchlist('u1', 'm1')).rejects.toThrow('Not found');
    });
  });

  describe('markAsWatched', () => {
    it('updates status to watched', async () => {
      const mockEq2 = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: null });

      await markAsWatched('u1', 'm1');
      expect(supabase.from).toHaveBeenCalledWith('watchlists');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'watched' }));
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
      expect(mockEq2).toHaveBeenCalledWith('movie_id', 'm1');
    });

    it('throws on error', async () => {
      const mockEq2 = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: new Error('Update failed') });

      await expect(markAsWatched('u1', 'm1')).rejects.toThrow('Update failed');
    });
  });

  describe('moveBackToWatchlist', () => {
    it('updates status back to watchlist', async () => {
      const mockEq2 = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: null });

      await moveBackToWatchlist('u1', 'm1');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'watchlist', watched_at: null });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
      expect(mockEq2).toHaveBeenCalledWith('movie_id', 'm1');
    });

    it('throws on error', async () => {
      const mockEq2 = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: new Error('Failed') });

      await expect(moveBackToWatchlist('u1', 'm1')).rejects.toThrow('Failed');
    });
  });

  describe('isMovieWatchlisted', () => {
    it('checks if a movie is in the user watchlist', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockMaybeSingle.mockResolvedValue({
        data: { id: '1', movie_id: 'm1' },
      });

      const result = await isMovieWatchlisted('u1', 'm1');
      expect(supabase.from).toHaveBeenCalledWith('watchlists');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({ id: '1', movie_id: 'm1' });
    });

    it('returns null when not watchlisted', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockMaybeSingle.mockResolvedValue({ data: null });

      const result = await isMovieWatchlisted('u1', 'm1');
      expect(result).toBeNull();
    });
  });

  describe('fetchWatchlistPaginated', () => {
    it('queries watchlists with movie join, ordered, with correct range for page 0', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: [], error: null });

      await fetchWatchlistPaginated('user-1', 0);
      expect(supabase.from).toHaveBeenCalledWith('watchlists');
      expect(mockSelect).toHaveBeenCalledWith('*, movie:movies(*)');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('added_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
    });

    it('calls range(10, 19) for page 1', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: [], error: null });

      await fetchWatchlistPaginated('user-1', 1);
      expect(mockRange).toHaveBeenCalledWith(10, 19);
    });

    it('returns data array on success', async () => {
      const mockData = [{ id: '1', movie_id: 'm1' }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchWatchlistPaginated('user-1', 0);
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: null, error: null });

      const result = await fetchWatchlistPaginated('user-1', 0);
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: null, error: new Error('Paginated failed') });

      await expect(fetchWatchlistPaginated('user-1', 0)).rejects.toThrow('Paginated failed');
    });
  });
});
