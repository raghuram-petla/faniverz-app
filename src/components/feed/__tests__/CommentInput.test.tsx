jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { gray500: '#6b7280', white: '#fff', red600: '#dc2626' },
  }),
}));

jest.mock('@/styles/postDetail.styles', () => ({
  createPostDetailStyles: () => new Proxy({}, { get: () => ({}) }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CommentInput } from '../CommentInput';

describe('CommentInput', () => {
  it('shows text input when authenticated', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Comment input')).toBeTruthy();
    expect(screen.getByLabelText('Send comment')).toBeTruthy();
  });

  it('shows login prompt when not authenticated', () => {
    render(<CommentInput isAuthenticated={false} onSubmit={jest.fn()} />);
    expect(screen.getByText('auth.signInToComment')).toBeTruthy();
    expect(screen.queryByLabelText('Comment input')).toBeNull();
  });

  it('calls onLoginPress when login prompt tapped', () => {
    const onLogin = jest.fn();
    render(<CommentInput isAuthenticated={false} onSubmit={jest.fn()} onLoginPress={onLogin} />);
    fireEvent.press(screen.getByText('auth.signInToComment'));
    expect(onLogin).toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed text and no parentCommentId for top-level', () => {
    const onSubmit = jest.fn();
    render(<CommentInput isAuthenticated={true} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Comment input');
    fireEvent.changeText(input, '  Hello world  ');
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(onSubmit).toHaveBeenCalledWith('Hello world', undefined);
  });

  it('does not submit empty text', () => {
    const onSubmit = jest.fn();
    render(<CommentInput isAuthenticated={true} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit whitespace-only text', () => {
    const onSubmit = jest.fn();
    render(<CommentInput isAuthenticated={true} onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByLabelText('Comment input'), '   ');
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears input after successful submit', () => {
    const onSubmit = jest.fn();
    render(<CommentInput isAuthenticated={true} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Comment input');
    fireEvent.changeText(input, 'My comment');
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(input.props.value).toBe('');
  });

  it('shows reply indicator when replyTarget is set', () => {
    const replyTarget = { commentId: 'c1', parentCommentId: 'c1', displayName: 'Alice' };
    render(
      <CommentInput
        isAuthenticated
        onSubmit={jest.fn()}
        replyTarget={replyTarget}
        onCancelReply={jest.fn()}
      />,
    );
    expect(screen.getByText('feed.replyingTo')).toBeTruthy();
    expect(screen.getByLabelText('Cancel reply')).toBeTruthy();
  });

  it('calls onCancelReply when cancel button pressed', () => {
    const onCancelReply = jest.fn();
    const replyTarget = { commentId: 'c1', parentCommentId: 'c1', displayName: 'Alice' };
    render(
      <CommentInput
        isAuthenticated
        onSubmit={jest.fn()}
        replyTarget={replyTarget}
        onCancelReply={onCancelReply}
      />,
    );
    fireEvent.press(screen.getByLabelText('Cancel reply'));
    expect(onCancelReply).toHaveBeenCalled();
  });

  it('prepends @mention and passes parentCommentId when replying', () => {
    const onSubmit = jest.fn();
    const replyTarget = { commentId: 'c1', parentCommentId: 'c1', displayName: 'Alice' };
    render(
      <CommentInput
        isAuthenticated
        onSubmit={onSubmit}
        replyTarget={replyTarget}
        onCancelReply={jest.fn()}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Comment input'), 'great point');
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(onSubmit).toHaveBeenCalledWith('@[Alice] great point', 'c1');
  });

  it('does not show reply indicator when replyTarget is null', () => {
    render(<CommentInput isAuthenticated onSubmit={jest.fn()} replyTarget={null} />);
    expect(screen.queryByLabelText('Cancel reply')).toBeNull();
  });

  it('disables send button when input is empty', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    const sendBtn = screen.getByLabelText('Send comment');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('input supports multiline and maxLength 500 for top-level', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    const input = screen.getByLabelText('Comment input');
    expect(input.props.multiline).toBe(true);
    expect(input.props.maxLength).toBe(500);
  });

  it('reduces maxLength when replying to reserve space for @mention prefix', () => {
    const replyTarget = { commentId: 'c1', parentCommentId: 'c1', displayName: 'Alice' };
    render(
      <CommentInput
        isAuthenticated
        onSubmit={jest.fn()}
        replyTarget={replyTarget}
        onCancelReply={jest.fn()}
      />,
    );
    const input = screen.getByLabelText('Comment input');
    // @[Alice] + space = 9 chars, so maxLength = 500 - 9 = 491
    expect(input.props.maxLength).toBe(500 - '@[Alice] '.length);
  });

  it('renders with custom bottomInset', () => {
    const { toJSON } = render(
      <CommentInput isAuthenticated={true} onSubmit={jest.fn()} bottomInset={34} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('cancels reply after submitting reply', () => {
    const onSubmit = jest.fn();
    const onCancelReply = jest.fn();
    const replyTarget = { commentId: 'c1', parentCommentId: 'c1', displayName: 'Alice' };
    render(
      <CommentInput
        isAuthenticated
        onSubmit={onSubmit}
        replyTarget={replyTarget}
        onCancelReply={onCancelReply}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Comment input'), 'reply text');
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(onCancelReply).toHaveBeenCalled();
  });

  // --- Emoji quick-picks ---

  it('renders emoji quick-pick buttons when authenticated', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Add ❤️')).toBeTruthy();
    expect(screen.getByLabelText('Add 😂')).toBeTruthy();
  });

  it('does not render emoji row when not authenticated', () => {
    render(<CommentInput isAuthenticated={false} onSubmit={jest.fn()} />);
    expect(screen.queryByLabelText('Add ❤️')).toBeNull();
  });

  it('appends emoji to input text when emoji button pressed', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    const input = screen.getByLabelText('Comment input');
    fireEvent.changeText(input, 'nice ');
    fireEvent.press(screen.getByLabelText('Add 🔥'));
    expect(input.props.value).toBe('nice 🔥');
  });

  // --- User avatar ---

  it('renders placeholder icon when avatarUrl is not provided', () => {
    const { toJSON } = render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders avatar image when avatarUrl is provided', () => {
    const { toJSON } = render(
      <CommentInput
        isAuthenticated={true}
        onSubmit={jest.fn()}
        avatarUrl="https://example.com/avatar.jpg"
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('does not append emoji when it would exceed maxBodyLength', () => {
    // @edge: covers the false branch of line 76: text.length + emoji.length > maxBodyLength
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    const input = screen.getByLabelText('Comment input');
    // Fill input to exactly 500 chars (maxBodyLength) so ANY emoji addition would exceed the limit
    const fullText = 'a'.repeat(500);
    fireEvent.changeText(input, fullText);
    // Press ❤️ emoji (2 chars) — 500 + 2 > 500, should be rejected
    fireEvent.press(screen.getByLabelText('Add ❤️'));
    // Text should remain unchanged — emoji was rejected
    expect(input.props.value).toBe(fullText);
  });
});
