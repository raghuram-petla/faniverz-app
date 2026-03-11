import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorFallback } from '../ErrorFallback';

describe('ErrorFallback', () => {
  const onRetry = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders error title', () => {
    render(<ErrorFallback error={null} onRetry={onRetry} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('renders Try Again button', () => {
    render(<ErrorFallback error={null} onRetry={onRetry} />);
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  it('renders error message when error is provided', () => {
    render(<ErrorFallback error={new Error('Network failed')} onRetry={onRetry} />);
    expect(screen.getByText('Network failed')).toBeTruthy();
  });

  it('does not render error message when error is null', () => {
    render(<ErrorFallback error={null} onRetry={onRetry} />);
    expect(screen.queryByText('Network failed')).toBeNull();
  });

  it('calls onRetry when Try Again is pressed', () => {
    render(<ErrorFallback error={null} onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
  });
});
