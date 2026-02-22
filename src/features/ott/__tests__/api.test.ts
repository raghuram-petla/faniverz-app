import { fetchOttReleases, fetchPlatforms } from '../api';

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  },
}));

describe('OTT API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchOttReleases', () => {
    it('fetches OTT releases with platform join for a movie', async () => {
      const mockData = [
        {
          id: 1,
          movie_id: 42,
          platform_id: 1,
          ott_release_date: '2025-06-01',
          deep_link_url: 'https://aha.video/movie/42',
          is_exclusive: true,
          source: 'manual',
          platform: { id: 1, name: 'Aha', slug: 'aha', color: '#FF0000', display_order: 1 },
        },
      ];

      mockOrder.mockResolvedValue({ data: mockData, error: null });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchOttReleases(42);

      expect(mockSelect).toHaveBeenCalledWith('*, platform:platforms(*)');
      expect(mockEq).toHaveBeenCalledWith('movie_id', 42);
      expect(mockOrder).toHaveBeenCalledWith('ott_release_date', { ascending: true });
      expect(result).toEqual(mockData);
    });

    it('returns empty array when no data', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchOttReleases(99);
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });

      await expect(fetchOttReleases(42)).rejects.toThrow('DB error');
    });
  });

  describe('fetchPlatforms', () => {
    it('fetches all platforms ordered by display_order', async () => {
      const mockData = [
        { id: 1, name: 'Aha', slug: 'aha', display_order: 1 },
        { id: 2, name: 'Netflix', slug: 'netflix', display_order: 2 },
      ];

      mockOrder.mockResolvedValue({ data: mockData, error: null });
      mockSelect.mockReturnValue({ order: mockOrder });

      const result = await fetchPlatforms();

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('display_order', { ascending: true });
      expect(result).toEqual(mockData);
    });

    it('returns empty array when no data', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      mockSelect.mockReturnValue({ order: mockOrder });

      const result = await fetchPlatforms();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });
      mockSelect.mockReturnValue({ order: mockOrder });

      await expect(fetchPlatforms()).rejects.toThrow('DB error');
    });
  });
});
