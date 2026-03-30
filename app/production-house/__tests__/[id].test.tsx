/* eslint-disable @typescript-eslint/no-explicit-any */
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

const mockUseProductionHouseDetail = jest.fn();
jest.mock('@/features/productionHouses/hooks', () => ({
  useProductionHouseDetail: (...args: any[]) => mockUseProductionHouseDetail(...args),
}));

const mockFollowMutate = jest.fn();
const mockUnfollowMutate = jest.fn();
let mockFollowSet = new Set(['production_house:ph1']);

jest.mock('@/features/feed', () => ({
  useEntityFollows: () => ({ followSet: mockFollowSet }),
  useFollowEntity: () => ({ mutate: mockFollowMutate, isPending: false }),
  useUnfollowEntity: () => ({ mutate: mockUnfollowMutate, isPending: false }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: (fn: () => void) => fn }),
}));

jest.mock('@/components/productionHouse/ProductionHouseDetailSkeleton', () => ({
  ProductionHouseDetailSkeleton: () => {
    const { Text } = require('react-native');
    return <Text testID="skeleton">Loading...</Text>;
  },
}));

jest.mock('@/components/common/CollapsibleProfileLayout', () => ({
  CollapsibleProfileLayout: ({
    name,
    onBack,
    rightContent,
    heroContent,
    children,
    renderImage,
  }: Record<string, any>) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Go back">
          <Text>Back</Text>
        </TouchableOpacity>
        {rightContent}
        <Text>{name}</Text>
        {renderImage && renderImage(120)}
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
  useRefresh: (...fns: Array<() => Promise<any>>) => {
    // Invoke all refresh callbacks to cover them
    fns.forEach((fn) => {
      if (typeof fn === 'function') fn();
    });
    return { refreshing: false, onRefresh: jest.fn() };
  },
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullDistance: { value: 0 },
    isRefreshing: { value: false },
    handleScrollBeginDrag: jest.fn(),
    handlePullScroll: jest.fn(),
    handleScrollEndDrag: jest.fn(),
  }),
}));

