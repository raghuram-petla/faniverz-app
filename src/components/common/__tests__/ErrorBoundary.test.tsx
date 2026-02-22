import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
  };
});

import ErrorBoundary from '../ErrorBoundary';

function GoodChild() {
  return <Text testID="good-child">Hello</Text>;
}

function BadChild(): React.ReactElement {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected throws
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('good-child')).toBeTruthy();
  });

  it('renders error fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('error-fallback')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Test error')).toBeTruthy();
  });

  it('retry resets error state', () => {
    const onReset = jest.fn();
    let shouldThrow = true;

    function MaybeThrow(): React.ReactElement {
      if (shouldThrow) {
        throw new Error('Conditional error');
      }
      return <Text testID="recovered">Recovered</Text>;
    }

    render(
      <ErrorBoundary onReset={onReset}>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-fallback')).toBeTruthy();

    // Fix the error condition
    shouldThrow = false;
    fireEvent.press(screen.getByTestId('error-retry'));

    expect(onReset).toHaveBeenCalled();
    expect(screen.getByTestId('recovered')).toBeTruthy();
  });
});
