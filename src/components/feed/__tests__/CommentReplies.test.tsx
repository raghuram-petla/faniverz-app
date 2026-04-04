jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { gray500: '#6b7280', red600: '#dc2626', red500: '#ef4444', white: '#fff' },
  }),
}));

jest.mock('@/styles/postDetail.styles', () => ({
  createPostDetailStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/hooks/useRelativeTime', () => ({
  useRelativeTime: () => '2m ago',
}));

const mockFetchReplies = jest.fn();
const mockFetchLikes = jest.fn(() => ({}));
let mockIsRepliesLoading = false;
jest.mock('@/features/feed', () => ({
  useReplies: (parentId: string) => {
    if (!parentId) return { data: undefined, isLoading: false };
    return { data: mockFetchReplies(), isLoading: mockIsRepliesLoading };
  },
  useUserCommentLikes: () => ({ data: mockFetchLikes() }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CommentReplies } from '../CommentReplies';
import type { FeedComment } from '@shared/types';

const makeComment = (overrides: Partial<FeedComment> = {}): FeedComment => ({
  id: 'c1',
  feed_item_id: 'f1',
  user_id: 'u1',
  body: 'Top level',
  created_at: '2026-01-01',
  parent_comment_id: null,
  like_count: 0,
  reply_count: 2,
  profile: { display_name: 'User1', avatar_url: null },
  ...overrides,
});

const makeReply = (id: string): FeedComment => ({
  id,
  feed_item_id: 'f1',
  user_id: 'u2',
  body: `@User1 reply ${id}`,
  created_at: '2026-01-02',
  parent_comment_id: 'c1',
  like_count: 0,
  reply_count: 0,
  profile: { display_name: 'User2', avatar_url: null },
});

describe('CommentReplies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRepliesLoading = false;
  });

  it('returns null when reply_count is 0', () => {
    const { toJSON } = render(
      <CommentReplies
        parentComment={makeComment({ reply_count: 0 })}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('shows view replies toggle for singular', () => {
    render(
      <CommentReplies
        parentComment={makeComment({ reply_count: 1 })}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('feed.viewReply')).toBeTruthy();
  });

  it('shows view replies toggle for plural', () => {
    render(
      <CommentReplies
        parentComment={makeComment({ reply_count: 3 })}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('feed.viewReplies')).toBeTruthy();
  });

  it('expands and shows replies when toggle pressed', () => {
    const replies = [makeReply('r1'), makeReply('r2')];
    mockFetchReplies.mockReturnValue(replies);

    render(
      <CommentReplies
        parentComment={makeComment()}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('feed.viewReplies'));
    expect(screen.getByText('feed.hideReplies')).toBeTruthy();
    expect(screen.getAllByText('User2')).toHaveLength(2);
  });

  it('calls onReply when reply button pressed on a reply', () => {
    const replies = [makeReply('r1')];
    mockFetchReplies.mockReturnValue(replies);
    const onReply = jest.fn();

    render(
      <CommentReplies
        parentComment={makeComment()}
        userId="u1"
        onReply={onReply}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('feed.viewReplies'));
    fireEvent.press(screen.getByLabelText('Reply to comment'));
    expect(onReply).toHaveBeenCalledWith(replies[0]);
  });

  it('calls onLike with reply id when like button pressed on a reply', () => {
    const replies = [makeReply('r1')];
    mockFetchReplies.mockReturnValue(replies);
    mockFetchLikes.mockReturnValue({});
    const onLike = jest.fn();

    render(
      <CommentReplies
        parentComment={makeComment()}
        userId="u1"
        onReply={jest.fn()}
        onLike={onLike}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('feed.viewReplies'));
    fireEvent.press(screen.getByLabelText('Like comment'));
    expect(onLike).toHaveBeenCalledWith('r1');
  });

  it('calls onUnlike with reply id when unlike button pressed on a liked reply', () => {
    const replies = [makeReply('r1')];
    mockFetchReplies.mockReturnValue(replies);
    mockFetchLikes.mockReturnValue({ r1: true });
    const onUnlike = jest.fn();

    render(
      <CommentReplies
        parentComment={makeComment()}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={onUnlike}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('feed.viewReplies'));
    fireEvent.press(screen.getByLabelText('Unlike comment'));
    expect(onUnlike).toHaveBeenCalledWith('r1');
  });

  it('calls onDelete with reply id and parent id', () => {
    const replies = [{ ...makeReply('r1'), user_id: 'u1' }];
    mockFetchReplies.mockReturnValue(replies);
    const onDelete = jest.fn();

    render(
      <CommentReplies
        parentComment={makeComment()}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.press(screen.getByText('feed.viewReplies'));
    fireEvent.press(screen.getByLabelText('Delete comment'));
    expect(onDelete).toHaveBeenCalledWith('r1', 'c1');
  });

  it('uses {} default when useUserCommentLikes returns undefined data', () => {
    const replies = [makeReply('r1')];
    mockFetchReplies.mockReturnValue(replies);
    // Return undefined so the = {} destructuring default kicks in
    mockFetchLikes.mockReturnValue(undefined as unknown as Record<string, true>);

    render(
      <CommentReplies
        parentComment={makeComment()}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('feed.viewReplies'));
    // Should render replies without crashing (replyLikes defaults to {})
    expect(screen.getByText('@User1 reply r1')).toBeTruthy();
  });

  it('shows ActivityIndicator while replies are loading', () => {
    const { ActivityIndicator } = require('react-native');
    mockFetchReplies.mockReturnValue(undefined);
    mockIsRepliesLoading = true;

    render(
      <CommentReplies
        parentComment={makeComment()}
        userId="u1"
        onReply={jest.fn()}
        onLike={jest.fn()}
        onUnlike={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('feed.viewReplies'));
    // ActivityIndicator renders when isLoading is true
    expect(screen.UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
  });
});
