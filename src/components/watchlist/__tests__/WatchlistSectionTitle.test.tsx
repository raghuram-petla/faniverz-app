jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#000',
      textPrimary: '#fff',
      textTertiary: '#888',
    },
    colors: { red600: '#dc2626' },
  }),
}));

jest.mock('@/styles/tabs/watchlist.styles', () => ({
  createStyles: () =>
    new Proxy(
      {},
      {
        get: () => ({}),
      },
    ),
}));

jest.mock('@/hooks/useAnimationsEnabled', () => ({
  useAnimationsEnabled: () => true,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SectionTitle } from '../WatchlistSectionTitle';

describe('SectionTitle', () => {
  it('renders title and icon', () => {
    render(
      <SectionTitle
        iconName="play-circle-outline"
        iconColor="#22c55e"
        title="Available to Watch"
      />,
    );
    expect(screen.getByText('Available to Watch')).toBeTruthy();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    render(
      <SectionTitle
        iconName="play-circle-outline"
        iconColor="#22c55e"
        title="Available"
        onToggle={onToggle}
      />,
    );
    fireEvent.press(screen.getByText('Available'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders in collapsed state', () => {
    render(<SectionTitle iconName="eye-outline" iconColor="#6b7280" title="Watched" collapsed />);
    expect(screen.getByText('Watched')).toBeTruthy();
  });

  it('renders in expanded state', () => {
    render(
      <SectionTitle
        iconName="calendar-outline"
        iconColor="#3b82f6"
        title="Upcoming"
        collapsed={false}
      />,
    );
    expect(screen.getByText('Upcoming')).toBeTruthy();
  });
});
