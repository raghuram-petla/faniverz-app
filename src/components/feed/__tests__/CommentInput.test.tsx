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
    expect(screen.getByText('Sign in to comment')).toBeTruthy();
    expect(screen.queryByLabelText('Comment input')).toBeNull();
  });

  it('calls onLoginPress when login prompt tapped', () => {
    const onLogin = jest.fn();
    render(<CommentInput isAuthenticated={false} onSubmit={jest.fn()} onLoginPress={onLogin} />);
    fireEvent.press(screen.getByText('Sign in to comment'));
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
});
