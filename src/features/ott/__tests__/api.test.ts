const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchPlatforms, fetchOttReleases, fetchMoviePlatformMap } from '../api';

describe('ott api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPlatforms', () => {
    it('queries the platforms table ordered by display_order', async () => {
      mockSelect.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: [], error: null });

      await fetchPlatforms();

      expect(supabase.from).toHaveBeenCalledWith('platforms');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('display_order', { ascending: true });
    });

    it('returns platform data', async () => {
      const mockData = [
        { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 },
      ];
      mockSelect.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchPlatforms();
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchPlatforms();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchPlatforms()).rejects.toThrow('DB error');
    });
  });

  describe('fetchOttReleases', () => {
    it('queries movie_platforms with joined platform data', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: [], error: null });

      await fetchOttReleases('movie-1');

      expect(supabase.from).toHaveBeenCalledWith('movie_platforms');
      expect(mockSelect).toHaveBeenCalledWith('*, platform:platforms(*)');
      expect(mockEq).toHaveBeenCalledWith('movie_id', 'movie-1');
    });

    it('returns release data', async () => {
      const mockData = [{ id: 'mp1', movie_id: 'movie-1', platform: { id: 'netflix' } }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchOttReleases('movie-1');
      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: null, error: null });

      const result = await fetchOttReleases('movie-1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: null, error: new Error('Query error') });

      await expect(fetchOttReleases('movie-1')).rejects.toThrow('Query error');
    });
  });

  describe('fetchMoviePlatformMap', () => {
    it('returns empty object for empty movieIds array', async () => {
      const result = await fetchMoviePlatformMap([]);
      expect(result).toEqual({});
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('queries movie_platforms with in() for movie IDs', async () => {
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockResolvedValue({ data: [], error: null });

      await fetchMoviePlatformMap(['m1', 'm2']);

      expect(supabase.from).toHaveBeenCalledWith('movie_platforms');
      expect(mockSelect).toHaveBeenCalledWith('movie_id, platform:platforms(*)');
      expect(mockIn).toHaveBeenCalledWith('movie_id', ['m1', 'm2']);
    });

    it('builds map correctly from results', async () => {
      const mockData = [
        { movie_id: 'm1', platform: { id: 'netflix', name: 'Netflix' } },
        { movie_id: 'm1', platform: { id: 'aha', name: 'Aha' } },
        { movie_id: 'm2', platform: { id: 'netflix', name: 'Netflix' } },
      ];
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchMoviePlatformMap(['m1', 'm2']);

      expect(Object.keys(result)).toEqual(['m1', 'm2']);
      expect(result['m1']).toHaveLength(2);
      expect(result['m2']).toHaveLength(1);
    });

    it('handles null data gracefully', async () => {
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockResolvedValue({ data: null, error: null });

      const result = await fetchMoviePlatformMap(['m1']);
      expect(result).toEqual({});
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockResolvedValue({ data: null, error: new Error('Map error') });

      await expect(fetchMoviePlatformMap(['m1'])).rejects.toThrow('Map error');
    });
  });
});
