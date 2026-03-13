jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/components/ui/SkeletonBox', () => {
  const { View } = require('react-native');
  return {
    SkeletonBox: (props: { testID?: string; width: number; height: number }) => (
      <View
        testID={props.testID ?? 'skeleton-box'}
        style={{ width: props.width, height: props.height }}
      />
    ),
  };
});

jest.mock('@/components/common/SafeAreaCover', () => ({
  SafeAreaCover: () => {
    const { View } = require('react-native');
    return <View testID="safe-area-cover" />;
  },
}));

jest.mock('../CalendarSkeleton.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
  SCREEN_WIDTH: 400,
  DATE_BOX_SIZE: 64,
  MOVIE_ITEM_HEIGHT: 100,
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CalendarSkeleton } from '../CalendarSkeleton';

describe('CalendarSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CalendarSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with testID', () => {
    render(<CalendarSkeleton />);
    expect(screen.getByTestId('calendar-skeleton')).toBeTruthy();
  });

  it('renders SafeAreaCover', () => {
    render(<CalendarSkeleton />);
    expect(screen.getByTestId('safe-area-cover')).toBeTruthy();
  });

  it('renders multiple skeleton boxes for date groups', () => {
    render(<CalendarSkeleton />);
    const boxes = screen.getAllByTestId('skeleton-box');
    // Header (2) + 3 date groups x (dateBox + 2 dateInfo + releaseCount + 2 movies x (poster + 3 info))
    expect(boxes.length).toBeGreaterThanOrEqual(10);
  });

  it('renders header skeleton boxes', () => {
    render(<CalendarSkeleton />);
    const boxes = screen.getAllByTestId('skeleton-box');
    // At least the header's 2 boxes should be present
    expect(boxes.length).toBeGreaterThanOrEqual(2);
  });
});
