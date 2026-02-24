jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>Redirecting to {href}</Text>;
  },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Index from '../index';

describe('Index (root)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading indicator initially', () => {
    // AsyncStorage.getItem never resolves during this test
    (AsyncStorage.getItem as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<Index />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('redirects to onboarding when user has not onboarded', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText('Redirecting to /onboarding')).toBeTruthy();
    });
  });

  it('redirects to tabs when user has already onboarded', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText('Redirecting to /(tabs)')).toBeTruthy();
    });
  });

  it('renders without crashing', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const { toJSON } = render(<Index />);

    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });
});
