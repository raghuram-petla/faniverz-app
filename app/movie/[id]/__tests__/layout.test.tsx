import React from 'react';
import { render } from '@testing-library/react-native';
import MovieLayout from '../_layout';

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  const Stack = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  Stack.Screen = ({ name }: { name: string }) => <Text>{name}</Text>;
  return { Stack };
});

describe('MovieLayout', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<MovieLayout />);
    expect(toJSON()).toBeTruthy();
  });

  it('declares index and media screens', () => {
    const { getByText } = render(<MovieLayout />);
    expect(getByText('index')).toBeTruthy();
    expect(getByText('media')).toBeTruthy();
  });
});
