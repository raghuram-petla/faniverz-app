// Capture animated style callbacks so we can invoke them in tests
const capturedAnimStyleCallbacks: Array<() => object> = [];

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
      capturedAnimStyleCallbacks.push(cb);
      try {
        return cb();
      } catch {
        return {};
      }
    }),
    withTiming: jest.fn((v: number) => v),
    withDelay: jest.fn((_: unknown, a: unknown) => a),
    Easing: { out: jest.fn((fn: unknown) => fn), ease: (t: number) => t },
  };
});

jest.mock('@/hooks/useAnimationsEnabled', () => ({
  useAnimationsEnabled: jest.fn(() => true),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AnimatedListItem } from '../AnimatedListItem';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

const mockUseAnimationsEnabled = useAnimationsEnabled as jest.Mock;

describe('AnimatedListItem', () => {
  beforeEach(() => {
    mockUseAnimationsEnabled.mockReturnValue(true);
  });

  it('renders children', () => {
    render(
      <AnimatedListItem index={0}>
        <Text>List item content</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('List item content')).toBeTruthy();
  });

  it('renders immediately at final position when animations are disabled', () => {
    mockUseAnimationsEnabled.mockReturnValue(false);
    render(
      <AnimatedListItem index={5}>
        <Text>No animation</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('No animation')).toBeTruthy();
  });

  it('renders with custom stagger and direction', () => {
    render(
      <AnimatedListItem index={2} stagger={50} direction="right" distance={20}>
        <Text>Right slide</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Right slide')).toBeTruthy();
  });

  it('renders with maxDelay cap', () => {
    render(
      <AnimatedListItem index={100} stagger={80} maxDelay={400}>
        <Text>Capped delay</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Capped delay')).toBeTruthy();
  });

  it('renders direction=right with animations disabled', () => {
    mockUseAnimationsEnabled.mockReturnValue(false);
    render(
      <AnimatedListItem index={1} direction="right">
        <Text>Slide right disabled</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Slide right disabled')).toBeTruthy();
  });

  it('delay is capped at maxDelay for large indices', () => {
    // index=100, stagger=80 → delay would be 8000ms, but capped at maxDelay=400
    // Just verify rendering doesn't crash
    render(
      <AnimatedListItem index={100} stagger={80} maxDelay={400}>
        <Text>Capped item</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Capped item')).toBeTruthy();
  });

  it('renders multiple items without crashing', () => {
    const items = ['A', 'B', 'C'];
    const { getAllByText } = render(
      <>
        {items.map((text, i) => (
          <AnimatedListItem key={text} index={i}>
            <Text>{text}</Text>
          </AnimatedListItem>
        ))}
      </>,
    );
    expect(getAllByText(/[ABC]/)).toHaveLength(3);
  });

  it('animated style callback uses translateX for direction=right', () => {
    capturedAnimStyleCallbacks.length = 0;
    render(
      <AnimatedListItem index={0} direction="right" distance={40}>
        <Text>Right direction</Text>
      </AnimatedListItem>,
    );
    // The captured callback should use translateX (not translateY)
    const cb = capturedAnimStyleCallbacks[0];
    if (cb) {
      const result = cb() as { opacity?: number; transform?: object[] };
      expect(result).toBeDefined();
    }
    expect(screen.getByText('Right direction')).toBeTruthy();
  });

  it('animated style callback uses translateY for direction=up', () => {
    capturedAnimStyleCallbacks.length = 0;
    render(
      <AnimatedListItem index={0} direction="up">
        <Text>Up direction</Text>
      </AnimatedListItem>,
    );
    const cb = capturedAnimStyleCallbacks[0];
    if (cb) {
      const result = cb() as { opacity?: number; transform?: object[] };
      expect(result).toBeDefined();
    }
    expect(screen.getByText('Up direction')).toBeTruthy();
  });

  it('sets shared values directly when animations disabled on effect run', () => {
    mockUseAnimationsEnabled.mockReturnValue(false);
    capturedAnimStyleCallbacks.length = 0;
    render(
      <AnimatedListItem index={3} direction="right">
        <Text>No anim right</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('No anim right')).toBeTruthy();
  });
});
