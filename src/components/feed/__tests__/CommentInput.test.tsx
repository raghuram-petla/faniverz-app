jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { gray500: '#6b7280', white: '#fff' },
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

  it('calls onSubmit with trimmed text and clears input', () => {
    const onSubmit = jest.fn();
    render(<CommentInput isAuthenticated={true} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Comment input');
    fireEvent.changeText(input, '  Hello world  ');
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(onSubmit).toHaveBeenCalledWith('Hello world');
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

  it('disables send button when input is empty', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    const sendBtn = screen.getByLabelText('Send comment');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('clears input after successful submit', () => {
    const onSubmit = jest.fn();
    render(<CommentInput isAuthenticated={true} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Comment input');
    fireEvent.changeText(input, 'My comment');
    fireEvent.press(screen.getByLabelText('Send comment'));
    expect(onSubmit).toHaveBeenCalledWith('My comment');
    // After submit, input value resets
    expect(input.props.value).toBe('');
  });

  it('renders with default bottomInset of 0', () => {
    const { toJSON } = render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom bottomInset', () => {
    const { toJSON } = render(
      <CommentInput isAuthenticated={true} onSubmit={jest.fn()} bottomInset={34} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('input supports multiline', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    const input = screen.getByLabelText('Comment input');
    expect(input.props.multiline).toBe(true);
  });

  it('input has maxLength of 500', () => {
    render(<CommentInput isAuthenticated={true} onSubmit={jest.fn()} />);
    const input = screen.getByLabelText('Comment input');
    expect(input.props.maxLength).toBe(500);
  });
});
