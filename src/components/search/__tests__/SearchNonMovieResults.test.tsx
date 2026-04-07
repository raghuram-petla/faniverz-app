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

jest.mock('@/components/common/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchNonMovieResults } from '../SearchNonMovieResults';

const mockActor = {
  id: 'a1',
  name: 'Allu Arjun',
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

// @contract: SharedValue mock — value-only object satisfies the structural type for tests
const mockPullDistance = { value: 0 } as import('react-native-reanimated').SharedValue<number>;
const mockIsRefreshing = { value: false } as import('react-native-reanimated').SharedValue<boolean>;

const baseProps = {
  actors: [],
  houses: [],
  platforms: [],
  hasDivider: false,
  dividerStyle: {},
  pullDistance: mockPullDistance,
  isRefreshing: mockIsRefreshing,
  refreshing: false,
  onActorPress: jest.fn(),
  onHousePress: jest.fn(),
  onPlatformPress: jest.fn(),
};

describe('SearchNonMovieResults', () => {
  it('renders actor rows', () => {
    render(<SearchNonMovieResults {...baseProps} actors={[mockActor]} />);
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
  });

  it('renders production house rows', () => {
    render(<SearchNonMovieResults {...baseProps} houses={[mockHouse]} />);
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
  });

  it('renders platform rows', () => {
    render(<SearchNonMovieResults {...baseProps} platforms={[mockPlatform]} />);
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('calls onActorPress when actor is tapped', () => {
    const onActorPress = jest.fn();
    render(
      <SearchNonMovieResults {...baseProps} actors={[mockActor]} onActorPress={onActorPress} />,
    );
    fireEvent.press(screen.getByLabelText('Allu Arjun'));
    expect(onActorPress).toHaveBeenCalledWith(mockActor);
  });

  it('calls onHousePress when production house is tapped', () => {
    const onHousePress = jest.fn();
    render(
      <SearchNonMovieResults {...baseProps} houses={[mockHouse]} onHousePress={onHousePress} />,
    );
    fireEvent.press(screen.getByLabelText('Mythri Movie Makers'));
    expect(onHousePress).toHaveBeenCalledWith(mockHouse);
  });

  it('calls onPlatformPress when platform is tapped', () => {
    const onPlatformPress = jest.fn();
    render(
      <SearchNonMovieResults
        {...baseProps}
        platforms={[mockPlatform]}
        onPlatformPress={onPlatformPress}
      />,
    );
    fireEvent.press(screen.getByLabelText('Netflix'));
    expect(onPlatformPress).toHaveBeenCalledWith(mockPlatform);
  });

  it('renders divider when hasDivider is true', () => {
    const { UNSAFE_getAllByType } = render(
      <SearchNonMovieResults
        {...baseProps}
        actors={[mockActor]}
        hasDivider={true}
        dividerStyle={{ height: 1 }}
      />,
    );
    const { View } = require('react-native');
    const views = UNSAFE_getAllByType(View);
    // At least one View with dividerStyle should be present
    expect(
      views.some(
        (v: { props: { style?: object } }) =>
          v.props.style && (v.props.style as { height?: number }).height === 1,
      ),
    ).toBeTruthy();
  });

  it('renders nothing special when all arrays are empty', () => {
    render(<SearchNonMovieResults {...baseProps} />);
    // Should not throw, just empty container
    expect(screen.queryByText('Allu Arjun')).toBeNull();
  });
});
