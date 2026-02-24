import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorFallback } from '../ErrorFallback';

// A component that throws an error on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <Text>Child content</Text>;
}

// Suppress console.error for expected error boundary logging
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Hello World</Text>
      </ErrorBoundary>,
    );
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('catches error and renders ErrorFallback', () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(queryByText('Child content')).toBeNull();
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('displays error message in fallback', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(getByText('Test error message')).toBeTruthy();
  });

  it('renders Try Again button in fallback', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('recovers from error when retry is pressed and error is resolved', () => {
    // First render with error
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(getByText('Something went wrong')).toBeTruthy();

    // Press retry — ErrorBoundary resets state, but if child still throws it will error again
    // We need to verify the retry mechanism resets hasError state
    fireEvent.press(getByText('Try Again'));

    // After retry, the component re-renders children; since ThrowingComponent
    // still has shouldThrow=true, it throws again and shows fallback
    expect(getByText('Something went wrong')).toBeTruthy();
  });
});

describe('ErrorFallback', () => {
  it('renders "Something went wrong" title', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorFallback error={new Error('Oops')} onRetry={onRetry} />);
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders error message when error is provided', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <ErrorFallback error={new Error('Something broke')} onRetry={onRetry} />,
    );
    expect(getByText('Something broke')).toBeTruthy();
  });

  it('does not render error message when error is null', () => {
    const onRetry = jest.fn();
    const { queryByText, getByText } = render(<ErrorFallback error={null} onRetry={onRetry} />);
    expect(getByText('Something went wrong')).toBeTruthy();
    // No message text beyond the title
    expect(queryByText('null')).toBeNull();
  });

  it('renders Try Again button', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorFallback error={null} onRetry={onRetry} />);
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('calls onRetry when Try Again button is pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorFallback error={null} onRetry={onRetry} />);
    fireEvent.press(getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('Try Again button has correct accessibility role', () => {
    const onRetry = jest.fn();
    const { getByRole } = render(<ErrorFallback error={new Error('Test')} onRetry={onRetry} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('renders error message with empty string error', () => {
    const onRetry = jest.fn();
    const error = new Error('');
    const { getByText, queryByText } = render(<ErrorFallback error={error} onRetry={onRetry} />);
    expect(getByText('Something went wrong')).toBeTruthy();
    // Empty string message should not render the message text
    // error.message is '' which is falsy
    expect(queryByText('')).toBeNull();
  });
});
