jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
  }),
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      require('react').createElement(View, {
        testID: 'expo-image',
        accessibilityLabel: props.accessibilityLabel,
      }),
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook, act } from '@testing-library/react-native';
import { FeedHeader, HOME_FEED_HEADER_CONTENT_HEIGHT, useCollapsibleHeader } from '../FeedHeader';

describe('FeedHeader', () => {
  const defaultProps = {
    insetTop: 44,
    headerTranslateY: new Animated.Value(0),
    totalHeaderHeight: 96,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Faniverz logo', () => {
    const { getByLabelText } = render(<FeedHeader {...defaultProps} />);
    expect(getByLabelText('Faniverz')).toBeTruthy();
  });

  it('renders search button', () => {
    const { getByLabelText } = render(<FeedHeader {...defaultProps} />);
    expect(getByLabelText('Search')).toBeTruthy();
  });

  it('renders notifications button', () => {
    const { getByLabelText } = render(<FeedHeader {...defaultProps} />);
    expect(getByLabelText('Notifications')).toBeTruthy();
  });

  it('search button navigates to /discover', () => {
    const { getByLabelText } = render(<FeedHeader {...defaultProps} />);
    fireEvent.press(getByLabelText('Search'));
    expect(mockPush).toHaveBeenCalledWith('/discover');
  });

  it('notifications button navigates to /notifications', () => {
    const { getByLabelText } = render(<FeedHeader {...defaultProps} />);
    fireEvent.press(getByLabelText('Notifications'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });
});

describe('useCollapsibleHeader', () => {
  it('returns headerTranslateY, totalHeaderHeight, handleScroll', () => {
    const { result } = renderHook(() => useCollapsibleHeader(44));
    expect(result.current.headerTranslateY).toBeDefined();
    expect(result.current.totalHeaderHeight).toBeDefined();
    expect(result.current.handleScroll).toBeDefined();
    expect(result.current.getCurrentHeaderTranslateY).toBeDefined();
    expect(typeof result.current.handleScroll).toBe('function');
  });

  it('totalHeaderHeight equals insetTop + 52', () => {
    const { result } = renderHook(() => useCollapsibleHeader(44));
    expect(result.current.totalHeaderHeight).toBe(96);
  });

  it('re-exports the shared header content height', () => {
    expect(HOME_FEED_HEADER_CONTENT_HEIGHT).toBe(52);
  });

  it('calculates totalHeaderHeight with different insetTop', () => {
    const { result } = renderHook(() => useCollapsibleHeader(0));
    expect(result.current.totalHeaderHeight).toBe(52);
  });

  it('headerTranslateY starts at 0', () => {
    const { result } = renderHook(() => useCollapsibleHeader(44));
    // Animated.Value stores internal __getValue
    const val = (
      result.current.headerTranslateY as unknown as { __getValue: () => number }
    ).__getValue();
    expect(val).toBe(0);
  });

  it('handleScroll updates headerTranslateY on scroll down', () => {
    const { result } = renderHook(() => useCollapsibleHeader(44));
    const scrollEvent = {
      nativeEvent: { contentOffset: { y: 100 } },
    };

    act(() => {
      result.current.handleScroll(scrollEvent as never);
    });

    const val = (
      result.current.headerTranslateY as unknown as { __getValue: () => number }
    ).__getValue();
    // After scrolling down, header should be hidden (negative translateY)
    expect(val).toBeLessThan(0);
  });

  it('handleScroll resets when scrolled to top', () => {
    const { result } = renderHook(() => useCollapsibleHeader(44));

    // First scroll down
    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 100 } },
      } as never);
    });

    // Then scroll to top
    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 0 } },
      } as never);
    });

    const val = (
      result.current.headerTranslateY as unknown as { __getValue: () => number }
    ).__getValue();
    expect(val).toBe(0);
  });

  it('getCurrentHeaderTranslateY matches the latest collapse offset', () => {
    const { result } = renderHook(() => useCollapsibleHeader(44));

    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 20 } },
      } as never);
    });

    expect(result.current.getCurrentHeaderTranslateY()).toBe(-20);
  });

  it('onPageChange always reveals header on tab switch', () => {
    jest.useFakeTimers();
    const timingSpy = jest.spyOn(Animated, 'timing');
    const { result } = renderHook(() => useCollapsibleHeader(44));

    // First collapse header by scrolling down
    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 200 } },
      } as never);
    });

    const valBefore = (
      result.current.headerTranslateY as unknown as { __getValue: () => number }
    ).__getValue();
    expect(valBefore).toBeLessThan(0);

    // Switch to a page that's at scroll position 0
    act(() => {
      result.current.onPageChange(0);
      jest.runAllTimers();
    });

    // Verify Animated.timing was called with toValue: 0 (reveal)
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0, duration: 200 }),
    );
    timingSpy.mockRestore();
    jest.useRealTimers();
  });

  it('onPageChange always reveals header even when new page is scrolled down', () => {
    jest.useFakeTimers();
    const timingSpy = jest.spyOn(Animated, 'timing');
    const { result } = renderHook(() => useCollapsibleHeader(44));

    // First collapse header by scrolling down
    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 200 } },
      } as never);
    });

    // Switch to a page that's scrolled far down — should still reveal
    act(() => {
      result.current.onPageChange(500);
      jest.runAllTimers();
    });

    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0, duration: 200 }),
    );
    timingSpy.mockRestore();
    jest.useRealTimers();
  });

  it('onPageChange returns from hook', () => {
    const { result } = renderHook(() => useCollapsibleHeader(44));
    expect(typeof result.current.onPageChange).toBe('function');
  });
});
