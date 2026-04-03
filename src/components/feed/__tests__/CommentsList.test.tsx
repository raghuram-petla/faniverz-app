jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { gray500: '#6b7280', red600: '#dc2626', red500: '#ef4444', white: '#fff' },
  }),
}));

jest.mock('@/styles/postDetail.styles', () => ({
  createPostDetailStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../CommentItem', () => ({
  CommentItem: ({ comment, isOwn }: { comment: { id: string }; isOwn: boolean }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`comment-${comment.id}`}>
        <Text>{isOwn ? 'own' : 'other'}</Text>
      </View>
    );
  },
}));

jest.mock('../CommentReplies', () => ({
  CommentReplies: ({ parentComment }: { parentComment: { id: string; reply_count: number } }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`replies-${parentComment.id}`}>
        <Text>replies</Text>
      </View>
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CommentsList } from '../CommentsList';
import type { FeedComment } from '@shared/types';

const makeComment = (id: string, userId: string): FeedComment => ({
  id,
  feed_item_id: 'f1',
  user_id: userId,
  body: `Comment ${id}`,
  created_at: '2026-03-10T12:00:00Z',
  parent_comment_id: null,
  like_count: 0,
  reply_count: 0,
  profile: { display_name: 'User', avatar_url: null },
});

describe('CommentsList', () => {
  it('shows loading indicator when loading', () => {
    const { toJSON } = render(
      <CommentsList comments={[]} userId={null} likedCommentIds={{}} isLoading={true} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('ActivityIndicator');
  });

  it('shows empty state when no comments', () => {
    render(<CommentsList comments={[]} userId={null} likedCommentIds={{}} isLoading={false} />);
    expect(screen.getByText('No comments yet. Be the first!')).toBeTruthy();
  });

  it('renders comments without CommentReplies when reply_count is 0', () => {
    const comments = [makeComment('c1', 'u1'), makeComment('c2', 'u2')];
    render(
      <CommentsList comments={comments} userId="u1" likedCommentIds={{}} isLoading={false} />,
    );
    expect(screen.getByTestId('comment-c1')).toBeTruthy();
    expect(screen.getByTestId('comment-c2')).toBeTruthy();
    // reply_count is 0, so CommentReplies should not render
    expect(screen.queryByTestId('replies-c1')).toBeNull();
    expect(screen.queryByTestId('replies-c2')).toBeNull();
  });

  it('renders CommentReplies when reply_count > 0', () => {
    const comments = [{ ...makeComment('c1', 'u1'), reply_count: 3 }];
    render(
      <CommentsList comments={comments} userId="u1" likedCommentIds={{}} isLoading={false} />,
    );
    expect(screen.getByTestId('comment-c1')).toBeTruthy();
    expect(screen.getByTestId('replies-c1')).toBeTruthy();
  });

  it('passes isOwn correctly', () => {
    const comments = [makeComment('c1', 'u1'), makeComment('c2', 'u2')];
    render(
      <CommentsList comments={comments} userId="u1" likedCommentIds={{}} isLoading={false} />,
    );
    const texts = screen.getAllByText(/^(own|other)$/);
    expect(texts[0].props.children).toBe('own');
    expect(texts[1].props.children).toBe('other');
  });

  it('shows Load more button when hasNextPage', () => {
    const onLoadMore = jest.fn();
    render(
      <CommentsList
        comments={[makeComment('c1', 'u1')]}
        userId="u1"
        likedCommentIds={{}}
        isLoading={false}
        hasNextPage={true}
        onLoadMore={onLoadMore}
      />,
    );
    fireEvent.press(screen.getByLabelText('Load more comments'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('hides Load more when no next page', () => {
    render(
      <CommentsList
        comments={[makeComment('c1', 'u1')]}
        userId="u1"
        likedCommentIds={{}}
        isLoading={false}
        hasNextPage={false}
      />,
    );
    expect(screen.queryByLabelText('Load more comments')).toBeNull();
  });
});
