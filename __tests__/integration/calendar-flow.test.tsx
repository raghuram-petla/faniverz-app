/**
 * Integration test: Calendar flow
 * Verifies: navigate months → tap day → see movies → filter toggle
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('@/features/ott/hooks', () => ({
  useRecentOttReleases: () => ({ data: [] }),
}));

import type { CalendarEntry } from '@/types/movie';

// Create test data for current month
const makeEntry = (
  day: number,
  title: string,
  dotType: CalendarEntry['dotType']
): CalendarEntry => ({
  date: `2026-02-${String(day).padStart(2, '0')}`,
  dotType,
  movie: {
    id: day,
    tmdb_id: day * 100,
    title,
    title_te: null,
    original_title: title,
    overview: `Overview for ${title}`,
    overview_te: null,
    poster_path: '/poster.jpg',
    backdrop_path: null,
    release_date: `2026-02-${String(day).padStart(2, '0')}`,
    runtime: 120,
    genres: ['Drama'],
    certification: 'UA',
    vote_average: 7.0,
    vote_count: 50,
    popularity: 30,
    content_type: 'movie',
    release_type: dotType === 'theatrical' ? 'theatrical' : 'ott_original',
    status: 'upcoming',
    trailer_youtube_key: null,
    is_featured: false,
    tmdb_last_synced_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
});

const mockEntries: CalendarEntry[] = [
  makeEntry(10, 'Telugu Movie A', 'theatrical'),
  makeEntry(10, 'Telugu Movie B', 'ott_premiere'),
  makeEntry(15, 'Telugu Movie C', 'ott_original'),
  makeEntry(20, 'Telugu Movie D', 'theatrical'),
];

jest.mock('@/features/movies/hooks/useMoviesByMonth', () => ({
  useMoviesByMonth: () => ({
    data: mockEntries,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

const mockSearchHook = jest.fn().mockReturnValue({
  data: [],
  debouncedQuery: '',
  isLoading: false,
});
jest.mock('@/features/movies/hooks/useMovieSearch', () => ({
  useMovieSearch: (...args: unknown[]) => mockSearchHook(...args),
}));

// Import components that use these mocks
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarDay from '@/components/calendar/CalendarDay';
import CalendarFilter from '@/components/calendar/CalendarFilter';
import {
  groupEntriesByDate,
  filterEntriesByReleaseType,
  getDotsForDate,
} from '@/features/movies/utils/transformers';

describe('Calendar Flow Integration', () => {
  describe('CalendarHeader navigation', () => {
    it('renders month and year', () => {
      render(<CalendarHeader month={1} year={2026} onPrev={jest.fn()} onNext={jest.fn()} />);
      expect(screen.getByTestId('month-year')).toBeTruthy();
    });

    it('navigates months via prev/next', () => {
      const onPrev = jest.fn();
      const onNext = jest.fn();
      render(<CalendarHeader month={1} year={2026} onPrev={onPrev} onNext={onNext} />);

      fireEvent.press(screen.getByTestId('prev-month'));
      expect(onPrev).toHaveBeenCalled();

      fireEvent.press(screen.getByTestId('next-month'));
      expect(onNext).toHaveBeenCalled();
    });
  });

  describe('CalendarDay dots', () => {
    const grouped = groupEntriesByDate(mockEntries);

    it('shows correct entries for a date with multiple entries', () => {
      const entries = getDotsForDate(grouped, '2026-02-10');
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.dotType)).toContain('theatrical');
      expect(entries.map((e) => e.dotType)).toContain('ott_premiere');
    });

    it('shows single entry for single entry date', () => {
      const entries = getDotsForDate(grouped, '2026-02-15');
      expect(entries).toHaveLength(1);
      expect(entries[0].dotType).toBe('ott_original');
    });

    it('shows no entries for empty date', () => {
      const entries = getDotsForDate(grouped, '2026-02-01');
      expect(entries).toEqual([]);
    });
  });

  describe('CalendarFilter integration', () => {
    it('filters to theatrical only', () => {
      const filtered = filterEntriesByReleaseType(mockEntries, 'theatrical');
      expect(filtered.every((e) => e.dotType === 'theatrical')).toBe(true);
      expect(filtered).toHaveLength(2);
    });

    it('filters to OTT only', () => {
      const filtered = filterEntriesByReleaseType(mockEntries, 'ott');
      expect(filtered.every((e) => e.dotType !== 'theatrical')).toBe(true);
      expect(filtered).toHaveLength(2);
    });

    it('shows all entries with no filter', () => {
      const filtered = filterEntriesByReleaseType(mockEntries, 'all');
      expect(filtered).toHaveLength(4);
    });

    it('filter toggle calls onChange', () => {
      const onChange = jest.fn();
      render(<CalendarFilter selected="all" onChange={onChange} />);

      fireEvent.press(screen.getByText('Theatrical'));
      expect(onChange).toHaveBeenCalledWith('theatrical');

      fireEvent.press(screen.getByText('OTT'));
      expect(onChange).toHaveBeenCalledWith('ott');
    });
  });

  describe('Day selection flow', () => {
    it('CalendarDay renders and is pressable', () => {
      const onPress = jest.fn();
      render(
        <CalendarDay
          day={10}
          isCurrentMonth={true}
          dots={['theatrical', 'ott_premiere']}
          isSelected={false}
          isToday={false}
          onPress={onPress}
        />
      );

      fireEvent.press(screen.getByTestId('calendar-day-10'));
      expect(onPress).toHaveBeenCalled();
    });

    it('selected day shows selected state', () => {
      render(
        <CalendarDay
          day={10}
          isCurrentMonth={true}
          dots={['theatrical']}
          isSelected={true}
          isToday={false}
          onPress={jest.fn()}
        />
      );

      expect(screen.getByTestId('calendar-day-10')).toBeTruthy();
    });
  });
});
