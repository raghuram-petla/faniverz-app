jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return (
      <View
        testID="result-image"
        accessibilityLabel={(props.source as Record<string, unknown>)?.uri as string}
      />
    );
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockPush = jest.fn();

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiscoverSearchEntities } from '../DiscoverSearchEntities';

const mockActor = {
  id: 'a1',
  name: 'Mahesh Babu',
  photo_url: null,
  tmdb_person_id: null,
  birth_date: null,
  person_type: 'actor' as const,
  gender: 1,
  biography: null,
  place_of_birth: null,
  height_cm: null,
  imdb_id: null,
  known_for_department: null,
  also_known_as: [],
  death_date: null,
  instagram_id: null,
  twitter_id: null,
  created_by: null,
  created_at: '',
};

const mockHouse = {
  id: 'ph1',
  name: 'Mythri Movie Makers',
  logo_url: null,
  description: null,
  tmdb_company_id: null,
  created_at: '',
};

const mockPlatform = {
  id: 'netflix',
  name: 'Netflix',
  logo: 'netflix-logo',
  logo_url: null,
  color: '#E50914',
  display_order: 1,
};

describe('DiscoverSearchEntities', () => {
  beforeEach(() => mockPush.mockClear());

  it('returns null when no results', () => {
    const { toJSON } = render(
      <DiscoverSearchEntities actors={[]} productionHouses={[]} platforms={[]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders actor rows and navigates on press', () => {
    render(<DiscoverSearchEntities actors={[mockActor]} productionHouses={[]} platforms={[]} />);
    expect(screen.getByText('Mahesh Babu')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Mahesh Babu'));
    expect(mockPush).toHaveBeenCalledWith('/actor/a1');
  });

  it('renders production house rows and navigates on press', () => {
    render(<DiscoverSearchEntities actors={[]} productionHouses={[mockHouse]} platforms={[]} />);
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Mythri Movie Makers'));
    expect(mockPush).toHaveBeenCalledWith('/production-house/ph1');
  });

  it('renders platform rows and navigates on press', () => {
    render(<DiscoverSearchEntities actors={[]} productionHouses={[]} platforms={[mockPlatform]} />);
    expect(screen.getByText('Netflix')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Netflix'));
    expect(mockPush).toHaveBeenCalledWith('/platform/netflix');
  });

  it('renders all entity types together', () => {
    render(
      <DiscoverSearchEntities
        actors={[mockActor]}
        productionHouses={[mockHouse]}
        platforms={[mockPlatform]}
      />,
    );
    expect(screen.getByText('Mahesh Babu')).toBeTruthy();
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
    expect(screen.getByText('Netflix')).toBeTruthy();
  });
});
