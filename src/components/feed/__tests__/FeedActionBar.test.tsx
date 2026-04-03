jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: {
      white: '#fff',
      red600: '#dc2626',
      gray500: '#6b7280',
      yellow400: '#facc15',
      green500: '#22c55e',
      green600_20: 'rgba(22,163,74,0.2)',
      red500: '#ef4444',
      red600_20: 'rgba(220,38,38,0.2)',
    },
  }),
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { FeedActionBar } from '../FeedActionBar';

const defaultProps = {
  commentCount: 12,
  upvoteCount: 24,
  downvoteCount: 3,
  viewCount: 1500,
  userVote: null as 'up' | 'down' | null,
  isBookmarked: false,
};

describe('FeedActionBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders comment count', () => {
    render(<FeedActionBar {...defaultProps} />);
    expect(screen.getByLabelText('Comments, 12 comments')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('renders view count with K formatting', () => {
    render(<FeedActionBar {...defaultProps} />);
    expect(screen.getByLabelText('1500 views')).toBeTruthy();
    expect(screen.getByText('2K')).toBeTruthy();
  });

  it('renders share button', () => {
    render(<FeedActionBar {...defaultProps} />);
    expect(screen.getByLabelText('Share')).toBeTruthy();
  });

  it('renders upvote and downvote counts', () => {
    render(<FeedActionBar {...defaultProps} />);
    expect(screen.getByLabelText('Upvote, 24 upvotes')).toBeTruthy();
    expect(screen.getByLabelText('Downvote, 3 downvotes')).toBeTruthy();
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('calls onComment when comment button pressed', () => {
    const onComment = jest.fn();
    render(<FeedActionBar {...defaultProps} onComment={onComment} />);
    fireEvent.press(screen.getByLabelText('Comments, 12 comments'));
    expect(onComment).toHaveBeenCalled();
  });

  it('calls onShare when share button pressed', () => {
    const onShare = jest.fn();
    render(<FeedActionBar {...defaultProps} onShare={onShare} />);
    fireEvent.press(screen.getByLabelText('Share'));
    expect(onShare).toHaveBeenCalled();
  });

  it('calls onUpvote when upvote pressed', () => {
    const onUpvote = jest.fn();
    render(<FeedActionBar {...defaultProps} onUpvote={onUpvote} />);
    fireEvent.press(screen.getByLabelText('Upvote, 24 upvotes'));
    expect(onUpvote).toHaveBeenCalled();
  });

  it('calls onDownvote when downvote pressed', () => {
    const onDownvote = jest.fn();
    render(<FeedActionBar {...defaultProps} onDownvote={onDownvote} />);
    fireEvent.press(screen.getByLabelText('Downvote, 3 downvotes'));
    expect(onDownvote).toHaveBeenCalled();
  });

  it('shows filled icon and red color when userVote is up', () => {
    const { toJSON } = render(<FeedActionBar {...defaultProps} userVote="up" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"heart"');
    expect(json).toContain('#ef4444');
  });

  it('shows filled icon and red color when userVote is down', () => {
    const { toJSON } = render(<FeedActionBar {...defaultProps} userVote="down" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"heart-broken"');
    expect(json).toContain('#ef4444');
  });

  it('formats millions correctly', () => {
    render(<FeedActionBar {...defaultProps} viewCount={2500000} />);
    expect(screen.getByText('2.5M')).toBeTruthy();
  });

  it('shows raw count for numbers under 1000', () => {
    render(<FeedActionBar {...defaultProps} viewCount={42} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('disables comment button when no callback', () => {
    render(<FeedActionBar {...defaultProps} />);
    const commentBtn = screen.getByLabelText('Comments, 12 comments');
    expect(commentBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables share button when no callback', () => {
    render(<FeedActionBar {...defaultProps} />);
    const shareBtn = screen.getByLabelText('Share');
    expect(shareBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables vote buttons when no callbacks', () => {
    render(<FeedActionBar {...defaultProps} />);
    const upBtn = screen.getByLabelText('Upvote, 24 upvotes');
    const downBtn = screen.getByLabelText('Downvote, 3 downvotes');
    expect(upBtn.props.accessibilityState?.disabled).toBe(true);
    expect(downBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('handles null/undefined counts gracefully (defaults to 0)', () => {
    render(
      <FeedActionBar
        commentCount={undefined as unknown as number}
        upvoteCount={undefined as unknown as number}
        downvoteCount={undefined as unknown as number}
        viewCount={undefined as unknown as number}
        userVote={null}
        isBookmarked={false}
      />,
    );
    // Should not crash and default to 0
    expect(screen.getByLabelText('Comments, 0 comments')).toBeTruthy();
    expect(screen.getByLabelText('0 views')).toBeTruthy();
  });

  it('does not disable comment button when callback is provided', () => {
    const onComment = jest.fn();
    render(<FeedActionBar {...defaultProps} onComment={onComment} />);
    const commentBtn = screen.getByLabelText('Comments, 12 comments');
    expect(commentBtn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('does not disable upvote button when callback is provided', () => {
    const onUpvote = jest.fn();
    render(<FeedActionBar {...defaultProps} onUpvote={onUpvote} />);
    const upBtn = screen.getByLabelText('Upvote, 24 upvotes');
    expect(upBtn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('does not disable downvote button when callback is provided', () => {
    const onDownvote = jest.fn();
    render(<FeedActionBar {...defaultProps} onDownvote={onDownvote} />);
    const downBtn = screen.getByLabelText('Downvote, 3 downvotes');
    expect(downBtn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('uses outline icons when userVote is null', () => {
    const { toJSON } = render(<FeedActionBar {...defaultProps} userVote={null} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"heart-outline"');
    expect(json).toContain('"heart-broken-outline"');
  });

  it('renders 1K for counts around 1000', () => {
    render(<FeedActionBar {...defaultProps} commentCount={1000} />);
    expect(screen.getByText('1K')).toBeTruthy();
  });

  it('renders bookmark button with outline icon when not bookmarked', () => {
    render(<FeedActionBar {...defaultProps} isBookmarked={false} />);
    expect(screen.getByLabelText('Bookmark')).toBeTruthy();
    const json = JSON.stringify(
      render(<FeedActionBar {...defaultProps} isBookmarked={false} />).toJSON(),
    );
    expect(json).toContain('"bookmark-outline"');
  });

  it('renders bookmark button with filled icon when bookmarked', () => {
    const { toJSON } = render(<FeedActionBar {...defaultProps} isBookmarked={true} />);
    expect(screen.getByLabelText('Remove bookmark')).toBeTruthy();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"bookmark"');
    expect(json.toLowerCase()).toContain('#facc15');
  });

  it('calls onBookmark when bookmark button pressed', () => {
    const onBookmark = jest.fn();
    render(<FeedActionBar {...defaultProps} onBookmark={onBookmark} />);
    fireEvent.press(screen.getByLabelText('Bookmark'));
    expect(onBookmark).toHaveBeenCalled();
  });

  it('disables bookmark button when no callback', () => {
    render(<FeedActionBar {...defaultProps} />);
    const btn = screen.getByLabelText('Bookmark');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not disable bookmark button when callback is provided', () => {
    const onBookmark = jest.fn();
    render(<FeedActionBar {...defaultProps} onBookmark={onBookmark} />);
    const btn = screen.getByLabelText('Bookmark');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });
});
