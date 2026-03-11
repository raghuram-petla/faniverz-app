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
});
