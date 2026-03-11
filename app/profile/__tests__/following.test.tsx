jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const mockRefetch = jest.fn();
jest.mock('@/features/feed', () => ({
  useEnrichedFollows: jest.fn(() => ({
    data: [
      { entity_type: 'movie', entity_id: 'm1', name: 'Pushpa 2', image_url: null, created_at: '' },
      {
        entity_type: 'actor',
        entity_id: 'a1',
        name: 'Allu Arjun',
        image_url: null,
        created_at: '',
      },
    ],
    isLoading: false,
    refetch: mockRefetch,
  })),
  useUnfollowEntity: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: { title: string }) => <Text>{title}</Text> };
});

jest.mock('@/components/ui/EmptyState', () => ({
  EmptyState: () => null,
}));

jest.mock('@/components/common/LoadingCenter', () => ({
  LoadingCenter: () => null,
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: () => 'https://example.com/img.jpg',
}));

jest.mock('@/components/common/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FollowingScreen from '../following';

describe('FollowingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders header', () => {
    render(<FollowingScreen />);
    expect(screen.getByText('Following')).toBeTruthy();
  });

  it('renders filter chips', () => {
    render(<FollowingScreen />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Movies')).toBeTruthy();
    expect(screen.getByText('Actors')).toBeTruthy();
    expect(screen.getByText('Studios')).toBeTruthy();
  });

  it('renders followed entities', () => {
    render(<FollowingScreen />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
  });

  it('navigates to entity on press', () => {
    render(<FollowingScreen />);
    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(mockRouter.push).toHaveBeenCalledWith('/movie/m1');
  });

  it('filters by entity type', () => {
    render(<FollowingScreen />);
    fireEvent.press(screen.getByText('Actors'));
    // Should only show actors
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
    expect(screen.queryByText('Pushpa 2')).toBeNull();
  });

  it('shows unfollow button for each entity', () => {
    render(<FollowingScreen />);
    expect(screen.getByLabelText('Unfollow Pushpa 2')).toBeTruthy();
    expect(screen.getByLabelText('Unfollow Allu Arjun')).toBeTruthy();
  });
});
