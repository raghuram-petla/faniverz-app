jest.mock('../AnimatedTabBar.styles', () => ({
  animatedTabBarStyles: new Proxy({}, { get: () => ({}) }),
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
});
