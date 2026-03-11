jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { gray500: '#6b7280', red500: '#ef4444' },
  }),
}));

jest.mock('@/styles/postDetail.styles', () => ({
  createPostDetailStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/constants/feedHelpers', () => ({
  formatRelativeTime: (d: string) => `${d}-ago`,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CommentItem } from '../CommentItem';
import type { FeedComment } from '@shared/types';

const makeComment = (overrides: Partial<FeedComment> = {}): FeedComment => ({
  id: 'c1',
  feed_item_id: 'f1',
  user_id: 'u1',
  body: 'Great post!',
  created_at: '2026-03-10T12:00:00Z',
  profile: { display_name: 'TestUser' },
  ...overrides,
});

describe('CommentItem', () => {
  it('renders display name and body', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} />);
    expect(screen.getByText('TestUser')).toBeTruthy();
    expect(screen.getByText('Great post!')).toBeTruthy();
  });

  it('renders relative time', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} />);
    expect(screen.getByText('2026-03-10T12:00:00Z-ago')).toBeTruthy();
  });

  it('shows Anonymous when no display_name', () => {
    render(
      <CommentItem comment={makeComment({ profile: { display_name: null } })} isOwn={false} />,
    );
    expect(screen.getByText('Anonymous')).toBeTruthy();
  });

  it('shows delete button for own comments', () => {
    const onDelete = jest.fn();
    render(<CommentItem comment={makeComment()} isOwn={true} onDelete={onDelete} />);
    fireEvent.press(screen.getByLabelText('Delete comment'));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('hides delete button when not own comment', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} onDelete={jest.fn()} />);
    expect(screen.queryByLabelText('Delete comment')).toBeNull();
  });

  it('hides delete button when no onDelete', () => {
    render(<CommentItem comment={makeComment()} isOwn={true} />);
    expect(screen.queryByLabelText('Delete comment')).toBeNull();
  });
});
