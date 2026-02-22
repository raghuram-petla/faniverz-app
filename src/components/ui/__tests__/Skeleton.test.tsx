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

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

import Skeleton from '../Skeleton';
import CalendarSkeleton from '../CalendarSkeleton';
import MovieCardSkeleton from '../MovieCardSkeleton';
import MovieDetailSkeleton from '../MovieDetailSkeleton';

describe('Skeleton', () => {
  it('renders base skeleton', () => {
    render(<Skeleton width={100} height={20} />);
    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });

  it('applies custom border radius', () => {
    render(<Skeleton width={50} height={50} borderRadius={25} />);
    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });
});

describe('CalendarSkeleton', () => {
  it('renders calendar skeleton', () => {
    render(<CalendarSkeleton />);
    expect(screen.getByTestId('calendar-skeleton')).toBeTruthy();
  });
});

describe('MovieCardSkeleton', () => {
  it('renders movie card skeleton', () => {
    render(<MovieCardSkeleton />);
    expect(screen.getByTestId('movie-card-skeleton')).toBeTruthy();
  });
});

describe('MovieDetailSkeleton', () => {
  it('renders movie detail skeleton', () => {
    render(<MovieDetailSkeleton />);
    expect(screen.getByTestId('movie-detail-skeleton')).toBeTruthy();
  });
});
