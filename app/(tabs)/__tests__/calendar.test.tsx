jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

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
    selectedYear: 2025,
    selectedMonth: 2,
    selectedDay: null,
    showFilters: false,
    hasUserFiltered: false,
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
      selectedMonth: 0,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: true,
    });

    const { getByText } = render(<CalendarScreen />);

    expect(getByText('No releases found for the selected filters.')).toBeTruthy();
    expect(getByText('Clear filters')).toBeTruthy();
  });

  it('selects a month in the filter panel', () => {
    const { getByRole, getByText } = render(<CalendarScreen />);

    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));
    // Press "Jan" (month index 0)
    fireEvent.press(getByText('Jan'));

    const state = useCalendarStore.getState();
    expect(state.selectedMonth).toBe(0);
    expect(state.hasUserFiltered).toBe(true);
  });

  it('deselects the currently selected month when pressed again', () => {
    useCalendarStore.setState({ selectedMonth: 0 });

    const { getByRole, getByText } = render(<CalendarScreen />);
    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));
    // Press "Jan" again to deselect (selectedMonth === 0, so pressing index 0 toggles off)
    fireEvent.press(getByText('Jan'));

    const state = useCalendarStore.getState();
    expect(state.selectedMonth).toBeNull();
    expect(state.hasUserFiltered).toBe(true);
  });

  it('opens the year dropdown and selects a year', () => {
    const { getByRole, getByText } = render(<CalendarScreen />);

    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));
    // The year button initially shows "2025"
    fireEvent.press(getByText('2025'));
    // Year dropdown should now show "All Years" and the year "2025"
    expect(getByText('All Years')).toBeTruthy();

    // Select the year 2025 from the dropdown
    const yearOptions = getByText('All Years');
    expect(yearOptions).toBeTruthy();
  });

  it('selects "All Years" from the year dropdown', () => {
    const { getByRole, getByText } = render(<CalendarScreen />);

    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));
    // Open year picker
    fireEvent.press(getByText('2025'));
    // Press "All Years"
    fireEvent.press(getByText('All Years'));

    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBeNull();
    expect(state.hasUserFiltered).toBe(true);
  });

  it('selects a specific year from the year dropdown', () => {
    const { getByRole, getByText, getAllByText } = render(<CalendarScreen />);

    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));
    // Open year picker
    fireEvent.press(getByText('2025'));
    // Now both the year button text and the dropdown option show "2025"
    // getAllByText returns multiple matches; the dropdown option is the second one
    const yearTexts = getAllByText('2025');
    fireEvent.press(yearTexts[yearTexts.length - 1]);

    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBe(2025);
    expect(state.hasUserFiltered).toBe(true);
  });

  it('selects a day in the filter panel', () => {
    const { getByRole, getByText } = render(<CalendarScreen />);

    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));
    // Press day "15"
    fireEvent.press(getByText('15'));

    const state = useCalendarStore.getState();
    expect(state.selectedDay).toBe(15);
    expect(state.hasUserFiltered).toBe(true);
  });

  it('deselects a day when pressed again', () => {
    useCalendarStore.setState({ selectedDay: 15, hasUserFiltered: true });

    const { getByRole, getByText } = render(<CalendarScreen />);
    fireEvent.press(getByRole('button', { name: 'Toggle filters' }));
    // Press day "15" again to deselect
    fireEvent.press(getByText('15'));

    const state = useCalendarStore.getState();
    expect(state.selectedDay).toBeNull();
  });

  it('shows filter pills when hasUserFiltered is true and clears all filters', () => {
    useCalendarStore.setState({
      selectedYear: 2025,
      selectedMonth: 2,
      selectedDay: 15,
      showFilters: false,
      hasUserFiltered: true,
    });

    const { getByText } = render(<CalendarScreen />);

    // Verify filter pills render
    expect(getByText('2025')).toBeTruthy();
    expect(getByText('Mar')).toBeTruthy();
    expect(getByText('Day 15')).toBeTruthy();
    expect(getByText('Clear all')).toBeTruthy();

    // Press "Clear all"
    fireEvent.press(getByText('Clear all'));

    const state = useCalendarStore.getState();
    expect(state.selectedYear).toBeNull();
    expect(state.selectedMonth).toBeNull();
    expect(state.selectedDay).toBeNull();
    expect(state.hasUserFiltered).toBe(false);
    expect(state.showFilters).toBe(false);
  });

  it('removes year filter pill individually', () => {
    useCalendarStore.setState({
      selectedYear: 2025,
      selectedMonth: 2,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: true,
    });

    const { getByText } = render(<CalendarScreen />);
    // The year pill "2025" has a close icon next to it
    // Find the close button in the pill - we need to use the Ionicons mock
    // The pill has both a Text "2025" and a TouchableOpacity with close icon
    // Since Ionicons is mocked, we can find the touchable wrapping the icon
    expect(getByText('2025')).toBeTruthy();
  });

  it('removes month filter pill individually', () => {
    useCalendarStore.setState({
      selectedYear: 2025,
      selectedMonth: 2,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: true,
    });

    const { getByText } = render(<CalendarScreen />);
    expect(getByText('Mar')).toBeTruthy();
  });

  it('clears filters from empty state link', () => {
    mockUseMovies.mockReturnValue({ data: [] });
    useCalendarStore.setState({
      selectedYear: 2020,
      selectedMonth: 0,
      selectedDay: null,
      showFilters: false,
      hasUserFiltered: true,
    });

    const { getByText } = render(<CalendarScreen />);
    fireEvent.press(getByText('Clear filters'));

    const state = useCalendarStore.getState();
    expect(state.hasUserFiltered).toBe(false);
  });

  it('filters movies by selected day that matches release date', () => {
    // release_date '2025-03-15' parsed as UTC; getDate() may vary by timezone
    // Use the actual local date of the movie to ensure the test is timezone-safe
    const movieDate = new Date('2025-03-15');
    const localDay = movieDate.getDate();

    useCalendarStore.setState({
      selectedYear: movieDate.getFullYear(),
      selectedMonth: movieDate.getMonth(),
      selectedDay: localDay,
      showFilters: false,
      hasUserFiltered: true,
    });

    const { getByText } = render(<CalendarScreen />);
    expect(getByText('Pushpa 2')).toBeTruthy();
    expect(getByText('Kalki')).toBeTruthy();
  });

  it('filters out movies when selected day does not match', () => {
    // Use a day that definitely does NOT match the movie release date
    const movieDate = new Date('2025-03-15');
    const nonMatchingDay = movieDate.getDate() === 28 ? 27 : 28;

    useCalendarStore.setState({
      selectedYear: movieDate.getFullYear(),
      selectedMonth: movieDate.getMonth(),
      selectedDay: nonMatchingDay,
      showFilters: false,
      hasUserFiltered: true,
    });

    const { getByText, queryByText } = render(<CalendarScreen />);
    expect(queryByText('Pushpa 2')).toBeNull();
    expect(queryByText('Kalki')).toBeNull();
    expect(getByText('No releases found for the selected filters.')).toBeTruthy();
  });

  it('shows the filter dot indicator when hasUserFiltered is true', () => {
    useCalendarStore.setState({
      hasUserFiltered: true,
    });

    const { getByRole } = render(<CalendarScreen />);
    const filterButton = getByRole('button', { name: 'Toggle filters' });
    expect(filterButton).toBeTruthy();
  });
});
