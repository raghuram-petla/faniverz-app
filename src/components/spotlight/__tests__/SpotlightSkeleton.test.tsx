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

jest.mock('../SpotlightSkeleton.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
  HERO_HEIGHT: 600,
  SCREEN_WIDTH: 400,
  CARD_WIDTH: 128,
  CARD_POSTER_HEIGHT: 192,
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SpotlightSkeleton } from '../SpotlightSkeleton';

describe('SpotlightSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SpotlightSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the root container', () => {
    render(<SpotlightSkeleton />);
    expect(screen.getByTestId('spotlight-skeleton')).toBeTruthy();
  });

  it('renders the hero skeleton', () => {
    render(<SpotlightSkeleton />);
    expect(screen.getByTestId('hero-skeleton')).toBeTruthy();
  });

  it('renders the theaters section skeleton', () => {
    render(<SpotlightSkeleton />);
    expect(screen.getByTestId('section-skeleton-theaters')).toBeTruthy();
  });

  it('renders the streaming section skeleton', () => {
    render(<SpotlightSkeleton />);
    expect(screen.getByTestId('section-skeleton-streaming')).toBeTruthy();
  });

  it('renders the coming soon section skeleton', () => {
    render(<SpotlightSkeleton />);
    expect(screen.getByTestId('section-skeleton-coming-soon')).toBeTruthy();
  });

  it('renders multiple skeleton boxes across sections', () => {
    render(<SpotlightSkeleton />);
    const boxes = screen.getAllByTestId('skeleton-box');
    // Each SectionSkeleton has 1 header box + 3*(1 card box + 1 title box) = 7 boxes
    // Two SectionSkeletons = 14
    // Coming soon section has similar structure + subsection title = ~8
    // Hero = 1
    // Total should be > 10
    expect(boxes.length).toBeGreaterThanOrEqual(10);
  });
});
