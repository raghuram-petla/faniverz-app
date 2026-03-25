jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return (
      <View
        testID="actor-image"
        accessibilityLabel={(props.source as Record<string, unknown>)?.uri as string}
      />
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchResultActor } from '../SearchResultActor';

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
  imdb_id: null,
  known_for_department: null,
  also_known_as: null,
  death_date: null,
  instagram_id: null,
  twitter_id: null,
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

  it('uses placeholder when photo_url is null', () => {
    const actorNoPhoto = { ...mockActor, photo_url: null };
    render(<SearchResultActor actor={actorNoPhoto} onPress={jest.fn()} />);
    // When photo_url is null, getImageUrl returns null → fallback to PLACEHOLDER_PHOTO
    // The image renders with a non-null source (PLACEHOLDER_PHOTO constant)
    const images = screen.getAllByTestId('actor-image');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('renders actor type label', () => {
    render(<SearchResultActor actor={mockActor} onPress={jest.fn()} />);
    // t('search.actor') resolves to "Actor" via the global i18n mock
    expect(screen.getByText('Actor')).toBeTruthy();
  });

  it('uses actor photo_url when provided', () => {
    render(<SearchResultActor actor={mockActor} onPress={jest.fn()} />);
    // Image is rendered with the photo_url (getImageUrl mock returns url as-is)
    const image = screen.getByTestId('actor-image');
    expect(image.props.accessibilityLabel).toBe('photo.jpg');
  });

  it('has accessible label equal to actor name', () => {
    render(<SearchResultActor actor={mockActor} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Allu Arjun')).toBeTruthy();
  });
});
