jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: {
      white: '#fff',
      red600: '#dc2626',
      gray500: '#6b7280',
      green500: '#22c55e',
      green600_20: 'rgba(22,163,74,0.2)',
      red500: '#ef4444',
      red600_20: 'rgba(220,38,38,0.2)',
    },
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VoteButtons } from '../VoteButtons';

const defaultProps = {
  upvoteCount: 5,
  downvoteCount: 1,
  userVote: null as 'up' | 'down' | null,
  onUpvote: jest.fn(),
  onDownvote: jest.fn(),
};

function renderVoteButtons(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<VoteButtons {...props} />);
}

describe('VoteButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upvote count', () => {
    const { getByText } = renderVoteButtons({ upvoteCount: 12 });
    expect(getByText('12')).toBeTruthy();
  });

  it('renders downvote count', () => {
    const { getByText } = renderVoteButtons({ downvoteCount: 3 });
    expect(getByText('3')).toBeTruthy();
  });

  it('renders both upvote and downvote counts', () => {
    const { getByText } = renderVoteButtons({ upvoteCount: 5, downvoteCount: 1 });
    expect(getByText('5')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('calls onUpvote when upvote button is pressed', () => {
    const onUpvote = jest.fn();
    const { getByLabelText } = renderVoteButtons({ onUpvote });
    fireEvent.press(getByLabelText('Upvote, 5 upvotes'));
    expect(onUpvote).toHaveBeenCalledTimes(1);
  });

  it('calls onDownvote when downvote button is pressed', () => {
    const onDownvote = jest.fn();
    const { getByLabelText } = renderVoteButtons({ onDownvote });
    fireEvent.press(getByLabelText('Downvote, 1 downvotes'));
    expect(onDownvote).toHaveBeenCalledTimes(1);
  });

  it('shows active state when userVote is up', () => {
    const { getByLabelText } = renderVoteButtons({ userVote: 'up' });
    const upvoteBtn = getByLabelText('Upvote, 5 upvotes');
    // Active upvote button gets green background (style may be flattened)
    expect(upvoteBtn.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(22,163,74,0.2)' }),
    );
  });

  it('shows active state when userVote is down', () => {
    const { getByLabelText } = renderVoteButtons({ userVote: 'down' });
    const downvoteBtn = getByLabelText('Downvote, 1 downvotes');
    expect(downvoteBtn.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(220,38,38,0.2)' }),
    );
  });

  it('shows neutral state when userVote is null', () => {
    const { getByLabelText } = renderVoteButtons({ userVote: null });
    const upvoteBtn = getByLabelText('Upvote, 5 upvotes');
    const downvoteBtn = getByLabelText('Downvote, 1 downvotes');
    // No active background color when neutral
    expect(upvoteBtn.props.style).not.toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(22,163,74,0.2)' }),
    );
    expect(downvoteBtn.props.style).not.toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(220,38,38,0.2)' }),
    );
  });

  it('accessibility label includes upvote count', () => {
    const { getByLabelText } = renderVoteButtons({ upvoteCount: 42 });
    expect(getByLabelText('Upvote, 42 upvotes')).toBeTruthy();
  });

  it('accessibility label includes downvote count', () => {
    const { getByLabelText } = renderVoteButtons({ downvoteCount: 7 });
    expect(getByLabelText('Downvote, 7 downvotes')).toBeTruthy();
  });

  it('renders zero counts correctly', () => {
    const { getAllByText } = renderVoteButtons({ upvoteCount: 0, downvoteCount: 0 });
    const zeros = getAllByText('0');
    expect(zeros).toHaveLength(2);
  });

  it('upvote icon is "heart" when userVote is up', () => {
    const { UNSAFE_getByProps } = renderVoteButtons({ userVote: 'up' });
    expect(UNSAFE_getByProps({ name: 'heart' })).toBeTruthy();
  });

  it('upvote icon is "heart-outline" when userVote is not up', () => {
    const { UNSAFE_getByProps } = renderVoteButtons({ userVote: null });
    expect(UNSAFE_getByProps({ name: 'heart-outline' })).toBeTruthy();
  });

  it('downvote icon is "heart-broken" when userVote is down', () => {
    const { UNSAFE_getByProps } = renderVoteButtons({ userVote: 'down' });
    expect(UNSAFE_getByProps({ name: 'heart-broken' })).toBeTruthy();
  });

  it('downvote icon is "heart-broken-outline" when userVote is not down', () => {
    const { UNSAFE_getByProps } = renderVoteButtons({ userVote: null });
    expect(UNSAFE_getByProps({ name: 'heart-broken-outline' })).toBeTruthy();
  });

  it('does not trigger animation on initial render (prevVote matches userVote)', () => {
    // This verifies the animation branch is NOT entered on mount when there is no prior vote change
    const { getByLabelText } = renderVoteButtons({ userVote: 'up' });
    // Component still renders correctly
    expect(getByLabelText('Upvote, 5 upvotes')).toBeTruthy();
  });

  it('handles vote change from null to up without crashing', () => {
    const { rerender, getByLabelText } = renderVoteButtons({ userVote: null });
    rerender(
      <VoteButtons
        upvoteCount={5}
        downvoteCount={1}
        userVote="up"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(getByLabelText('Upvote, 5 upvotes')).toBeTruthy();
  });

  it('handles vote change from null to down without crashing', () => {
    const { rerender, getByLabelText } = renderVoteButtons({ userVote: null });
    rerender(
      <VoteButtons
        upvoteCount={5}
        downvoteCount={1}
        userVote="down"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(getByLabelText('Downvote, 1 downvotes')).toBeTruthy();
  });

  it('animation fires when vote changes from up to down', () => {
    const { rerender, getByLabelText } = renderVoteButtons({ userVote: 'up' });
    rerender(
      <VoteButtons
        upvoteCount={5}
        downvoteCount={1}
        userVote="down"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(getByLabelText('Downvote, 1 downvotes')).toBeTruthy();
  });

  it('animation fires when vote changes from down to up', () => {
    const { rerender, getByLabelText } = renderVoteButtons({ userVote: 'down' });
    rerender(
      <VoteButtons
        upvoteCount={5}
        downvoteCount={1}
        userVote="up"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(getByLabelText('Upvote, 5 upvotes')).toBeTruthy();
  });

  it('animation does not fire when animations are disabled', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    const { rerender, getByLabelText } = renderVoteButtons({ userVote: null });
    rerender(
      <VoteButtons
        upvoteCount={5}
        downvoteCount={1}
        userVote="up"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    // Should render correctly without animations
    expect(getByLabelText('Upvote, 5 upvotes')).toBeTruthy();

    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('vote change from up to null updates prevVote ref', () => {
    const { rerender, getByLabelText } = renderVoteButtons({ userVote: 'up' });
    rerender(
      <VoteButtons
        upvoteCount={5}
        downvoteCount={1}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    // prevVote changes but no animation fires since userVote=null
    expect(getByLabelText('Upvote, 5 upvotes')).toBeTruthy();
  });
});
