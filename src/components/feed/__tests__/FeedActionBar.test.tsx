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
    expect(screen.getByText('1.5K')).toBeTruthy();
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

  it('shows filled icon and green color when userVote is up', () => {
    const { toJSON } = render(<FeedActionBar {...defaultProps} userVote="up" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"arrow-up"');
    expect(json).toContain('#22c55e');
  });

  it('shows filled icon and red color when userVote is down', () => {
    const { toJSON } = render(<FeedActionBar {...defaultProps} userVote="down" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"arrow-down"');
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
});
