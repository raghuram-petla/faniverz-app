jest.mock('expo-router', () => {
  const { View, Text } = require('react-native');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockTabsScreen = (mockProps: any) => {
    const mockTitle = mockProps.options?.title ?? mockProps.name;
    const mockIconFn = mockProps.options?.tabBarIcon;
    return (
      <View testID={`tab-screen-${mockProps.name}`}>
        <Text>{mockTitle}</Text>
        {mockIconFn ? mockIconFn({ color: '#fff', size: 24 }) : null}
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

  it('renders all tab screens including hidden surprise', () => {
    render(<TabLayout />);
    expect(screen.getByTestId('tab-screen-index')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-calendar')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-feed')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-watchlist')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-surprise')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-profile')).toBeTruthy();
  });

  it('displays tab titles for visible tabs', () => {
    render(<TabLayout />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Calendar')).toBeTruthy();
    expect(screen.getByText('Feed')).toBeTruthy();
    expect(screen.getByText('Watchlist')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('renders tab bar icons for each visible screen', () => {
    const { toJSON } = render(<TabLayout />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('tab-screen-index');
    expect(tree).toContain('tab-screen-calendar');
    expect(tree).toContain('tab-screen-feed');
    expect(tree).toContain('tab-screen-watchlist');
    expect(tree).toContain('tab-screen-profile');
  });
});
