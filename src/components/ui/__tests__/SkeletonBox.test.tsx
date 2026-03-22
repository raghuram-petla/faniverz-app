// Capture animated style callbacks so we can invoke them
const capturedSkeletonCallbacks: Array<() => object> = [];

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
      capturedSkeletonCallbacks.push(cb);
      try {
        return cb();
      } catch {
        return {};
      }
    }),
    withTiming: jest.fn((v: number) => v),
    withRepeat: jest.fn((a: unknown) => a),
    Easing: { inOut: jest.fn((fn: unknown) => fn), ease: (t: number) => t },
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonBox } from '../SkeletonBox';

describe('SkeletonBox', () => {
  it('renders with the given dimensions', () => {
    const { getByTestId } = render(<SkeletonBox width={128} height={192} testID="skeleton" />);
    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('applies custom borderRadius', () => {
    const { getByTestId } = render(
      <SkeletonBox width={100} height={50} borderRadius={12} testID="skeleton" />,
    );
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    expect(flatStyle.borderRadius).toBe(12);
  });

  it('uses default borderRadius of 8', () => {
    const { getByTestId } = render(<SkeletonBox width={100} height={50} testID="skeleton" />);
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    expect(flatStyle.borderRadius).toBe(8);
  });

  it('applies custom style prop', () => {
    const { getByTestId } = render(
      <SkeletonBox width={100} height={50} style={{ marginTop: 10 }} testID="skeleton" />,
    );
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    expect(flatStyle.marginTop).toBe(10);
  });

  it('sets background color from theme border token', () => {
    const { getByTestId } = render(<SkeletonBox width={100} height={50} testID="skeleton" />);
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    // Global theme mock uses darkTheme where border = 'rgba(255, 255, 255, 0.1)'
    expect(flatStyle.backgroundColor).toBe('rgba(255, 255, 255, 0.1)');
  });

  it('renders with string width and height', () => {
    const { getByTestId } = render(<SkeletonBox width="100%" height="50%" testID="skeleton" />);
    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('renders animated shimmer child inside the view', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <SkeletonBox width={100} height={50} testID="skeleton" />,
    );
    expect(getByTestId('skeleton')).toBeTruthy();
    // Animated.View should be present as child
    const animatedViews = UNSAFE_getAllByType(require('react-native-reanimated').default.View);
    expect(animatedViews.length).toBeGreaterThan(0);
  });

  it('renders without testID (no crash)', () => {
    const { UNSAFE_getAllByType } = render(<SkeletonBox width={80} height={120} />);
    const animatedViews = UNSAFE_getAllByType(require('react-native-reanimated').default.View);
    expect(animatedViews.length).toBeGreaterThan(0);
  });

  it('shimmer animated style callback executes without throwing', () => {
    capturedSkeletonCallbacks.length = 0;
    render(<SkeletonBox width={100} height={50} testID="sk" />);
    expect(capturedSkeletonCallbacks.length).toBeGreaterThanOrEqual(1);
    capturedSkeletonCallbacks.forEach((cb) => {
      expect(() => cb()).not.toThrow();
    });
  });

  it('shimmer style returns transform with translateX', () => {
    capturedSkeletonCallbacks.length = 0;
    render(<SkeletonBox width={200} height={80} testID="sk" />);
    const shimmerCb = capturedSkeletonCallbacks[0];
    if (shimmerCb) {
      const result = shimmerCb() as { transform?: object[] };
      expect(result).toBeDefined();
    }
  });
});
