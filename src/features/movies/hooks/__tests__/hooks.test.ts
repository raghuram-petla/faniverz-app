jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue({ data: [], error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue({ data: null, error: null }),
      or: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue({ data: [], error: null }),
    }),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';

// Verify hook query key and staleTime patterns by importing them
import { useMoviesByMonth } from '../useMoviesByMonth';
import { useMovieDetail, useMovieCast } from '../useMovieDetail';
import { useMovieSearch } from '../useMovieSearch';

describe('movie hooks', () => {
  describe('useMoviesByMonth', () => {
    it('is exported as a function', () => {
      expect(typeof useMoviesByMonth).toBe('function');
    });
  });

  describe('useMovieDetail', () => {
    it('is exported as a function', () => {
      expect(typeof useMovieDetail).toBe('function');
    });
  });

  describe('useMovieCast', () => {
    it('is exported as a function', () => {
      expect(typeof useMovieCast).toBe('function');
    });
  });

  describe('useMovieSearch', () => {
    it('is exported as a function', () => {
      expect(typeof useMovieSearch).toBe('function');
    });
  });

  describe('query keys', () => {
    it('uses correct query key constants', () => {
      expect(QUERY_KEYS.MOVIES).toBe('movies');
      expect(QUERY_KEYS.MOVIE).toBe('movie');
    });

    it('has correct stale times', () => {
      expect(STALE_TIMES.MOVIES).toBe(5 * 60 * 1000);
      expect(STALE_TIMES.MOVIE_DETAIL).toBe(10 * 60 * 1000);
    });
  });
});
