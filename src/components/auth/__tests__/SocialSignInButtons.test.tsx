import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SocialSignInButtons } from '../SocialSignInButtons';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

describe('SocialSignInButtons', () => {
  const defaultProps = {
    onGoogle: jest.fn(),
    onApple: jest.fn(),
    onPhone: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders Google button', () => {
    render(<SocialSignInButtons {...defaultProps} />);
    expect(screen.getByLabelText('Sign in with Google')).toBeTruthy();
  });

  it('renders Apple button when showApple is true', () => {
    render(<SocialSignInButtons {...defaultProps} showApple={true} />);
    expect(screen.getByLabelText('Sign in with Apple')).toBeTruthy();
  });

  it('hides Apple button when showApple is false', () => {
    render(<SocialSignInButtons {...defaultProps} showApple={false} />);
    expect(screen.queryByLabelText('Sign in with Apple')).toBeNull();
  });

  it('renders Phone button', () => {
    render(<SocialSignInButtons {...defaultProps} />);
    expect(screen.getByLabelText('Sign in with Phone')).toBeTruthy();
  });

  it('calls onGoogle on Google button press', () => {
    render(<SocialSignInButtons {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Sign in with Google'));
    expect(defaultProps.onGoogle).toHaveBeenCalled();
  });

  it('calls onApple on Apple button press', () => {
    render(<SocialSignInButtons {...defaultProps} showApple={true} />);
    fireEvent.press(screen.getByLabelText('Sign in with Apple'));
    expect(defaultProps.onApple).toHaveBeenCalled();
  });

  it('calls onPhone on Phone button press', () => {
    render(<SocialSignInButtons {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Sign in with Phone'));
    expect(defaultProps.onPhone).toHaveBeenCalled();
  });

  it('shows Apple button by default when showApple is not provided and onApple is set', () => {
    render(<SocialSignInButtons {...defaultProps} />);
    // showApple defaults to true
    expect(screen.getByLabelText('Sign in with Apple')).toBeTruthy();
  });

  it('hides Apple button when onApple is not provided even if showApple is true', () => {
    render(<SocialSignInButtons onGoogle={jest.fn()} onPhone={jest.fn()} showApple={true} />);
    expect(screen.queryByLabelText('Sign in with Apple')).toBeNull();
  });

  it('disables Google button when isGoogleLoading is true', () => {
    render(<SocialSignInButtons {...defaultProps} isGoogleLoading={true} />);
    // When loading, the text is replaced by ActivityIndicator
    expect(screen.queryByText('auth.google')).toBeNull();
  });

  it('disables Apple button when isAppleLoading is true', () => {
    render(<SocialSignInButtons {...defaultProps} isAppleLoading={true} />);
    expect(screen.queryByText('auth.apple')).toBeNull();
  });
});
