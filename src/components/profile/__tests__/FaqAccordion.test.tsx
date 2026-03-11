import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FaqAccordion, FAQ_ITEMS } from '../FaqAccordion';

const mockTheme = new Proxy({}, { get: () => '#000' }) as any;

describe('FaqAccordion', () => {
  it('renders all FAQ questions', () => {
    render(<FaqAccordion items={FAQ_ITEMS} theme={mockTheme} />);
    expect(
      screen.getByText('Why do I see a heart icon sometimes and a bookmark icon other times?'),
    ).toBeTruthy();
    expect(screen.getByText('What does following a movie do?')).toBeTruthy();
    expect(screen.getByText('What is the watchlist?')).toBeTruthy();
  });

  it('does not show answers by default', () => {
    render(<FaqAccordion items={FAQ_ITEMS} theme={mockTheme} />);
    expect(screen.queryByText(/The heart icon appears for movies/)).toBeNull();
  });

  it('expands answer when question is tapped', () => {
    render(<FaqAccordion items={FAQ_ITEMS} theme={mockTheme} />);
    fireEvent.press(
      screen.getByText('Why do I see a heart icon sometimes and a bookmark icon other times?'),
    );
    expect(screen.getByText(/The heart icon appears for movies/)).toBeTruthy();
  });

  it('collapses answer when tapped again', () => {
    render(<FaqAccordion items={FAQ_ITEMS} theme={mockTheme} />);
    const question = screen.getByText(
      'Why do I see a heart icon sometimes and a bookmark icon other times?',
    );
    fireEvent.press(question);
    expect(screen.getByText(/The heart icon appears for movies/)).toBeTruthy();
    fireEvent.press(question);
    expect(screen.queryByText(/The heart icon appears for movies/)).toBeNull();
  });

  it('collapses previous answer when a different question is tapped', () => {
    render(<FaqAccordion items={FAQ_ITEMS} theme={mockTheme} />);
    fireEvent.press(
      screen.getByText('Why do I see a heart icon sometimes and a bookmark icon other times?'),
    );
    expect(screen.getByText(/The heart icon appears for movies/)).toBeTruthy();

    fireEvent.press(screen.getByText('What does following a movie do?'));
    expect(screen.queryByText(/The heart icon appears for movies/)).toBeNull();
    expect(screen.getByText(/Following a movie keeps you in the loop/)).toBeTruthy();
  });

  it('expands watchlist FAQ answer', () => {
    render(<FaqAccordion items={FAQ_ITEMS} theme={mockTheme} />);
    fireEvent.press(screen.getByText('What is the watchlist?'));
    expect(screen.getByText(/your personal collection of movies/)).toBeTruthy();
  });
});
