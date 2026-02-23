jest.mock('expo-router', () => {
  const TabsComponent = ({ children }: { children?: React.ReactNode }) => children ?? null;
  TabsComponent.Screen = () => null;
  return { Tabs: TabsComponent };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    red600: '#DC2626',
    white60: 'rgba(255,255,255,0.6)',
    white10: 'rgba(255,255,255,0.1)',
    zinc900: '#18181B',
  },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../_layout';

describe('TabLayout', () => {
  it('renders without crashing', () => {
    render(<TabLayout />);
  });
});
