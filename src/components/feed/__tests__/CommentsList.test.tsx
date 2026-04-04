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
  CommentItem: ({
    comment,
    isOwn,
    onDelete,
    onLike,
    onUnlike,
    onReply,
  }: {
    comment: { id: string };
    isOwn: boolean;
    onDelete?: (id: string) => void;
    onLike?: () => void;
    onUnlike?: () => void;
    onReply?: (comment: { id: string }) => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={`comment-${comment.id}`}>
        <Text>{isOwn ? 'own' : 'other'}</Text>
        {onDelete && (
          <TouchableOpacity
            testID={`comment-delete-${comment.id}`}
            onPress={() => onDelete(comment.id)}
          />
        )}
        {onLike && (
          <TouchableOpacity testID={`comment-like-${comment.id}`} onPress={() => onLike()} />
        )}
        {onUnlike && (
          <TouchableOpacity testID={`comment-unlike-${comment.id}`} onPress={() => onUnlike()} />
        )}
        {onReply && (
          <TouchableOpacity
            testID={`comment-reply-${comment.id}`}
            onPress={() => onReply(comment)}
          />
        )}
      </View>
    );
  },
}));

jest.mock('../CommentReplies', () => ({
  CommentReplies: ({
    parentComment,
    onDelete,
    onLike,
    onUnlike,
    onReply,
  }: {
    parentComment: { id: string; reply_count: number };
    onDelete?: (id: string, parentId: string | null) => void;
    onLike?: (id: string) => void;
    onUnlike?: (id: string) => void;
    onReply?: (comment: { id: string }) => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={`replies-${parentComment.id}`}>
        <Text>replies</Text>
        {onDelete && (
          <TouchableOpacity
            testID={`replies-delete-${parentComment.id}`}
            onPress={() => onDelete('reply1', parentComment.id)}
          />
        )}
        {onLike && (
          <TouchableOpacity
            testID={`replies-like-${parentComment.id}`}
            onPress={() => onLike('reply1')}
          />
        )}
        {onUnlike && (
          <TouchableOpacity
            testID={`replies-unlike-${parentComment.id}`}
            onPress={() => onUnlike('reply1')}
          />
        )}
        {onReply && (
          <TouchableOpacity
            testID={`replies-reply-${parentComment.id}`}
            onPress={() => onReply({ id: 'reply1' })}
          />
        )}
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

  it('onDelete wrapper passes null as parentCommentId for top-level comments', () => {
    const onDelete = jest.fn();
    const comments = [makeComment('c1', 'u1')];
    render(
      <CommentsList
        comments={comments}
        userId="u1"
        likedCommentIds={{}}
        isLoading={false}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(screen.getByTestId('comment-delete-c1'));
    expect(onDelete).toHaveBeenCalledWith('c1', null);
  });

  it('onLike wrapper passes the comment.id', () => {
    const onLike = jest.fn();
    const comments = [makeComment('c1', 'u1')];
    render(
      <CommentsList
        comments={comments}
        userId="u1"
        likedCommentIds={{}}
        isLoading={false}
        onLike={onLike}
      />,
    );
    fireEvent.press(screen.getByTestId('comment-like-c1'));
    expect(onLike).toHaveBeenCalledWith('c1');
  });

  it('onUnlike wrapper passes the comment.id', () => {
    const onUnlike = jest.fn();
    const comments = [makeComment('c1', 'u1')];
    render(
      <CommentsList
        comments={comments}
        userId="u1"
        likedCommentIds={{}}
        isLoading={false}
        onUnlike={onUnlike}
      />,
    );
    fireEvent.press(screen.getByTestId('comment-unlike-c1'));
    expect(onUnlike).toHaveBeenCalledWith('c1');
  });

  it('CommentReplies receives fallback no-op functions when handlers are undefined', () => {
    // When onReply/onLike/onUnlike/onDelete are not provided, CommentReplies still renders
    // and pressing its buttons does not throw (no-ops are invoked safely)
    const comments = [{ ...makeComment('c1', 'u1'), reply_count: 2 }];
    render(
      <CommentsList
        comments={comments}
        userId="u1"
        likedCommentIds={{}}
        isLoading={false}
      />,
    );
    expect(screen.getByTestId('replies-c1')).toBeTruthy();
    // Pressing delete/like/unlike on CommentReplies should not throw when no handlers provided
    expect(() => {
      fireEvent.press(screen.getByTestId('replies-delete-c1'));
      fireEvent.press(screen.getByTestId('replies-like-c1'));
      fireEvent.press(screen.getByTestId('replies-unlike-c1'));
    }).not.toThrow();
  });

  it('onDelete wrapper in CommentReplies passes parentId correctly', () => {
    const onDelete = jest.fn();
    const comments = [{ ...makeComment('c1', 'u1'), reply_count: 2 }];
    render(
      <CommentsList
        comments={comments}
        userId="u1"
        likedCommentIds={{}}
        isLoading={false}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(screen.getByTestId('replies-delete-c1'));
    // The mock fires onDelete('reply1', 'c1'); the wrapper forwards both args to the prop
    expect(onDelete).toHaveBeenCalledWith('reply1', 'c1');
  });
});
