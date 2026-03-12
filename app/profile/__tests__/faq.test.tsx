jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FaqScreen from '../faq';

describe('FaqScreen', () => {
  it('renders FAQ header', () => {
    render(<FaqScreen />);
    expect(screen.getByText('FAQ')).toBeTruthy();
  });

  it('renders all FAQ questions', () => {
    render(<FaqScreen />);
    expect(
      screen.getByText('Why do I see a heart icon sometimes and a bookmark icon other times?'),
    ).toBeTruthy();
    expect(screen.getByText('What does following a movie do?')).toBeTruthy();
    expect(screen.getByText('What is the watchlist?')).toBeTruthy();
  });

  it('expands heart/bookmark FAQ answer when tapped', () => {
    render(<FaqScreen />);
    fireEvent.press(
      screen.getByText('Why do I see a heart icon sometimes and a bookmark icon other times?'),
    );
    expect(screen.getByText(/The heart icon appears for movies/)).toBeTruthy();
  });

  it('does not show answers by default', () => {
    render(<FaqScreen />);
    expect(screen.queryByText(/The heart icon appears for movies/)).toBeNull();
    expect(screen.queryByText(/Following a movie keeps you in the loop/)).toBeNull();
    expect(screen.queryByText(/your personal collection of movies/)).toBeNull();
  });
});
