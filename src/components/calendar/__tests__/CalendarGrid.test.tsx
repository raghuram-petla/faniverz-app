import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

import CalendarGrid from '../CalendarGrid';
import type { CalendarEntry, Movie } from '@/types/movie';

const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  tmdb_id: 100,
  title: 'Test Movie',
  title_te: null,
  original_title: 'Test Movie',
  overview: 'Overview',
  overview_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: null,
  release_date: '2026-02-15',
  runtime: 120,
  genres: ['Action'],
  certification: 'UA',
  vote_average: 7.5,
  vote_count: 100,
  popularity: 50,
  content_type: 'movie',
  release_type: 'theatrical',
  status: 'upcoming',
  trailer_youtube_key: null,
  is_featured: false,
  tmdb_last_synced_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('CalendarGrid', () => {
  const defaultProps = {
    month: 1, // February 2026
    year: 2026,
    selectedDate: new Date(2026, 1, 15),
    entriesByDate: {} as Record<string, CalendarEntry[]>,
    onDayPress: jest.fn(),
  };

  it('renders calendar grid', () => {
    render(<CalendarGrid {...defaultProps} />);
    expect(screen.getByTestId('calendar-grid')).toBeTruthy();
  });

  it('renders weekday labels', () => {
    render(<CalendarGrid {...defaultProps} />);
    expect(screen.getByText('Sun')).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Tue')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
    expect(screen.getByText('Thu')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
  });

  it('renders days for the month', () => {
    render(<CalendarGrid {...defaultProps} />);
    // February 2026 has 28 days
    expect(screen.getByTestId('calendar-day-1')).toBeTruthy();
    expect(screen.getByTestId('calendar-day-28')).toBeTruthy();
  });

  it('renders dots for entries', () => {
    const entriesByDate: Record<string, CalendarEntry[]> = {
      '2026-02-15': [
        {
          date: '2026-02-15',
          movie: makeMovie(),
          dotType: 'theatrical',
        },
      ],
    };
    render(<CalendarGrid {...defaultProps} entriesByDate={entriesByDate} />);
    expect(screen.getByTestId('dot-theatrical')).toBeTruthy();
  });
});
