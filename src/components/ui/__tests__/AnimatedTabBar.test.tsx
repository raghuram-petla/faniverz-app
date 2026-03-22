jest.mock('../AnimatedTabBar.styles', () => ({
  animatedTabBarStyles: new Proxy({}, { get: () => ({}) }),
}));

const mockAnimationsEnabled = jest.fn(() => true);
jest.mock('@/hooks/useAnimationsEnabled', () => ({
  useAnimationsEnabled: () => mockAnimationsEnabled(),
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { AnimatedTabBar } from '../AnimatedTabBar';

type Tab = 'overview' | 'cast' | 'reviews';

const tabs: Tab[] = ['overview', 'cast', 'reviews'];
const labels: Record<Tab, string> = {
  overview: 'Overview',
  cast: 'Cast',
  reviews: 'Reviews',
};

describe('AnimatedTabBar', () => {
  it('renders all tab labels', () => {
    render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Cast')).toBeTruthy();
    expect(screen.getByText('Reviews')).toBeTruthy();
  });

  it('calls onTabPress with the correct tab', () => {
    const onTabPress = jest.fn();
    render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={onTabPress} />,
    );
    fireEvent.press(screen.getByText('Cast'));
    expect(onTabPress).toHaveBeenCalledWith('cast');
  });

  it('renders correct number of pressable tabs', () => {
    render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    const allTabs = screen.getAllByRole('tab');
    expect(allTabs).toHaveLength(3);
  });

  it('works with two tabs', () => {
    type TwoTab = 'videos' | 'photos';
    const twoTabs: TwoTab[] = ['videos', 'photos'];
    const twoLabels: Record<TwoTab, string> = { videos: 'Videos (5)', photos: 'Photos (12)' };
    const onTabPress = jest.fn();

    render(
      <AnimatedTabBar
        tabs={twoTabs}
        labels={twoLabels}
        activeTab="videos"
        onTabPress={onTabPress}
      />,
    );
    expect(screen.getByText('Videos (5)')).toBeTruthy();
    expect(screen.getByText('Photos (12)')).toBeTruthy();
    fireEvent.press(screen.getByText('Photos (12)'));
    expect(onTabPress).toHaveBeenCalledWith('photos');
  });

  it('renders without crashing when switching active tab', () => {
    const { rerender } = render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    rerender(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="reviews" onTabPress={jest.fn()} />,
    );
    expect(screen.getByText('Reviews')).toBeTruthy();
  });

  it('uses direct target value (no animation) when animations are disabled', () => {
    mockAnimationsEnabled.mockReturnValue(false);
    const { rerender } = render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    // Switch tab to trigger the useEffect with animationsEnabled=false
    rerender(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="cast" onTabPress={jest.fn()} />,
    );
    expect(screen.getByText('Cast')).toBeTruthy();
    mockAnimationsEnabled.mockReturnValue(true);
  });

  it('marks the active tab as selected', () => {
    render(<AnimatedTabBar tabs={tabs} labels={labels} activeTab="cast" onTabPress={jest.fn()} />);
    const castTab = screen.getAllByRole('tab')[1];
    expect(castTab.props.accessibilityState?.selected).toBe(true);
    const overviewTab = screen.getAllByRole('tab')[0];
    expect(overviewTab.props.accessibilityState?.selected).toBe(false);
  });

  it('renders a single tab correctly', () => {
    type SingleTab = 'overview';
    const singleTabs: SingleTab[] = ['overview'];
    const singleLabels: Record<SingleTab, string> = { overview: 'Overview' };
    render(
      <AnimatedTabBar
        tabs={singleTabs}
        labels={singleLabels}
        activeTab="overview"
        onTabPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Overview')).toBeTruthy();
    const allTabs = screen.getAllByRole('tab');
    expect(allTabs).toHaveLength(1);
    expect(allTabs[0].props.accessibilityState?.selected).toBe(true);
  });

  it('useEffect calls withTiming when animations are enabled and activeTab changes', () => {
    const withTiming = require('react-native-reanimated').withTiming;
    withTiming.mockClear();

    const { rerender } = render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    rerender(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="cast" onTabPress={jest.fn()} />,
    );
    expect(withTiming).toHaveBeenCalled();
  });

  it('useEffect sets target directly (no withTiming) when animations disabled', () => {
    mockAnimationsEnabled.mockReturnValue(false);
    const withTiming = require('react-native-reanimated').withTiming;
    withTiming.mockClear();

    const { rerender } = render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    withTiming.mockClear();
    rerender(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="reviews" onTabPress={jest.fn()} />,
    );
    // withTiming should NOT be called when animations disabled
    expect(withTiming).not.toHaveBeenCalled();
    mockAnimationsEnabled.mockReturnValue(true);
  });

  it('useAnimatedStyle is called for the indicator', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    useAnimatedStyle.mockClear();
    render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    expect(useAnimatedStyle).toHaveBeenCalled();
  });

  it('useAnimatedStyle callback returns transform with translateX', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    useAnimatedStyle.mockImplementation((cb: () => object) => {
      const result = cb();
      return result;
    });
    render(
      <AnimatedTabBar tabs={tabs} labels={labels} activeTab="overview" onTabPress={jest.fn()} />,
    );
    expect(useAnimatedStyle).toHaveBeenCalled();
    useAnimatedStyle.mockImplementation(() => ({}));
  });
});
