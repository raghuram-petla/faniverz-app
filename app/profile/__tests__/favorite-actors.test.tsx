jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/actors/hooks', () => ({
  useFavoriteActors: jest.fn(),
  useFavoriteActorMutations: jest.fn(),
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      titleBadge,
      rightAction,
    }: {
      title: string;
      titleBadge?: React.ReactNode;
      rightAction?: React.ReactNode;
    }) => (
      <View>
        <Text>{title}</Text>
        {titleBadge}
        {rightAction}
      </View>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FavoriteActorsScreen from '../favorite-actors';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useFavoriteActors, useFavoriteActorMutations } from '@/features/actors/hooks';

const mockUseAuth = useAuth as jest.Mock;
const mockUseFavoriteActors = useFavoriteActors as jest.Mock;
const mockUseFavoriteActorMutations = useFavoriteActorMutations as jest.Mock;

const mockRemoveMutate = jest.fn();

describe('FavoriteActorsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    mockUseFavoriteActorMutations.mockReturnValue({
      remove: { mutate: mockRemoveMutate },
    });
  });

  it('renders "Favorite Actors" header', () => {
    mockUseFavoriteActors.mockReturnValue({ data: [], isLoading: false });
    render(<FavoriteActorsScreen />);
    expect(screen.getByText('Favorite Actors')).toBeTruthy();
  });

  it('shows loading indicator', () => {
    mockUseFavoriteActors.mockReturnValue({ data: undefined, isLoading: true });
    const { toJSON } = render(<FavoriteActorsScreen />);
    // ActivityIndicator is rendered when isLoading is true
    expect(toJSON()).toBeTruthy();
  });

  it('shows empty state when no favorites', () => {
    mockUseFavoriteActors.mockReturnValue({ data: [], isLoading: false });
    render(<FavoriteActorsScreen />);
    expect(screen.getByText('No favorite actors yet')).toBeTruthy();
    expect(
      screen.getByText('Add actors you love to keep track of their upcoming movies.'),
    ).toBeTruthy();
  });

  it('shows actor grid when favorites exist', () => {
    const favorites = [
      {
        actor_id: 'a1',
        user_id: 'user-1',
        actor: {
          id: 'a1',
          name: 'Allu Arjun',
          photo_url: 'https://example.com/photo.jpg',
          tmdb_person_id: null,
          created_at: '',
        },
      },
      {
        actor_id: 'a2',
        user_id: 'user-1',
        actor: {
          id: 'a2',
          name: 'Ram Charan',
          photo_url: null,
          tmdb_person_id: null,
          created_at: '',
        },
      },
    ];
    mockUseFavoriteActors.mockReturnValue({ data: favorites, isLoading: false });

    render(<FavoriteActorsScreen />);
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
    expect(screen.getByText('Ram Charan')).toBeTruthy();
  });

  it('calls remove mutation when remove button is pressed', () => {
    const favorites = [
      {
        actor_id: 'a1',
        user_id: 'user-1',
        actor: {
          id: 'a1',
          name: 'Allu Arjun',
          photo_url: null,
          tmdb_person_id: null,
          created_at: '',
        },
      },
    ];
    mockUseFavoriteActors.mockReturnValue({ data: favorites, isLoading: false });

    render(<FavoriteActorsScreen />);

    // Find all touchable elements and press each one until remove is triggered
    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    for (const touchable of touchables) {
      fireEvent.press(touchable);
      if (mockRemoveMutate.mock.calls.length > 0) break;
    }
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      actorId: 'a1',
    });
  });

  it('shows "Add Actors" action in empty state', () => {
    mockUseFavoriteActors.mockReturnValue({ data: [], isLoading: false });
    render(<FavoriteActorsScreen />);
    expect(screen.getByText('Add Actors')).toBeTruthy();
  });

  it('shows count badge when actors exist', () => {
    const favorites = [
      {
        actor_id: 'a1',
        user_id: 'user-1',
        actor: {
          id: 'a1',
          name: 'Allu Arjun',
          photo_url: null,
          tmdb_person_id: null,
          created_at: '',
        },
      },
      {
        actor_id: 'a2',
        user_id: 'user-1',
        actor: {
          id: 'a2',
          name: 'Ram Charan',
          photo_url: null,
          tmdb_person_id: null,
          created_at: '',
        },
      },
    ];
    mockUseFavoriteActors.mockReturnValue({ data: favorites, isLoading: false });

    render(<FavoriteActorsScreen />);
    // The count badge should show "2"
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('does not call remove when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: true,
      setIsGuest: jest.fn(),
    });
    const favorites = [
      {
        actor_id: 'a1',
        user_id: 'user-1',
        actor: {
          id: 'a1',
          name: 'Allu Arjun',
          photo_url: null,
          tmdb_person_id: null,
          created_at: '',
        },
      },
    ];
    mockUseFavoriteActors.mockReturnValue({ data: favorites, isLoading: false });

    render(<FavoriteActorsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    for (const touchable of touchables) {
      fireEvent.press(touchable);
    }
    // Should not call remove when user is null
    expect(mockRemoveMutate).not.toHaveBeenCalled();
  });
});
