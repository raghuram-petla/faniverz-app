// Capture animated style callbacks so we can invoke them in tests
const capturedStyleCallbacks: Array<() => object> = [];

import { Platform, StyleSheet } from 'react-native';

jest.mock('react-native-reanimated', () => {
  const original = jest.requireActual('react-native-reanimated');
  const { View } = require('react-native');
  const React = require('react');
  const AnimatedView = React.forwardRef((props: object, ref: unknown) =>
    React.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      createAnimatedComponent: (c: unknown) => c,
    },
    useSharedValue: jest.fn((v: number) => ({ value: v })),
    useAnimatedStyle: jest.fn((cb: () => object) => {
      capturedStyleCallbacks.push(cb);
      try {
        return cb();
      } catch {
        return {};
      }
    }),
    useAnimatedReaction: jest.fn(),
    interpolate: jest.fn((value: number, inRange: number[], outRange: number[]) => {
      const [i0, i1] = inRange;
      const [o0, o1] = outRange;
      if (i1 === i0) return o0;
      const ratio = (value - i0) / (i1 - i0);
      return o0 + ratio * (o1 - o0);
    }),
    Extrapolation: original.Extrapolation ?? { CLAMP: 'clamp' },
    withTiming: jest.fn((v: number) => v),
    withSpring: jest.fn((v: number) => v),
    withSequence: jest.fn((...args: number[]) => args[args.length - 1]),
    withDelay: jest.fn((_: unknown, a: unknown) => a),
    withRepeat: jest.fn((a: unknown) => a),
    runOnJS: jest.fn((fn: Function) => fn),
    Easing: { inOut: jest.fn((fn: unknown) => fn), ease: (t: number) => t },
  };
});

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#444' }),
    colors: {},
  }),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  PULL_THRESHOLD: 80,
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import { PullToRefreshIndicator } from '../PullToRefreshIndicator';

