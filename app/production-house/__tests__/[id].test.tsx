jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'ph1' }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { red600: '#dc2626', gray500: '#6b7280', yellow400: '#facc15', white: '#fff' },
  }),
}));

jest.mock('@/styles/productionHouseDetail.styles', () => ({
  createProductionHouseStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/features/productionHouses/hooks', () => ({
  useProductionHouseDetail: () => ({
    house: {
      id: 'ph1',
      name: 'Mythri Entertainments',
      logo_url: 'logo.jpg',
      description: 'A great studio',
      created_at: '2026-01-01T00:00:00Z',
    },
    movies: [
      {
        id: 'm1',
        title: 'Pushpa 2',
        poster_url: 'poster.jpg',
        release_date: '2025-12-05',
        rating: 8.5,
      },
      { id: 'm2', title: 'Movie 2', poster_url: null, release_date: null, rating: 0 },
    ],
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/features/feed', () => ({
  useEntityFollows: () => ({ followSet: new Set(['production_house:ph1']) }),
  useFollowEntity: () => ({ mutate: jest.fn() }),
  useUnfollowEntity: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: (fn: () => void) => fn }),
}));

jest.mock('@/components/common/CollapsibleProfileLayout', () => ({
  CollapsibleProfileLayout: ({ name, onBack, rightContent, heroContent, children }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Go back">
          <Text>Back</Text>
        </TouchableOpacity>
        {rightContent}
        <Text>{name}</Text>
        {heroContent}
        {children}
      </View>
    );
  },
}));

jest.mock('@/components/feed/FollowButton', () => ({
  FollowButton: ({ isFollowing, onPress }: { isFollowing: boolean; onPress: () => void }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="follow-btn" onPress={onPress}>
        <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/components/ui/EmptyState', () => ({
  EmptyState: () => null,
}));

jest.mock('@/components/common/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

jest.mock('@/hooks/useRefresh', () => ({
  useRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullDistance: { value: 0 },
    isRefreshing: { value: false },
    handlePullScroll: jest.fn(),
    handleScrollEndDrag: jest.fn(),
  }),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProductionHouseDetailScreen from '../[id]';

describe('ProductionHouseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders production house name', () => {
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('Mythri Entertainments')).toBeTruthy();
  });

  it('renders description', () => {
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('A great studio')).toBeTruthy();
  });

  it('renders movies count', () => {
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('productionHouse.movies (2)')).toBeTruthy();
  });

  it('renders movie cards', () => {
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Movie 2')).toBeTruthy();
  });

  it('navigates to movie on card press', () => {
    render(<ProductionHouseDetailScreen />);
    fireEvent.press(screen.getByTestId('movie-card-m1'));
    expect(mockPush).toHaveBeenCalledWith('/movie/m1');
  });

  it('shows follow button as Following', () => {
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('Following')).toBeTruthy();
  });

  it('calls router.back on back button press', () => {
    render(<ProductionHouseDetailScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders movie year when available', () => {
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('2025')).toBeTruthy();
  });
});
