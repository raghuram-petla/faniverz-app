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

jest.mock('../MovieDetailSkeleton.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
  SCREEN_WIDTH: 400,
  HERO_HEIGHT: 600,
  POSTER_WIDTH: 112,
  POSTER_HEIGHT: 168,
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MovieDetailSkeleton } from '../MovieDetailSkeleton';

describe('MovieDetailSkeleton', () => {
  it('renders with testID', () => {
    render(<MovieDetailSkeleton />);
    expect(screen.getByTestId('movie-detail-skeleton')).toBeTruthy();
  });

  it('renders multiple skeleton boxes', () => {
    render(<MovieDetailSkeleton />);
    const boxes = screen.getAllByTestId('skeleton-box');
    // Hero backdrop + poster + 4 text lines + 4 tab bars + 4 content lines = 13
    expect(boxes.length).toBeGreaterThanOrEqual(10);
  });
});
