import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

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

jest.mock('@/features/movies/hooks/useMoviesByMonth', () => ({
  useMoviesByMonth: () => ({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

const mockUseMovieSearch = jest.fn();
jest.mock('@/features/movies/hooks/useMovieSearch', () => ({
  useMovieSearch: (...args: unknown[]) => mockUseMovieSearch(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('@/features/ott/hooks', () => ({
  useRecentOttReleases: () => ({ data: [] }),
}));

import ExploreScreen from '../explore';

describe('ExploreScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMovieSearch.mockReturnValue({
      data: [],
      debouncedQuery: '',
      isLoading: false,
    });
  });

  it('renders explore screen', () => {
    render(<ExploreScreen />);
    expect(screen.getByTestId('explore-screen')).toBeTruthy();
  });

  it('renders Explore header', () => {
    render(<ExploreScreen />);
    expect(screen.getByText('Explore')).toBeTruthy();
  });

  it('renders search input', () => {
    render(<ExploreScreen />);
    expect(screen.getByTestId('search-input')).toBeTruthy();
  });

  it('shows empty state when no movies', () => {
    render(<ExploreScreen />);
    expect(screen.getByTestId('explore-empty')).toBeTruthy();
  });

  it('renders section list', () => {
    render(<ExploreScreen />);
    expect(screen.getByTestId('explore-sections')).toBeTruthy();
  });

  it('shows clear button when search query is not empty', () => {
    render(<ExploreScreen />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'test');
    expect(screen.getByTestId('search-clear')).toBeTruthy();
  });

  it('shows search results when searching', () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      debouncedQuery: 'test',
      isLoading: false,
    });
    render(<ExploreScreen />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'test');
    expect(screen.getByTestId('search-results')).toBeTruthy();
  });

  it('shows no movies found when search returns empty', () => {
    mockUseMovieSearch.mockReturnValue({
      data: [],
      debouncedQuery: 'xyz',
      isLoading: false,
    });
    render(<ExploreScreen />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'xyz');
    expect(screen.getByTestId('search-empty')).toBeTruthy();
    expect(screen.getByText('No movies found')).toBeTruthy();
  });

  it('restores sections when search is cleared', () => {
    render(<ExploreScreen />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'test');
    fireEvent.press(screen.getByTestId('search-clear'));
    expect(screen.getByTestId('explore-sections')).toBeTruthy();
  });
});
