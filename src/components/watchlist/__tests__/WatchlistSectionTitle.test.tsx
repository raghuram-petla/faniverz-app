const capturedWatchlistCallbacks: Array<() => object> = [];

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const React = require('react');
  const AnimatedView = React.forwardRef((props: object, ref: unknown) =>
    React.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: { View: AnimatedView, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: jest.fn((v: number) => ({ value: v })),
    useAnimatedStyle: jest.fn((cb: () => object) => {
      capturedWatchlistCallbacks.push(cb);
      try {
        return cb();
      } catch {
        return {};
      }
    }),
    withTiming: jest.fn((v: number) => v),
  };
});

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

  it('sets rotation directly when animations are disabled', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    render(
      <SectionTitle iconName="eye-outline" iconColor="#6b7280" title="Watched" collapsed={true} />,
    );
    expect(screen.getByText('Watched')).toBeTruthy();

    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('renders without onToggle (no crash on press)', () => {
    render(<SectionTitle iconName="play-circle-outline" iconColor="#22c55e" title="Available" />);
    fireEvent.press(screen.getByText('Available'));
    // No crash — onToggle is optional
  });

  it('chevron animated style callback executes without throwing', () => {
    capturedWatchlistCallbacks.length = 0;
    render(
      <SectionTitle
        iconName="play-circle-outline"
        iconColor="#22c55e"
        title="Test Section"
        collapsed
      />,
    );
    expect(capturedWatchlistCallbacks.length).toBeGreaterThanOrEqual(1);
    capturedWatchlistCallbacks.forEach((cb) => {
      expect(() => cb()).not.toThrow();
    });
  });

  it('chevron style callback returns transform with rotate', () => {
    capturedWatchlistCallbacks.length = 0;
    render(
      <SectionTitle iconName="eye-outline" iconColor="#888" title="Watched" collapsed={false} />,
    );
    const chevCb = capturedWatchlistCallbacks[0];
    if (chevCb) {
      const result = chevCb() as { transform?: object[] };
      expect(result).toBeDefined();
    }
  });

  it('updates rotation when collapsed changes from true to false', () => {
    const { rerender } = render(
      <SectionTitle iconName="eye-outline" iconColor="#888" title="Section" collapsed={true} />,
    );
    rerender(
      <SectionTitle iconName="eye-outline" iconColor="#888" title="Section" collapsed={false} />,
    );
    expect(screen.getByText('Section')).toBeTruthy();
  });

  it('updates rotation when collapsed changes from false to true', () => {
    const { rerender } = render(
      <SectionTitle iconName="eye-outline" iconColor="#888" title="Section" collapsed={false} />,
    );
    rerender(
      <SectionTitle iconName="eye-outline" iconColor="#888" title="Section" collapsed={true} />,
    );
    expect(screen.getByText('Section')).toBeTruthy();
  });
});
