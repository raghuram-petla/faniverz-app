import { fetchWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } from '../api';

const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockEq2 = jest.fn();
const mockOrder = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  },
}));

describe('Watchlist API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWatchlist', () => {
    it('fetches user watchlist with movie joins', async () => {
      const mockData = [
        { id: 1, user_id: 'user-1', movie_id: 42, created_at: '2025-01-01', movie: {} },
      ];
      mockOrder.mockResolvedValue({ data: mockData, error: null });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchWatchlist('user-1');

      expect(mockSelect).toHaveBeenCalledWith('*, movie:movies(*)');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(result).toEqual(mockData);
    });

    it('returns empty array when no data', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchWatchlist('user-1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      await expect(fetchWatchlist('user-1')).rejects.toThrow('DB error');
    });
  });

  describe('addToWatchlist', () => {
    it('inserts a watchlist entry', async () => {
      mockInsert.mockResolvedValue({ error: null });

      await addToWatchlist('user-1', 42);

      expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-1', movie_id: 42 });
    });

    it('throws on error', async () => {
      mockInsert.mockResolvedValue({ error: new Error('Duplicate') });

      await expect(addToWatchlist('user-1', 42)).rejects.toThrow('Duplicate');
    });
  });

  describe('removeFromWatchlist', () => {
    it('deletes a watchlist entry', async () => {
      mockEq2.mockResolvedValue({ error: null });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockDelete.mockReturnValue({ eq: mockEq });

      await removeFromWatchlist('user-1', 42);

      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockEq2).toHaveBeenCalledWith('movie_id', 42);
    });

    it('throws on error', async () => {
      mockEq2.mockResolvedValue({ error: new Error('Not found') });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockDelete.mockReturnValue({ eq: mockEq });

      await expect(removeFromWatchlist('user-1', 42)).rejects.toThrow('Not found');
    });
  });

  describe('isInWatchlist', () => {
    it('returns true when entry exists', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: 1 }, error: null });
      mockEq2.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await isInWatchlist('user-1', 42);
      expect(result).toBe(true);
    });

    it('returns false when no entry', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      mockEq2.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await isInWatchlist('user-1', 99);
      expect(result).toBe(false);
    });

    it('throws on error', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('DB error') });
      mockEq2.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockSelect.mockReturnValue({ eq: mockEq });

      await expect(isInWatchlist('user-1', 42)).rejects.toThrow('DB error');
    });
  });
});
