import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MovieDetailHeader } from '../MovieDetailHeader';

jest.mock('../../[id].styles', () => ({
  styles: new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const baseProps = {
  insetsTop: 44,
  navIndex: 0,
  isWatchlisted: false,
  onBack: jest.fn(),
  onHome: jest.fn(),
  onShare: jest.fn(),
  onToggleWatchlist: jest.fn(),
};

describe('MovieDetailHeader', () => {
  it('renders back button with accessibility label "Go back"', () => {
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('renders share button', () => {
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText(/share/i)).toBeTruthy();
  });

  it('renders watchlist button', () => {
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText(/watchlist/i)).toBeTruthy();
  });

  it('shows home button when navIndex >= 2', () => {
    render(<MovieDetailHeader {...baseProps} navIndex={2} />);
    expect(screen.getByLabelText(/home/i)).toBeTruthy();
  });

  it('does not show home button when navIndex < 2', () => {
    render(<MovieDetailHeader {...baseProps} navIndex={1} />);
    expect(screen.queryByLabelText(/home/i)).toBeNull();
  });

  it('calls onBack when back button pressed', () => {
    const onBack = jest.fn();
    render(<MovieDetailHeader {...baseProps} onBack={onBack} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onToggleWatchlist when watchlist button pressed', () => {
    const onToggleWatchlist = jest.fn();
    render(<MovieDetailHeader {...baseProps} onToggleWatchlist={onToggleWatchlist} />);
    fireEvent.press(screen.getByLabelText(/watchlist/i));
    expect(onToggleWatchlist).toHaveBeenCalled();
  });

  it('shows correct accessibility label for watchlisted state', () => {
    render(<MovieDetailHeader {...baseProps} isWatchlisted={true} />);
    expect(screen.getByLabelText(/remove.*watchlist/i)).toBeTruthy();
  });
});
