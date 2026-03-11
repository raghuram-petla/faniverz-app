jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <Text>{title}</Text>
      </View>
    ),
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import LegalScreen from '../legal';

const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

describe('LegalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when type=terms', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'terms' });
    });

    it('renders "Terms of Service" header', () => {
      render(<LegalScreen />);
      expect(screen.getByText('Terms of Service')).toBeTruthy();
    });

    it('shows terms content with "Acceptance of Terms" text', () => {
      render(<LegalScreen />);
      expect(screen.getByText(/Acceptance of Terms/)).toBeTruthy();
    });

    it('shows terms content with contact email', () => {
      render(<LegalScreen />);
      expect(screen.getByText(/faniverz@gmail.com/)).toBeTruthy();
    });

    it('does not show privacy-specific content', () => {
      render(<LegalScreen />);
      expect(screen.queryByText(/Information We Collect/)).toBeNull();
    });
  });

  describe('when type=privacy', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'privacy' });
    });

    it('renders "Privacy Policy" header', () => {
      render(<LegalScreen />);
      expect(screen.getByText('Privacy Policy')).toBeTruthy();
    });

    it('shows privacy content with "Information We Collect" text', () => {
      render(<LegalScreen />);
      expect(screen.getByText(/Information We Collect/)).toBeTruthy();
    });

    it('shows privacy content with data retention info', () => {
      render(<LegalScreen />);
      expect(screen.getByText(/Data Retention/)).toBeTruthy();
    });

    it('does not show terms-specific content', () => {
      render(<LegalScreen />);
      expect(screen.queryByText(/Acceptance of Terms/)).toBeNull();
    });
  });
});
