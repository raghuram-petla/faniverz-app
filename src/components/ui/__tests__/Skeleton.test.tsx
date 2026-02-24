import React from 'react';
import { render } from '@testing-library/react-native';

// Must mock before importing the component. The global mock from jest.setup.js
// does not include Animated.View, so we override the full mock here.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      call: jest.fn(),
      createAnimatedComponent: (component: unknown) => component,
      View: RN.View,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value: number) => value),
    withRepeat: jest.fn(),
    Easing: { bezier: jest.fn() },
  };
});

import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Skeleton width={100} height={20} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with specified width and height', () => {
    const { toJSON } = render(<Skeleton width={200} height={50} />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
    // Inner view should have the width/height
    const innerView = tree?.children?.[0];
    if (innerView && typeof innerView === 'object') {
      const flatStyle = Array.isArray(innerView.props.style)
        ? Object.assign({}, ...innerView.props.style)
        : innerView.props.style;
      expect(flatStyle.width).toBe(200);
      expect(flatStyle.height).toBe(50);
    }
  });

  it('applies default borderRadius of 8', () => {
    const { toJSON } = render(<Skeleton width={100} height={20} />);
    const tree = toJSON();
    const innerView = tree?.children?.[0];
    if (innerView && typeof innerView === 'object') {
      const flatStyle = Array.isArray(innerView.props.style)
        ? Object.assign({}, ...innerView.props.style)
        : innerView.props.style;
      expect(flatStyle.borderRadius).toBe(8);
    }
  });

  it('applies custom borderRadius', () => {
    const { toJSON } = render(<Skeleton width={100} height={20} borderRadius={16} />);
    const tree = toJSON();
    const innerView = tree?.children?.[0];
    if (innerView && typeof innerView === 'object') {
      const flatStyle = Array.isArray(innerView.props.style)
        ? Object.assign({}, ...innerView.props.style)
        : innerView.props.style;
      expect(flatStyle.borderRadius).toBe(16);
    }
  });

  it('applies custom width and height to inner view', () => {
    const { toJSON } = render(<Skeleton width={150} height={30} />);
    const tree = toJSON();
    const innerView = tree?.children?.[0];
    if (innerView && typeof innerView === 'object') {
      const flatStyle = Array.isArray(innerView.props.style)
        ? Object.assign({}, ...innerView.props.style)
        : innerView.props.style;
      expect(flatStyle.width).toBe(150);
      expect(flatStyle.height).toBe(30);
    }
  });

  it('applies additional style to outer container', () => {
    const { toJSON } = render(<Skeleton width={100} height={20} style={{ marginTop: 10 }} />);
    const tree = toJSON();
    if (tree && typeof tree === 'object') {
      const flatStyle = Array.isArray(tree.props.style)
        ? Object.assign({}, ...tree.props.style)
        : tree.props.style;
      expect(flatStyle?.marginTop).toBe(10);
    }
  });

  it('renders outer wrapper View and inner animated View', () => {
    const { toJSON } = render(<Skeleton width={80} height={80} />);
    const tree = toJSON();
    expect(tree?.type).toBe('View');
    expect(tree?.children).toHaveLength(1);
  });
});
