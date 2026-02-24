jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>Redirecting to {href}</Text>;
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Index from '../index';

describe('Index (root)', () => {
  it('redirects to tabs', () => {
    render(<Index />);
    expect(screen.getByText('Redirecting to /(tabs)')).toBeTruthy();
  });
});
