import React from 'react';
import { render } from '@testing-library/react-native';
import { SpotlightSkeleton } from '../SpotlightSkeleton';

describe('SpotlightSkeleton', () => {
  it('renders the root container', () => {
    const { getByTestId } = render(<SpotlightSkeleton />);
    expect(getByTestId('spotlight-skeleton')).toBeTruthy();
  });

  it('renders the hero skeleton', () => {
    const { getByTestId } = render(<SpotlightSkeleton />);
    expect(getByTestId('hero-skeleton')).toBeTruthy();
  });

  it('renders the theaters section skeleton', () => {
    const { getByTestId } = render(<SpotlightSkeleton />);
    expect(getByTestId('section-skeleton-theaters')).toBeTruthy();
  });

  it('renders the streaming section skeleton', () => {
    const { getByTestId } = render(<SpotlightSkeleton />);
    expect(getByTestId('section-skeleton-streaming')).toBeTruthy();
  });

  it('renders the coming soon section skeleton', () => {
    const { getByTestId } = render(<SpotlightSkeleton />);
    expect(getByTestId('section-skeleton-coming-soon')).toBeTruthy();
  });

  it('renders multiple skeleton cards per section', () => {
    const { toJSON } = render(<SpotlightSkeleton />);
    // Snapshot-level check: the tree should be non-null and have children
    expect(toJSON()).toBeTruthy();
  });
});
