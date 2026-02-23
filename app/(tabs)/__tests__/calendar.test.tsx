jest.mock('@/features/movies/hooks/useMovies', () => ({
  useMovies: jest.fn(),
}));

jest.mock('@/features/ott/hooks', () => ({
  useMoviePlatformMap: jest.fn(),
}));

jest.mock('@/components/movie/MovieListItem', () => ({
  MovieListItem: ({ movie }: { movie: { title: string } }) => {
    const { Text } = require('react-native');
    return <Text>{movie.title}</Text>;
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CalendarScreen from '../calendar';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { useMoviePlatformMap } from '@/features/ott/hooks';
import { useCalendarStore } from '@/stores/useCalendarStore';

const mockUseMovies = useMovies as jest.Mock;
const mockUseMoviePlatformMap = useMoviePlatformMap as jest.Mock;

const mockMovies = [
  {
    id: '1',
    title: 'Pushpa 2',
    release_type: 'theatrical',
    release_date: '2025-03-15',
    poster_url: null,
    backdrop_url: null,
    rating: 4.5,
    review_count: 10,
    genres: ['Action'],
    certification: 'UA',
    runtime: 180,
    synopsis: '',
    director: 'Sukumar',
    trailer_url: null,
    tmdb_id: null,
    tmdb_last_synced_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Kalki',
    release_type: 'ott',
    release_date: '2025-03-15',
    poster_url: null,
    backdrop_url: null,
    rating: 4.0,
    review_count: 8,
    genres: ['Sci-Fi'],
    certification: 'UA',
    runtime: 180,
    synopsis: '',
    director: 'Nag Ashwin',
    trailer_url: null,
    tmdb_id: null,
    tmdb_last_synced_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  useCalendarStore.setState({
    selectedYear: null,
    selectedMonth: null,
    selectedDay: null,
    showFilters: false,
  });

  mockUseMovies.mockReturnValue({ data: mockMovies });
  mockUseMoviePlatformMap.mockReturnValue({ data: {} });
});

describe('CalendarScreen', () => {
  it('renders "Release Calendar" header', () => {
    const { getByText } = render(<CalendarScreen />);
    expect(getByText('Release Calendar')).toBeTruthy();
  });

  it('renders filter toggle button', () => {
    const { getByRole } = render(<CalendarScreen />);
    expect(getByRole('button', { name: 'Toggle filters' })).toBeTruthy();
  });

  it('shows filter panel when filter button is pressed', () => {
    const { getByRole, getByText } = render(<CalendarScreen />);

    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));

    expect(getByText('Year')).toBeTruthy();
    expect(getByText('Month')).toBeTruthy();
  });

  it('renders month grid in filter panel', () => {
    const { getByRole, getByText } = render(<CalendarScreen />);

    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));

    expect(getByText('Jan')).toBeTruthy();
    expect(getByText('Feb')).toBeTruthy();
    expect(getByText('Mar')).toBeTruthy();
    expect(getByText('Jun')).toBeTruthy();
    expect(getByText('Dec')).toBeTruthy();
  });

  it('shows movie list when movies exist', () => {
    const { getByText } = render(<CalendarScreen />);

    expect(getByText('Pushpa 2')).toBeTruthy();
    expect(getByText('Kalki')).toBeTruthy();
  });

  it('shows empty state when no movies match filters', () => {
    mockUseMovies.mockReturnValue({ data: [] });

    const { getByText } = render(<CalendarScreen />);

    expect(getByText('No releases found for the selected filters.')).toBeTruthy();
  });

  it('shows empty state with clear filters link when active filters are set and no movies match', () => {
    mockUseMovies.mockReturnValue({ data: [] });

    useCalendarStore.setState({
      selectedYear: 2020,
      selectedMonth: null,
      selectedDay: null,
      showFilters: false,
    });

    const { getByText } = render(<CalendarScreen />);

    expect(getByText('No releases found for the selected filters.')).toBeTruthy();
    expect(getByText('Clear filters')).toBeTruthy();
  });
});
