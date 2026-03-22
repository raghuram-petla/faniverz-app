import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActivityItem } from '../ActivityItem';
import type { UserActivity } from '@/features/profile';

const mockActivity: UserActivity = {
  id: 'a1',
  user_id: 'u1',
  action_type: 'vote',
  entity_type: 'feed_item',
  entity_id: 'f1',
  metadata: { vote_type: 'up' },
  created_at: new Date().toISOString(),
};

describe('ActivityItem', () => {
  it('renders vote activity label', () => {
    render(<ActivityItem activity={mockActivity} onPress={jest.fn()} />);
    expect(screen.getByText('Voted on a post')).toBeTruthy();
  });

  it('renders follow activity with entity label', () => {
    const followActivity = {
      ...mockActivity,
      action_type: 'follow' as const,
      entity_type: 'movie' as const,
    };
    render(<ActivityItem activity={followActivity} onPress={jest.fn()} />);
    expect(screen.getByText('Followed a movie')).toBeTruthy();
  });

  it('renders comment activity label', () => {
    const commentActivity = { ...mockActivity, action_type: 'comment' as const };
    render(<ActivityItem activity={commentActivity} onPress={jest.fn()} />);
    expect(screen.getByText('Commented on a post')).toBeTruthy();
  });

  it('renders review activity label', () => {
    const reviewActivity = {
      ...mockActivity,
      action_type: 'review' as const,
      entity_type: 'movie' as const,
    };
    render(<ActivityItem activity={reviewActivity} onPress={jest.fn()} />);
    expect(screen.getByText('Wrote a review')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<ActivityItem activity={mockActivity} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Voted on a post'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders unfollow activity with entity label', () => {
    const unfollowActivity = {
      ...mockActivity,
      action_type: 'unfollow' as const,
      entity_type: 'actor' as const,
    };
    render(<ActivityItem activity={unfollowActivity} onPress={jest.fn()} />);
    expect(screen.getByText('Unfollowed an actor')).toBeTruthy();
  });

  it('falls back to vote config for unknown action_type', () => {
    const unknownActivity = {
      ...mockActivity,
      action_type: 'unknown_action' as never,
      entity_type: 'movie' as const,
    };
    render(<ActivityItem activity={unknownActivity} onPress={jest.fn()} />);
    // Falls back to vote config which shows 'Voted on a post'
    expect(screen.getByText('Voted on a post')).toBeTruthy();
  });

  it('falls back to empty string for unknown entity_type in follow activity', () => {
    const followUnknownEntity = {
      ...mockActivity,
      action_type: 'follow' as const,
      entity_type: 'unknown_entity' as never,
    };
    render(<ActivityItem activity={followUnknownEntity} onPress={jest.fn()} />);
    // entity_type not in ENTITY_LABEL_KEYS, falls back to '' translation
    expect(screen.getByText('Followed')).toBeTruthy();
  });

  it('renders production_house entity label for follow', () => {
    const followStudio = {
      ...mockActivity,
      action_type: 'follow' as const,
      entity_type: 'production_house' as const,
    };
    render(<ActivityItem activity={followStudio} onPress={jest.fn()} />);
    expect(screen.getByText('Followed a studio')).toBeTruthy();
  });
});
