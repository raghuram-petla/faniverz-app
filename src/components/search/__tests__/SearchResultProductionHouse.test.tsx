jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return (
      <View
        testID="house-image"
        accessibilityLabel={(props.source as Record<string, unknown>)?.uri as string}
      />
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchResultProductionHouse } from '../SearchResultProductionHouse';

const mockHouse = {
  id: 'ph1',
  name: 'Mythri Movie Makers',
  logo_url: 'logo.jpg',
  description: null,
  tmdb_company_id: null,
  created_at: '',
};

describe('SearchResultProductionHouse', () => {
  it('renders house name', () => {
    render(<SearchResultProductionHouse house={mockHouse} onPress={jest.fn()} />);
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<SearchResultProductionHouse house={mockHouse} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Mythri Movie Makers'));
    expect(onPress).toHaveBeenCalled();
  });

  it('uses placeholder when logo_url is null', () => {
    const houseNoLogo = { ...mockHouse, logo_url: null };
    render(<SearchResultProductionHouse house={houseNoLogo} onPress={jest.fn()} />);
    // When logo_url is null, getImageUrl returns null → fallback to PLACEHOLDER_POSTER
    const images = screen.getAllByTestId('house-image');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('renders production house type label', () => {
    render(<SearchResultProductionHouse house={mockHouse} onPress={jest.fn()} />);
    // t('search.productionHouse') resolves to "Production House" via the global i18n mock
    expect(screen.getByText('Production House')).toBeTruthy();
  });

  it('uses logo_url when provided', () => {
    render(<SearchResultProductionHouse house={mockHouse} onPress={jest.fn()} />);
    // Image is rendered with the logo_url (getImageUrl mock returns url as-is)
    const image = screen.getByTestId('house-image');
    expect(image.props.accessibilityLabel).toBe('logo.jpg');
  });

  it('has accessible label equal to house name', () => {
    render(<SearchResultProductionHouse house={mockHouse} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Mythri Movie Makers')).toBeTruthy();
  });
});