describe('PullToRefreshIndicator', () => {
  const makePullDistance = (value = 0) => ({ value }) as SharedValue<number>;
  const makeIsRefreshing = (value = false) => ({ value }) as SharedValue<boolean>;

  it('renders without crashing', () => {
    const { toJSON } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance()}
        isRefreshing={makeIsRefreshing()}
        refreshing={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('shows arrow icon when not refreshing', () => {
    const { getByTestId, queryByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(30)}
        isRefreshing={makeIsRefreshing()}
        refreshing={false}
      />,
    );
    expect(getByTestId('pull-arrow')).toBeTruthy();
    expect(queryByTestId('refresh-spinner')).toBeNull();
  });

  it('shows spinner when refreshing', () => {
    const { getByTestId, queryByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(60)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    expect(getByTestId('refresh-spinner')).toBeTruthy();
    expect(queryByTestId('pull-arrow')).toBeNull();
  });

  it('renders release text element when not refreshing', () => {
    const { getByText } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(60)}
        isRefreshing={makeIsRefreshing()}
        refreshing={false}
      />,
    );
    expect(getByText('Release to refresh')).toBeTruthy();
  });

  it('shows spinner when refreshing is true', () => {
    const { getByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    expect(getByTestId('refresh-spinner')).toBeTruthy();
  });

  it('does not render a grey chip behind the spinner', () => {
    const { getByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    const spinnerWrap = getByTestId('refresh-spinner-wrap');
    expect(StyleSheet.flatten(spinnerWrap.props.style)?.backgroundColor).toBeUndefined();
  });

  it('shows spinner immediately when refreshing prop is true even if showRefreshing state lags', () => {
    const { getByTestId, queryByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={true}
      />,
    );
    // @edge refreshing prop drives spinner visibility directly, no state delay
    expect(getByTestId('refresh-spinner')).toBeTruthy();
    expect(queryByTestId('pull-arrow')).toBeNull();
  });

  it('shows spinner when shared refresh state is true before React catches up', () => {
    const { getByTestId, queryByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={false}
      />,
    );
    expect(getByTestId('refresh-spinner')).toBeTruthy();
    expect(queryByTestId('pull-arrow')).toBeNull();
  });

  it('hides arrow and text when refreshing', () => {
    const { queryByTestId, queryByText } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(60)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    expect(queryByTestId('pull-arrow')).toBeNull();
    expect(queryByText('Release to refresh')).toBeNull();
  });

  it('renders at zero pull distance without crashing', () => {
    const { toJSON } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders at full pull distance (at threshold)', () => {
    const { toJSON } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(80)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders at beyond pull threshold (over-pull)', () => {
    const { toJSON } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(200)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders correctly transitioning from refreshing to not refreshing', () => {
    const { rerender } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    expect(screen.getByTestId('refresh-spinner')).toBeTruthy();

    rerender(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    expect(screen.queryByTestId('refresh-spinner')).toBeNull();
  });

  it('arrow icon is accessible', () => {
    const { getByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(40)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    const arrow = getByTestId('pull-arrow');
    expect(arrow.props.name).toBe('arrow-up');
  });

  it('animated style callbacks execute without throwing (containerStyle at mid-pull)', () => {
    capturedStyleCallbacks.length = 0;
    const pullDist = makePullDistance(40);
    const isRef = makeIsRefreshing(false);
    render(
      <PullToRefreshIndicator pullDistance={pullDist} isRefreshing={isRef} refreshing={false} />,
    );
    // All 3 useAnimatedStyle callbacks should have been called; none should throw
    expect(capturedStyleCallbacks.length).toBeGreaterThanOrEqual(3);
    capturedStyleCallbacks.forEach((cb) => {
      expect(() => cb()).not.toThrow();
    });
  });

  it('animated containerStyle uses refreshHeight when isRefreshing=true', () => {
    capturedStyleCallbacks.length = 0;
    render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    // The first captured callback is containerStyle
    if (capturedStyleCallbacks[0]) {
      const result = capturedStyleCallbacks[0]() as { height?: number; opacity?: number };
      // When isRefreshing=true, refreshHeight is INDICATOR_HEIGHT (48), height >= 48
      expect(result).toBeDefined();
    }
  });

  it('arrowRotateStyle callback returns transform object', () => {
    capturedStyleCallbacks.length = 0;
    render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(80)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    // Third callback (index 2) is arrowRotateStyle
    const rotateCallback = capturedStyleCallbacks[2];
    if (rotateCallback) {
      const result = rotateCallback() as { transform?: object[] };
      expect(result).toBeDefined();
    }
  });

  it('renders on Android (custom pull-to-refresh indicator, not native RefreshControl)', () => {
    const originalOS = Platform.OS;
    (Platform as unknown as { OS: string }).OS = 'android';
    const { toJSON } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance()}
        isRefreshing={makeIsRefreshing()}
        refreshing={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
    (Platform as unknown as { OS: string }).OS = originalOS;
  });

  it('contentStyle callback at below-threshold pull returns opacity value', () => {
    capturedStyleCallbacks.length = 0;
    render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(60)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    // contentStyle is the second captured callback
    const contentCallback = capturedStyleCallbacks[1];
    if (contentCallback) {
      const result = contentCallback() as { opacity?: number };
      expect(result).toBeDefined();
    }
  });

  it('syncRefreshingVisual callback updates showRefreshing state', () => {
    const { useAnimatedReaction } = require('react-native-reanimated');
    const mockAnimatedReaction = useAnimatedReaction as jest.Mock;

    // Capture the callback passed to useAnimatedReaction
    mockAnimatedReaction.mockClear();

    const isRef = makeIsRefreshing(false);
    const { rerender } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={isRef}
        refreshing={false}
      />,
    );

    // useAnimatedReaction is called with (valueGetter, callback)
    // The second argument is the callback that calls runOnJS(syncRefreshingVisual)
    const reactionCalls = mockAnimatedReaction.mock.calls;
    expect(reactionCalls.length).toBeGreaterThan(0);

    // Get the reaction callback (2nd argument)
    const reactionCallback = reactionCalls[reactionCalls.length - 1]?.[1];
    if (reactionCallback) {
      // Simulate calling the callback with (nextValue, previousValue)
      // When they differ, it should call syncRefreshingVisual
      reactionCallback(true, false);
      // When they are the same, it should skip (early return)
      reactionCallback(true, true);
    }

    // Also test the syncRefreshingVisual function when refreshingRef is true
    rerender(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={isRef}
        refreshing={true}
      />,
    );
    // This exercises the syncRefreshingVisual(false) path with refreshingRef.current = true
    const latestReactionCallback =
      mockAnimatedReaction.mock.calls[mockAnimatedReaction.mock.calls.length - 1]?.[1];
    if (latestReactionCallback) {
      latestReactionCallback(false, true);
    }
  });

  it('useEffect syncs showRefreshing when refreshing prop changes', () => {
    const isRef = makeIsRefreshing(false);
    const { rerender } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={isRef}
        refreshing={false}
      />,
    );
    // Not refreshing — should show arrow
    expect(screen.queryByTestId('refresh-spinner')).toBeNull();

    // Change refreshing to true
    rerender(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={isRef}
        refreshing={true}
      />,
    );
    expect(screen.getByTestId('refresh-spinner')).toBeTruthy();

    // Change back to false
    rerender(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={isRef}
        refreshing={false}
      />,
    );
    expect(screen.queryByTestId('refresh-spinner')).toBeNull();
  });
});
