import {
  fetchReviewsForMovie,
  fetchMyReview,
  insertReview,
  updateReview,
  deleteReview,
} from '../api';

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockEq2 = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
  },
}));

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchReviewsForMovie', () => {
    it('fetches reviews with profile join, sorted and paginated', async () => {
      const mockData = [{ id: 1, rating: 4, profile: { display_name: 'User' } }];
      mockRange.mockResolvedValue({ data: mockData, error: null });
      mockOrder.mockReturnValue({ range: mockRange });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchReviewsForMovie(42, 'recent', 0, 10);

      expect(mockSelect).toHaveBeenCalledWith('*, profile:profiles(display_name, avatar_url)');
      expect(mockEq).toHaveBeenCalledWith('movie_id', 42);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual(mockData);
    });

    it('sorts by highest rating', async () => {
      mockRange.mockResolvedValue({ data: [], error: null });
      mockOrder.mockReturnValue({ range: mockRange });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      await fetchReviewsForMovie(42, 'highest');
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false });
    });

    it('sorts by lowest rating', async () => {
      mockRange.mockResolvedValue({ data: [], error: null });
      mockOrder.mockReturnValue({ range: mockRange });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      await fetchReviewsForMovie(42, 'lowest');
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: true });
    });

    it('throws on error', async () => {
      mockRange.mockResolvedValue({ data: null, error: new Error('DB error') });
      mockOrder.mockReturnValue({ range: mockRange });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      await expect(fetchReviewsForMovie(42)).rejects.toThrow('DB error');
    });
  });

  describe('fetchMyReview', () => {
    it('fetches user review for a movie', async () => {
      const mockData = { id: 1, rating: 5 };
      mockMaybeSingle.mockResolvedValue({ data: mockData, error: null });
      mockEq2.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchMyReview(42, 'user-1');
      expect(result).toEqual(mockData);
    });

    it('returns null when no review exists', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      mockEq2.mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchMyReview(42, 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('insertReview', () => {
    it('inserts a review', async () => {
      const mockData = { id: 1, rating: 4, movie_id: 42, user_id: 'user-1' };
      mockSingle.mockResolvedValue({ data: mockData, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({ select: mockSelect });

      const result = await insertReview('user-1', { movie_id: 42, rating: 4 });
      expect(mockInsert).toHaveBeenCalledWith({ movie_id: 42, rating: 4, user_id: 'user-1' });
      expect(result).toEqual(mockData);
    });
  });

  describe('updateReview', () => {
    it('updates a review', async () => {
      const mockData = { id: 1, rating: 5 };
      mockSingle.mockResolvedValue({ data: mockData, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ select: mockSelect });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const result = await updateReview(1, { rating: 5 });
      expect(mockUpdate).toHaveBeenCalledWith({ rating: 5 });
      expect(result).toEqual(mockData);
    });
  });

  describe('deleteReview', () => {
    it('deletes a review', async () => {
      mockEq.mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEq });

      await deleteReview(1);
      expect(mockEq).toHaveBeenCalledWith('id', 1);
    });

    it('throws on error', async () => {
      mockEq.mockResolvedValue({ error: new Error('Not found') });
      mockDelete.mockReturnValue({ eq: mockEq });

      await expect(deleteReview(99)).rejects.toThrow('Not found');
    });
  });
});
