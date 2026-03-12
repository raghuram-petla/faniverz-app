jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'user-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
  }),
}));

jest.mock('@/styles/userProfile.styles', () => ({
  createUserProfileStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (opts: unknown) => mockUseQuery(opts),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
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
import UserProfileScreen from '../[id]';

const fullProfile = {
  id: 'user-1',
  display_name: 'Mahesh Babu',
  username: 'mahesh_babu',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: 'Telugu superstar.',
  location: 'Hyderabad, India',
  created_at: '2024-01-15T00:00:00Z',
};

describe('UserProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { UNSAFE_root } = render(<UserProfileScreen />);
    // ActivityIndicator is rendered when isLoading is true
    const indicators = UNSAFE_root.findAllByType(require('react-native').ActivityIndicator);
    expect(indicators.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when profile is null', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.getByText('No results found')).toBeTruthy();
  });

  it('renders empty state when profile is undefined (not found)', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.getByText('No results found')).toBeTruthy();
  });

  it('renders profile data when loaded', () => {
    mockUseQuery.mockReturnValue({ data: fullProfile, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.getByText('Mahesh Babu')).toBeTruthy();
    expect(screen.getByText('@mahesh_babu')).toBeTruthy();
    expect(screen.getByText('Telugu superstar.')).toBeTruthy();
    expect(screen.getByText('Hyderabad, India')).toBeTruthy();
  });

  it('renders member since date', () => {
    mockUseQuery.mockReturnValue({ data: fullProfile, isLoading: false });
    render(<UserProfileScreen />);
    const expectedDate = new Date('2024-01-15T00:00:00Z').toLocaleDateString();
    expect(screen.getByText(`Member since ${expectedDate}`)).toBeTruthy();
  });

  it('renders without username when profile has no username', () => {
    const noUsername = { ...fullProfile, username: null };
    mockUseQuery.mockReturnValue({ data: noUsername, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.getByText('Mahesh Babu')).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('renders header title', () => {
    mockUseQuery.mockReturnValue({ data: fullProfile, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('uses ScreenHeader for navigation', () => {
    mockUseQuery.mockReturnValue({ data: fullProfile, isLoading: false });
    render(<UserProfileScreen />);
    // ScreenHeader is mocked and renders title text
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('does not render bio section when bio is null', () => {
    const noBio = { ...fullProfile, bio: null };
    mockUseQuery.mockReturnValue({ data: noBio, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.queryByText('Telugu superstar.')).toBeNull();
  });

  it('does not render location when location is null', () => {
    const noLocation = { ...fullProfile, location: null };
    mockUseQuery.mockReturnValue({ data: noLocation, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.queryByText('Hyderabad, India')).toBeNull();
  });

  it('does not render member since when created_at is null', () => {
    const noDate = { ...fullProfile, created_at: null };
    mockUseQuery.mockReturnValue({ data: noDate, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.queryByText(/Member since/)).toBeNull();
  });

  it('shows anonymous fallback when both display_name and username are null', () => {
    const noNames = { ...fullProfile, display_name: null, username: null };
    mockUseQuery.mockReturnValue({ data: noNames, isLoading: false });
    render(<UserProfileScreen />);
    expect(screen.getByText('Anonymous')).toBeTruthy();
  });
});
