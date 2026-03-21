import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchResultProductionHouse } from '../SearchResultProductionHouse';

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

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
});
