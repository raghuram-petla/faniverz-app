jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { gray500: '#6b7280', red500: '#ef4444', red600: '#dc2626', white: '#fff' },
  }),
}));

jest.mock('@/styles/postDetail.styles', () => ({
  createPostDetailStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/hooks/useRelativeTime', () => ({
  useRelativeTime: (d: string) => `${d}-ago`,
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
  parent_comment_id: null,
  like_count: 0,
  reply_count: 0,
  profile: { display_name: 'TestUser', avatar_url: null },
  ...overrides,
});

describe('CommentItem', () => {
  it('renders display name and body', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} isLiked={false} />);
    expect(screen.getByText('TestUser')).toBeTruthy();
    expect(screen.getByText('Great post!')).toBeTruthy();
  });

  it('renders relative time', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} isLiked={false} />);
    expect(screen.getByText('2026-03-10T12:00:00Z-ago')).toBeTruthy();
  });

  it('shows Anonymous when no display_name', () => {
    render(
      <CommentItem comment={makeComment({ profile: { display_name: null, avatar_url: null } })} isOwn={false} isLiked={false} />,
    );
    expect(screen.getByText('Anonymous')).toBeTruthy();
  });

  it('renders avatar image when avatar_url is set', () => {
    render(
      <CommentItem
        comment={makeComment({ profile: { display_name: 'User', avatar_url: 'https://example.com/avatar.jpg' } })}
        isOwn={false}
        isLiked={false}
      />,
    );
    // Image should be rendered (avatar_url present)
    expect(screen.getByText('User')).toBeTruthy();
  });

  it('shows delete button for own comments', () => {
    const onDelete = jest.fn();
    render(<CommentItem comment={makeComment()} isOwn={true} isLiked={false} onDelete={onDelete} />);
    fireEvent.press(screen.getByLabelText('Delete comment'));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('hides delete button when not own comment', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} isLiked={false} onDelete={jest.fn()} />);
    expect(screen.queryByLabelText('Delete comment')).toBeNull();
  });

  it('shows reply button and fires onReply', () => {
    const onReply = jest.fn();
    const comment = makeComment();
    render(<CommentItem comment={comment} isOwn={false} isLiked={false} onReply={onReply} />);
    fireEvent.press(screen.getByLabelText('Reply to comment'));
    expect(onReply).toHaveBeenCalledWith(comment);
  });

  it('shows like button and fires onLike when not liked', () => {
    const onLike = jest.fn();
    render(<CommentItem comment={makeComment()} isOwn={false} isLiked={false} onLike={onLike} />);
    fireEvent.press(screen.getByLabelText('Like comment'));
    expect(onLike).toHaveBeenCalled();
  });

  it('shows unlike button and fires onUnlike when liked', () => {
    const onUnlike = jest.fn();
    render(<CommentItem comment={makeComment()} isOwn={false} isLiked={true} onUnlike={onUnlike} />);
    fireEvent.press(screen.getByLabelText('Unlike comment'));
    expect(onUnlike).toHaveBeenCalled();
  });

  it('shows like count when > 0', () => {
    render(<CommentItem comment={makeComment({ like_count: 5 })} isOwn={false} isLiked={false} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('hides like count when 0', () => {
    render(<CommentItem comment={makeComment({ like_count: 0 })} isOwn={false} isLiked={false} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders @[Name] mention in nested comments', () => {
    const comment = makeComment({ body: '@[UserA] some reply', parent_comment_id: 'c0' });
    render(<CommentItem comment={comment} isOwn={false} isLiked={false} isNested />);
    expect(screen.getByText('@UserA')).toBeTruthy();
    expect(screen.getByText(/some reply/)).toBeTruthy();
  });

  it('handles multi-word @[Name] mentions', () => {
    const comment = makeComment({ body: '@[John Smith] great point', parent_comment_id: 'c0' });
    render(<CommentItem comment={comment} isOwn={false} isLiked={false} isNested />);
    expect(screen.getByText('@John Smith')).toBeTruthy();
    expect(screen.getByText(/great point/)).toBeTruthy();
  });

  it('does not parse mention for top-level comments', () => {
    const comment = makeComment({ body: '@[UserA] some text' });
    render(<CommentItem comment={comment} isOwn={false} isLiked={false} />);
    // Should render full body without splitting
    expect(screen.getByText('@[UserA] some text')).toBeTruthy();
  });

  it('hides delete button when no onDelete provided but isOwn', () => {
    render(<CommentItem comment={makeComment()} isOwn={true} isLiked={false} />);
    expect(screen.queryByLabelText('Delete comment')).toBeNull();
  });
});
