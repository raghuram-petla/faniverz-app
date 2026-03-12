jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
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
  it('renders with testID', () => {
    render(<CalendarSkeleton />);
    expect(screen.getByTestId('calendar-skeleton')).toBeTruthy();
  });

  it('renders multiple skeleton boxes for date groups', () => {
    render(<CalendarSkeleton />);
    const boxes = screen.getAllByTestId('skeleton-box');
    // Header (2) + 3 date groups × (dateBox + 2 dateInfo + releaseCount + 2 movies × (poster + 3 info)) = 2 + 3*(4 + 2*4) = 2 + 36 = 38
    expect(boxes.length).toBeGreaterThanOrEqual(10);
  });
});
