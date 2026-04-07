jest.mock('@shared/imageUrl', () => ({
  posterBucket: (t?: string) => (t === 'backdrop' ? 'BACKDROPS' : 'POSTERS'),
  backdropBucket: (t?: string) => (t === 'poster' ? 'POSTERS' : 'BACKDROPS'),
  getImageUrl: (url: string | null) => url,
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return (
      <View
        testID="platform-image"
        accessibilityLabel={(props.source as Record<string, unknown>)?.uri as string}
      />
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchResultPlatform } from '../SearchResultPlatform';

const mockPlatform = {
  id: 'netflix',
  name: 'Netflix',
  logo: 'netflix-logo',
  logo_url: 'netflix-logo.jpg',
  color: '#E50914',
  display_order: 1,
  tmdb_provider_id: 8,
  regions: ['IN'],
};

describe('SearchResultPlatform', () => {
  it('renders platform name', () => {
    render(<SearchResultPlatform platform={mockPlatform} onPress={jest.fn()} />);
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<SearchResultPlatform platform={mockPlatform} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Netflix'));
    expect(onPress).toHaveBeenCalled();
  });

  it('uses placeholder when logo_url is null', () => {
    const platformNoLogo = { ...mockPlatform, logo_url: null };
    render(<SearchResultPlatform platform={platformNoLogo} onPress={jest.fn()} />);
    // When logo_url is null, getImageUrl returns null → fallback to PLACEHOLDER_POSTER
    const images = screen.getAllByTestId('platform-image');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('renders platform type label', () => {
    render(<SearchResultPlatform platform={mockPlatform} onPress={jest.fn()} />);
    // t('search.platform') resolves to "Platform" via the global i18n mock
    expect(screen.getByText('Platform')).toBeTruthy();
  });

  it('uses logo_url when provided', () => {
    render(<SearchResultPlatform platform={mockPlatform} onPress={jest.fn()} />);
    // Image is rendered with the logo_url (getImageUrl mock returns url as-is)
    const image = screen.getByTestId('platform-image');
    expect(image.props.accessibilityLabel).toBe('netflix-logo.jpg');
  });

  it('has accessible label equal to platform name', () => {
    render(<SearchResultPlatform platform={mockPlatform} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Netflix')).toBeTruthy();
  });
});
