jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: { title: string }) => <Text>{title}</Text> };
});

const mockUseUserActivity = jest.fn();
jest.mock('@/features/profile', () => ({
  useUserActivity: (...args: unknown[]) => mockUseUserActivity(...args),
}));

jest.mock('@/components/profile/ActivityItem', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    ActivityItem: ({
      activity,
      onPress,
    }: {
      activity: { action_type: string };
      onPress: () => void;
    }) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{activity.action_type}</Text>
      </TouchableOpacity>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ActivityScreen from '../activity';

describe('ActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserActivity.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });
  });

  it('renders header', () => {
    render(<ActivityScreen />);
    expect(screen.getByText('profile.activity')).toBeTruthy();
  });

  it('renders filter chips', () => {
    render(<ActivityScreen />);
    expect(screen.getByText('common.all')).toBeTruthy();
    expect(screen.getByText('profile.filterVotes')).toBeTruthy();
    expect(screen.getByText('profile.filterFollows')).toBeTruthy();
    expect(screen.getByText('profile.filterComments')).toBeTruthy();
  });

  it('shows empty state when no activity', () => {
    render(<ActivityScreen />);
    expect(screen.getByText('profile.noActivity')).toBeTruthy();
  });

  it('renders activity items', () => {
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [[{ id: 'a1', action_type: 'vote', entity_type: 'feed_item', entity_id: 'f1' }]],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    render(<ActivityScreen />);
    expect(screen.getByText('vote')).toBeTruthy();
  });

  it('navigates to post when feed_item activity is pressed', () => {
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [[{ id: 'a1', action_type: 'vote', entity_type: 'feed_item', entity_id: 'f1' }]],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    render(<ActivityScreen />);
    fireEvent.press(screen.getByText('vote'));
    expect(mockRouter.push).toHaveBeenCalledWith('/post/f1');
  });

  it('navigates to movie when movie activity is pressed', () => {
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [[{ id: 'a1', action_type: 'follow', entity_type: 'movie', entity_id: 'm1' }]],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    render(<ActivityScreen />);
    fireEvent.press(screen.getByText('follow'));
    expect(mockRouter.push).toHaveBeenCalledWith('/movie/m1');
  });

  it('changes filter when chip is pressed', () => {
    render(<ActivityScreen />);
    fireEvent.press(screen.getByText('profile.filterVotes'));
    expect(mockUseUserActivity).toHaveBeenCalledWith('votes');
  });

  it('navigates to actor when actor activity is pressed', () => {
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [[{ id: 'a2', action_type: 'follow', entity_type: 'actor', entity_id: 'ac1' }]],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    render(<ActivityScreen />);
    fireEvent.press(screen.getByText('follow'));
    expect(mockRouter.push).toHaveBeenCalledWith('/actor/ac1');
  });

  it('navigates to production house when production_house activity is pressed', () => {
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [
          [{ id: 'a3', action_type: 'follow', entity_type: 'production_house', entity_id: 'ph1' }],
        ],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    render(<ActivityScreen />);
    fireEvent.press(screen.getByText('follow'));
    expect(mockRouter.push).toHaveBeenCalledWith('/production-house/ph1');
  });

  it('does not navigate for unknown entity_type', () => {
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [[{ id: 'a4', action_type: 'vote', entity_type: 'unknown_type', entity_id: 'x1' }]],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    render(<ActivityScreen />);
    fireEvent.press(screen.getByText('vote'));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('calls fetchNextPage when end reached and hasNextPage is true', () => {
    const mockFetchNextPage = jest.fn();
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [[{ id: 'a1', action_type: 'vote', entity_type: 'movie', entity_id: 'm1' }]],
      },
      isLoading: false,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<ActivityScreen />);
    const list = screen.UNSAFE_getByType(require('react-native').FlatList);
    list.props.onEndReached();
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('does not call fetchNextPage when already fetching', () => {
    const mockFetchNextPage = jest.fn();
    mockUseUserActivity.mockReturnValue({
      data: {
        pages: [[{ id: 'a1', action_type: 'vote', entity_type: 'movie', entity_id: 'm1' }]],
      },
      isLoading: false,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    render(<ActivityScreen />);
    const list = screen.UNSAFE_getByType(require('react-native').FlatList);
    list.props.onEndReached();
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});
