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

jest.mock('@/utils/getDeviceCountry', () => ({
  getDeviceCountry: jest.fn(() => 'IN'),
}));

import { supabase } from '@/lib/supabase';
import {
  fetchPlatforms,
  fetchOttReleases,
  fetchMoviePlatformMap,
  fetchMovieAvailability,
} from '../api';

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
        {
          id: 'netflix',
          name: 'Netflix',
          logo: 'N',
          logo_url: null,
          color: '#E50914',
          display_order: 1,
        },
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

  describe('fetchMovieAvailability', () => {
    it('queries movie_platform_availability for the device country', async () => {
      const mockEq2 = jest.fn();
      const mockEq3 = jest.fn();
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockEq3 });
      mockEq3.mockResolvedValue({ data: [], error: null });

      await fetchMovieAvailability('movie-1');

      expect(supabase.from).toHaveBeenCalledWith('movie_platform_availability');
      expect(mockEq).toHaveBeenCalledWith('movie_id', 'movie-1');
      expect(mockEq2).toHaveBeenCalledWith('country_code', 'IN');
    });

    it('groups availability data by type into result object', async () => {
      const mockEq2 = jest.fn();
      const mockEq3 = jest.fn();
      const mockData = [
        { availability_type: 'flatrate', platform: { id: 'netflix' }, movie_id: 'movie-1' },
        { availability_type: 'flatrate', platform: { id: 'aha' }, movie_id: 'movie-1' },
        { availability_type: 'rent', platform: { id: 'prime' }, movie_id: 'movie-1' },
        { availability_type: 'buy', platform: { id: 'prime' }, movie_id: 'movie-1' },
      ];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockEq3 });
      mockEq3.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchMovieAvailability('movie-1');

      expect(result.flatrate).toHaveLength(2);
      expect(result.rent).toHaveLength(1);
      expect(result.buy).toHaveLength(1);
      expect(result.ads).toHaveLength(0);
      expect(result.free).toHaveLength(0);
    });

    it('returns empty groups when data is null', async () => {
      const mockEq2 = jest.fn();
      const mockEq3 = jest.fn();
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockEq3 });
      mockEq3.mockResolvedValue({ data: null, error: null });

      const result = await fetchMovieAvailability('movie-1');

      expect(result.flatrate).toHaveLength(0);
      expect(result.rent).toHaveLength(0);
      expect(result.buy).toHaveLength(0);
      expect(result.ads).toHaveLength(0);
      expect(result.free).toHaveLength(0);
    });

    it('throws on error', async () => {
      const mockEq2 = jest.fn();
      const mockEq3 = jest.fn();
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockEq3 });
      mockEq3.mockResolvedValue({ data: null, error: new Error('Availability query failed') });

      await expect(fetchMovieAvailability('movie-1')).rejects.toThrow('Availability query failed');
    });

    it('skips rows with unknown availability_type without crashing', async () => {
      const mockEq2 = jest.fn();
      const mockEq3 = jest.fn();
      const mockData = [
        { availability_type: 'flatrate', platform: { id: 'netflix' }, movie_id: 'movie-1' },
        { availability_type: 'unknown_future_type', platform: { id: 'foo' }, movie_id: 'movie-1' },
        { availability_type: 'rent', platform: { id: 'prime' }, movie_id: 'movie-1' },
      ];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ order: mockEq3 });
      mockEq3.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchMovieAvailability('movie-1');

      // Known types are grouped correctly
      expect(result.flatrate).toHaveLength(1);
      expect(result.rent).toHaveLength(1);
      // Unknown type is silently skipped — no crash, no extra entries
      expect(result.buy).toHaveLength(0);
      expect(result.ads).toHaveLength(0);
      expect(result.free).toHaveLength(0);
    });
  });

  describe('fetchMoviePlatformMap', () => {
    it('returns empty object for empty movieIds array', async () => {
      const result = await fetchMoviePlatformMap([]);
      expect(result).toEqual({});
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('queries movie_platform_availability with country and type filters', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ data: [], error: null });

      await fetchMoviePlatformMap(['m1', 'm2']);

      expect(supabase.from).toHaveBeenCalledWith('movie_platform_availability');
      expect(mockSelect).toHaveBeenCalledWith('movie_id, platform:platforms(*)');
      expect(mockIn).toHaveBeenCalledWith('movie_id', ['m1', 'm2']);
      expect(mockEq).toHaveBeenCalledWith('country_code', expect.any(String));
      expect(mockEq2).toHaveBeenCalledWith('availability_type', 'flatrate');
    });

    it('builds map correctly from results', async () => {
      const mockData = [
        { movie_id: 'm1', platform: { id: 'netflix', name: 'Netflix' } },
        { movie_id: 'm1', platform: { id: 'aha', name: 'Aha' } },
        { movie_id: 'm2', platform: { id: 'netflix', name: 'Netflix' } },
      ];
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchMoviePlatformMap(['m1', 'm2']);

      expect(Object.keys(result)).toEqual(['m1', 'm2']);
      expect(result['m1']).toHaveLength(2);
      expect(result['m2']).toHaveLength(1);
    });

    it('handles null data gracefully', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ data: null, error: null });

      const result = await fetchMoviePlatformMap(['m1']);
      expect(result).toEqual({});
    });

    it('throws on error', async () => {
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ data: null, error: new Error('Map error') });

      await expect(fetchMoviePlatformMap(['m1'])).rejects.toThrow('Map error');
    });

    it('deduplicates platforms per movie', async () => {
      const mockData = [
        { movie_id: 'm1', platform: { id: 'netflix', name: 'Netflix' } },
        { movie_id: 'm1', platform: { id: 'netflix', name: 'Netflix' } },
      ];
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchMoviePlatformMap(['m1']);
      expect(result['m1']).toHaveLength(1);
    });

    it('skips items with null platform', async () => {
      const mockData = [
        { movie_id: 'm1', platform: null },
        { movie_id: 'm1', platform: { id: 'netflix', name: 'Netflix' } },
      ];
      const mockEq2 = jest.fn();
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchMoviePlatformMap(['m1']);
      expect(result['m1']).toHaveLength(1);
      expect(result['m1'][0].id).toBe('netflix');
    });
  });
});
