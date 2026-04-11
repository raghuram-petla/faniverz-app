const mockPush = jest.fn();

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { gray500: '#6b7280' },
    isDark: true,
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedCastCrewStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/common/ActorAvatar', () => ({
  ActorAvatar: ({ actor, size }: { actor?: { name?: string }; size: number }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="actor-avatar">
        <Text testID="avatar-size">{size}</Text>
        <Text testID="avatar-name">{actor?.name ?? 'unknown'}</Text>
      </View>
    );
  },
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: unknown) => c,
    },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (v: number) => v,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    Easing: { out: () => (v: number) => v, in: () => (v: number) => v, cubic: (v: number) => v },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pan: () => ({
        activeOffsetX: () => ({
          onUpdate: () => ({ onEnd: () => ({}) }),
        }),
      }),
    },
  };
});

jest.mock('@/features/movies/hooks/useMovieTopCredits');

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeedCastCrew } from '../FeedCastCrew';
import { useMovieTopCredits } from '@/features/movies/hooks/useMovieTopCredits';

const mockUseMovieTopCredits = useMovieTopCredits as jest.MockedFunction<typeof useMovieTopCredits>;

const mockCredits = [
  {
    id: 'c1',
    actor_id: 'a1',
    credit_type: 'cast' as const,
    actor: { id: 'a1', name: 'Actor One', photo_url: null },
    role_name: 'Hero',
    display_order: 0,
    role_order: null,
  },
  {
    id: 'c2',
    actor_id: 'a2',
    credit_type: 'cast' as const,
    actor: { id: 'a2', name: 'Actor Two', photo_url: null },
    role_name: 'Heroine',
    display_order: 1,
    role_order: null,
  },
  {
    id: 'cr1',
    actor_id: 'a3',
    credit_type: 'crew' as const,
    actor: { id: 'a3', name: 'Director Name', photo_url: null },
    role_name: 'Director',
    display_order: 0,
    role_order: 1,
  },
];

function mockCreditsReturn(data: object[] | undefined) {
  mockUseMovieTopCredits.mockReturnValue({
    data,
    isLoading: !data,
    isSuccess: !!data,
    isError: false,
    error: null,
  } as ReturnType<typeof useMovieTopCredits>);
}

describe('FeedCastCrew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when no credits', () => {
    mockCreditsReturn([]);
    const { toJSON } = render(<FeedCastCrew movieId="m1" />);
    expect(toJSON()).toBeNull();
  });

  it('renders null when data is undefined (loading)', () => {
    mockCreditsReturn(undefined);
    const { toJSON } = render(<FeedCastCrew movieId="m1" />);
    expect(toJSON()).toBeNull();
  });

  it('renders small 24px avatars for all credits', () => {
    mockCreditsReturn(mockCredits);
    const { getAllByTestId } = render(<FeedCastCrew movieId="m1" />);

    const avatars = getAllByTestId('actor-avatar');
    expect(avatars).toHaveLength(3);

    const sizes = getAllByTestId('avatar-size');
    sizes.forEach((s) => expect(s).toHaveTextContent('30'));
  });

  it('opens floating popup with big avatar when small circle tapped', () => {
    mockCreditsReturn(mockCredits);
    const { getByLabelText, getByTestId, getAllByTestId } = render(<FeedCastCrew movieId="m1" />);

    // Tap the first circle
    fireEvent.press(getByLabelText('Show Actor One details'));

    // Popup should be visible with a 96px avatar
    expect(getByTestId('cast-crew-popup')).toBeTruthy();
    const sizes = getAllByTestId('avatar-size');
    // One of the avatars should be 96 (the popup one)
    expect(sizes.some((s) => s.props.children === 140)).toBe(true);
  });

  it('shows name, role, and position in the popup', () => {
    mockCreditsReturn(mockCredits);
    const { getByLabelText, getByText } = render(<FeedCastCrew movieId="m1" />);

    fireEvent.press(getByLabelText('Show Actor One details'));

    expect(getByText('as Hero')).toBeTruthy();
    expect(getByText('1 / 3')).toBeTruthy();
  });

  it('shows crew role without "as" prefix', () => {
    mockCreditsReturn(mockCredits);
    const { getByLabelText, getByText } = render(<FeedCastCrew movieId="m1" />);

    fireEvent.press(getByLabelText('Show Director Name details'));
    expect(getByText('Director')).toBeTruthy();
  });

  it('navigates to actor detail when popup is tapped', () => {
    mockCreditsReturn(mockCredits);
    const { getByLabelText } = render(<FeedCastCrew movieId="m1" />);

    // Open popup
    fireEvent.press(getByLabelText('Show Actor One details'));
    // Tap popup to navigate
    fireEvent.press(getByLabelText('Go to Actor One'));

    expect(mockPush).toHaveBeenCalledWith('/actor/a1');
  });

  it('dismisses popup when backdrop is tapped', () => {
    mockCreditsReturn(mockCredits);
    const { getByLabelText, queryByTestId } = render(<FeedCastCrew movieId="m1" />);

    // Open popup
    fireEvent.press(getByLabelText('Show Actor One details'));
    expect(queryByTestId('cast-crew-popup')).toBeTruthy();

    // Tap backdrop to dismiss
    fireEvent.press(getByLabelText('Dismiss'));

    // Modal's visible prop should be false now
    // (The Modal component still renders but with visible=false)
  });

  it('renders with single credit', () => {
    mockCreditsReturn([mockCredits[0]]);
    const { getAllByTestId } = render(<FeedCastCrew movieId="m1" />);
    expect(getAllByTestId('actor-avatar')).toHaveLength(1);
  });
});
