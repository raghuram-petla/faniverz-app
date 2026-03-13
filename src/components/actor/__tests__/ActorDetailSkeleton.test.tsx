import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ActorDetailSkeleton } from '../ActorDetailSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ width, height, borderRadius }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return (
      <View
        testID="skeleton-box"
        accessibilityLabel={`skeleton-${width}x${height}-r${borderRadius}`}
      />
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

describe('ActorDetailSkeleton', () => {
  it('renders with testID', () => {
    render(<ActorDetailSkeleton />);
    expect(screen.getByTestId('actor-detail-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ActorDetailSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders back button skeleton (36x36 circle)', () => {
    render(<ActorDetailSkeleton />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('skeleton-36x36-r18');
  });

  it('renders avatar skeleton (100x100 circle)', () => {
    render(<ActorDetailSkeleton />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('skeleton-100x100-r50');
  });

  it('renders name skeleton', () => {
    render(<ActorDetailSkeleton />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('skeleton-160x20-r4');
  });

  it('renders 3 filmography row skeletons', () => {
    render(<ActorDetailSkeleton />);
    const json = JSON.stringify(screen.toJSON());
    // Each filmography row has a poster skeleton (48x72)
    const posterMatches = json.match(/skeleton-48x72-r6/g);
    expect(posterMatches).toHaveLength(3);
  });

  it('renders skeleton boxes for all sections', () => {
    render(<ActorDetailSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton-box');
    // nav(1) + profile(avatar+name+2badges=4) + bio(3lines=3) + filmography(header+3rows*(poster+info*2)=7) + additional = 18
    expect(skeletons).toHaveLength(18);
  });
});
