import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

import EmptyState, {
  EMPTY_WATCHLIST,
  EMPTY_REVIEWS,
  EMPTY_SEARCH,
  EMPTY_CALENDAR_DAY,
} from '../EmptyState';

describe('EmptyState', () => {
  it('renders title and subtitle', () => {
    render(<EmptyState title="No items" subtitle="Nothing here yet" />);
    expect(screen.getByTestId('empty-state-title')).toHaveTextContent('No items');
    expect(screen.getByTestId('empty-state-subtitle')).toHaveTextContent('Nothing here yet');
  });

  it('renders icon when provided', () => {
    render(<EmptyState icon="📋" title="Empty" />);
    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });

  it('renders CTA button when provided', () => {
    const onPress = jest.fn();
    render(<EmptyState title="Empty" ctaLabel="Add Item" onCtaPress={onPress} />);
    fireEvent.press(screen.getByTestId('empty-state-cta'));
    expect(onPress).toHaveBeenCalled();
  });

  it('hides CTA when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByTestId('empty-state-cta')).toBeNull();
  });

  it('hides subtitle when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByTestId('empty-state-subtitle')).toBeNull();
  });

  it('pre-configured states have required fields', () => {
    expect(EMPTY_WATCHLIST.title).toBeTruthy();
    expect(EMPTY_WATCHLIST.subtitle).toBeTruthy();
    expect(EMPTY_REVIEWS.title).toBeTruthy();
    expect(EMPTY_REVIEWS.ctaLabel).toBeTruthy();
    expect(EMPTY_SEARCH.title).toBeTruthy();
    expect(EMPTY_CALENDAR_DAY.title).toBeTruthy();
  });
});
