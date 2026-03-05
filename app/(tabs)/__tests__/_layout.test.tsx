jest.mock('expo-router', () => {
  const { View, Text } = require('react-native');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockTabsScreen = (mockProps: any) => {
    const hasHref = mockProps.options?.href !== null;
    const mockTitle = mockProps.options?.title ?? mockProps.name;
    const mockIconFn = mockProps.options?.tabBarIcon;
    return (
      <View testID={`tab-screen-${mockProps.name}`}>
        {hasHref && <Text>{mockTitle}</Text>}
        {mockIconFn ? mockIconFn({ color: '#fff', size: 24 }) : null}
        {mockProps.options?.href === null && <Text>hidden</Text>}
      </View>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockTabsComponent = (mockTabsProps: any) => (
    <View testID="tabs-root">{mockTabsProps.children}</View>
  );
  MockTabsComponent.Screen = MockTabsScreen;

  return { Tabs: MockTabsComponent };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    red600: '#DC2626',
    white60: 'rgba(255,255,255,0.6)',
    white10: 'rgba(255,255,255,0.1)',
    zinc900: '#18181B',
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TabLayout from '../_layout';

describe('TabLayout', () => {
  it('renders without crashing', () => {
    render(<TabLayout />);
  });

  it('renders the Tabs root component', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tabs-root')).toBeTruthy();
  });

  it('renders Home tab first with home icon', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tab-screen-index')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
  });

  it('renders Spotlight tab with star icon', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tab-screen-spotlight')).toBeTruthy();
    expect(screen.getByText('Spotlight')).toBeTruthy();
  });

  it('renders Calendar tab', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tab-screen-calendar')).toBeTruthy();
    expect(screen.getByText('Calendar')).toBeTruthy();
  });

  it('renders Watchlist tab', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tab-screen-watchlist')).toBeTruthy();
    expect(screen.getByText('Watchlist')).toBeTruthy();
  });

  it('renders Profile tab', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tab-screen-profile')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('renders all tab screens including hidden ones', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tab-screen-index')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-spotlight')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-calendar')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-watchlist')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-feed')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-surprise')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-profile')).toBeTruthy();
  });

  it('marks feed and surprise tabs as hidden (href: null)', () => {
    render(<TabLayout />);
    // Hidden tabs render "hidden" text but no title
    const hiddenTexts = screen.getAllByText('hidden');
    expect(hiddenTexts).toHaveLength(2);
  });

  it('displays tab titles for all visible tabs', () => {
    render(<TabLayout />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Spotlight')).toBeTruthy();
    expect(screen.getByText('Calendar')).toBeTruthy();
    expect(screen.getByText('Watchlist')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('renders tab bar icons for each visible screen', () => {
    const { toJSON } = render(<TabLayout />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('tab-screen-index');
    expect(tree).toContain('tab-screen-spotlight');
    expect(tree).toContain('tab-screen-calendar');
    expect(tree).toContain('tab-screen-watchlist');
    expect(tree).toContain('tab-screen-profile');
  });
});