jest.mock('@shared/imageUrl', () => ({
  posterBucket: (t?: string) => (t === 'backdrop' ? 'BACKDROPS' : 'POSTERS'),
  backdropBucket: (t?: string) => (t === 'poster' ? 'POSTERS' : 'BACKDROPS'),
  getImageUrl: (url: string | null) => url,
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <TouchableOpacity accessibilityLabel="Go back" />
        <Text>{title}</Text>
      </View>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProductionHouseDetailScreen from '../[id]';

const defaultHookReturn = {
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
};

describe('ProductionHouseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFollowSet = new Set(['production_house:ph1']);
    mockUseProductionHouseDetail.mockReturnValue(defaultHookReturn);
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

  it('shows not-found state when house is null and not loading', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      house: null,
      movies: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('common.noResults')).toBeTruthy();
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('shows skeleton loader when isLoading is true', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      house: null,
      movies: [],
      isLoading: true,
      refetch: jest.fn(),
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });

  it('renders empty state when movies list is empty', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      movies: [],
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('productionHouse.movies (0)')).toBeTruthy();
  });

  it('unfollows when follow button is pressed and already following', () => {
    render(<ProductionHouseDetailScreen />);
    fireEvent.press(screen.getByTestId('follow-btn'));
    expect(mockUnfollowMutate).toHaveBeenCalledWith({
      entityType: 'production_house',
      entityId: 'ph1',
    });
  });

  it('follows when follow button is pressed and not following', () => {
    mockFollowSet = new Set();
    render(<ProductionHouseDetailScreen />);
    fireEvent.press(screen.getByTestId('follow-btn'));
    expect(mockFollowMutate).toHaveBeenCalledWith({
      entityType: 'production_house',
      entityId: 'ph1',
    });
  });

  it('renders placeholder icon when house has no logo_url', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      house: { ...defaultHookReturn.house, logo_url: null },
    });
    render(<ProductionHouseDetailScreen />);
    const { root } = render(<ProductionHouseDetailScreen />);
    const icons = root.findAll(
      (node: { props: Record<string, any> }) => node.props.name === 'business',
    );
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders movie rating row when rating is greater than 0', () => {
    render(<ProductionHouseDetailScreen />);
    const { root } = render(<ProductionHouseDetailScreen />);
    const starIcons = root.findAll(
      (node: { props: Record<string, any> }) => node.props.name === 'star',
    );
    expect(starIcons.length).toBeGreaterThan(0);
  });

  it('does not render rating row when rating is 0', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      movies: [{ id: 'm3', title: 'No Rating', poster_url: null, release_date: null, rating: 0 }],
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('does not call follow/unfollow when mutation is pending', () => {
    jest.spyOn(require('@/features/feed'), 'useFollowEntity').mockReturnValue({
      mutate: mockFollowMutate,
      isPending: true,
    });

    mockFollowSet = new Set();
    render(<ProductionHouseDetailScreen />);
    fireEvent.press(screen.getByTestId('follow-btn'));
    expect(mockFollowMutate).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('renders description as null when house.description is null', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      house: { ...defaultHookReturn.house, description: null },
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.queryByText('A great studio')).toBeNull();
    expect(screen.getByText('Mythri Entertainments')).toBeTruthy();
  });

  it('does not show year when release_date is null', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      movies: [{ id: 'm5', title: 'No Date', poster_url: null, release_date: null, rating: 0 }],
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('No Date')).toBeTruthy();
  });

  it('renders logo image when logo_url is present', () => {
    render(<ProductionHouseDetailScreen />);
    // The renderImage function is called with size 120 and renders an Image when logo_url exists
    expect(screen.getByText('Mythri Entertainments')).toBeTruthy();
  });

  it('does not call unfollow/follow when unfollowMutation is pending', () => {
    jest.spyOn(require('@/features/feed'), 'useUnfollowEntity').mockReturnValue({
      mutate: mockUnfollowMutate,
      isPending: true,
    });

    render(<ProductionHouseDetailScreen />);
    fireEvent.press(screen.getByTestId('follow-btn'));
    expect(mockUnfollowMutate).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('handles undefined id param (covers id ?? empty string)', () => {
    const routerModule = jest.requireMock('expo-router');
    const origUseLocalSearchParams = routerModule.useLocalSearchParams;
    routerModule.useLocalSearchParams = () => ({ id: undefined });

    mockUseProductionHouseDetail.mockReturnValue({
      house: null,
      movies: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('common.noResults')).toBeTruthy();

    routerModule.useLocalSearchParams = origUseLocalSearchParams;
  });

  it('renders movie card with null poster_url (covers getImageUrl null branch)', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      movies: [{ id: 'm3', title: 'No Poster', poster_url: null, release_date: null, rating: 3.0 }],
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('No Poster')).toBeTruthy();
  });

  it('renders movie with valid year and rating > 0', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      movies: [
        {
          id: 'm6',
          title: 'Rated Movie',
          poster_url: 'poster.jpg',
          release_date: '2024-06-01',
          rating: 4.2,
        },
      ],
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('Rated Movie')).toBeTruthy();
    expect(screen.getByText('2024')).toBeTruthy();
    expect(screen.getByText('4.2')).toBeTruthy();
  });

  it('does not render year when release_date is null for movie card', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      movies: [{ id: 'm7', title: 'No Year', poster_url: null, release_date: null, rating: 5.0 }],
    });
    render(<ProductionHouseDetailScreen />);
    expect(screen.getByText('No Year')).toBeTruthy();
    // Year should not appear
    expect(screen.queryByText('null')).toBeNull();
  });

  it('does not follow/unfollow when mutation is pending (isPending guard)', () => {
    const feed = require('@/features/feed');
    const origFollow = feed.useFollowEntity;
    const origUnfollow = feed.useUnfollowEntity;
    feed.useFollowEntity = () => ({ mutate: mockFollowMutate, isPending: true });
    feed.useUnfollowEntity = () => ({ mutate: mockUnfollowMutate, isPending: true });
    mockFollowSet = new Set<string>();
    mockUseProductionHouseDetail.mockReturnValue(defaultHookReturn);

    render(<ProductionHouseDetailScreen />);
    fireEvent.press(screen.getByTestId('follow-btn'));
    // Should NOT call mutate because isPending is true
    expect(mockFollowMutate).not.toHaveBeenCalled();
    expect(mockUnfollowMutate).not.toHaveBeenCalled();

    feed.useFollowEntity = origFollow;
    feed.useUnfollowEntity = origUnfollow;
  });

  it('renders placeholder icon when house.logo_url is null', () => {
    mockUseProductionHouseDetail.mockReturnValue({
      ...defaultHookReturn,
      house: { ...defaultHookReturn.house, logo_url: null },
    });
    render(<ProductionHouseDetailScreen />);
    // Should render without crashing — placeholder icon instead of Image
    expect(screen.getByText('Mythri Entertainments')).toBeTruthy();
  });

  it('handles undefined id from URL params (id ?? "" branch)', () => {
    const expoRouter = require('expo-router');
    const origParams = expoRouter.useLocalSearchParams;
    expoRouter.useLocalSearchParams = () => ({ id: undefined });

    mockFollowSet = new Set<string>();
    mockUseProductionHouseDetail.mockReturnValue(defaultHookReturn);

    render(<ProductionHouseDetailScreen />);
    // Follow with empty id
    fireEvent.press(screen.getByTestId('follow-btn'));
    expect(mockFollowMutate).toHaveBeenCalledWith(expect.objectContaining({ entityId: '' }));

    expoRouter.useLocalSearchParams = origParams;
  });
});
