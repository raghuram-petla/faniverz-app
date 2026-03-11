import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchResultActor } from '../SearchResultActor';

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

const mockActor = {
  id: 'a1',
  name: 'Allu Arjun',
  photo_url: 'photo.jpg',
  tmdb_person_id: null,
  birth_date: null,
  person_type: 'actor' as const,
  gender: null,
  biography: null,
  place_of_birth: null,
  height_cm: null,
  created_by: null,
  created_at: '2024-01-01T00:00:00Z',
};

describe('SearchResultActor', () => {
  it('renders actor name', () => {
    render(<SearchResultActor actor={mockActor} onPress={jest.fn()} />);
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<SearchResultActor actor={mockActor} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Allu Arjun'));
    expect(onPress).toHaveBeenCalled();
  });
});
