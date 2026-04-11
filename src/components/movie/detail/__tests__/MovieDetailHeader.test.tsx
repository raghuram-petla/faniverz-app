import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MovieDetailHeader } from '../MovieDetailHeader';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockDispatch = jest.fn();
const mockState = { index: 0 };

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    getState: () => mockState,
    getParent: () => undefined,
    dispatch: mockDispatch,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  StackActions: { pop: (n: number) => ({ type: 'POP', payload: { count: n } }) },
}));

const baseProps = {
  insetsTop: 44,
  actionType: 'follow' as const,
  isActionActive: false,
  onBack: jest.fn(),
  onShare: jest.fn(),
  onToggleAction: jest.fn(),
  movieTitle: 'Test Movie',
  navBarBgStyle: { opacity: 0 },
};

describe('MovieDetailHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.index = 0;
  });

  it('renders back button with accessibility label "Go back"', () => {
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('renders share button', () => {
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText(/share/i)).toBeTruthy();
  });

  it('always shows home button (forceShow)', () => {
    mockState.index = 0;
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText(/home/i)).toBeTruthy();
  });

  it('calls onBack when back button pressed', () => {
    const onBack = jest.fn();
    render(<MovieDetailHeader {...baseProps} onBack={onBack} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('renders follow button when actionType is follow', () => {
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText('Follow Test Movie')).toBeTruthy();
  });

  it('renders following state when follow is active', () => {
    render(<MovieDetailHeader {...baseProps} isActionActive />);
    expect(screen.getByLabelText(/Following Test Movie/)).toBeTruthy();
  });

  it('renders save button when actionType is watchlist', () => {
    render(<MovieDetailHeader {...baseProps} actionType="watchlist" />);
    expect(screen.getByLabelText('Save Test Movie')).toBeTruthy();
  });

  it('renders saved state when watchlist is active', () => {
    render(<MovieDetailHeader {...baseProps} actionType="watchlist" isActionActive />);
    expect(screen.getByLabelText(/saved, tap to remove/i)).toBeTruthy();
  });

  it('calls onToggleAction when action button pressed', () => {
    const onToggleAction = jest.fn();
    render(<MovieDetailHeader {...baseProps} onToggleAction={onToggleAction} />);
    fireEvent.press(screen.getByLabelText('Follow Test Movie'));
    expect(onToggleAction).toHaveBeenCalled();
  });

  it('falls back to "movie" in follow label when movieTitle is undefined', () => {
    const props = { ...baseProps, movieTitle: undefined };
    render(<MovieDetailHeader {...props} />);
    expect(screen.getByLabelText('Follow movie')).toBeTruthy();
  });

  it('falls back to "movie" in following label when movieTitle is undefined', () => {
    const props = { ...baseProps, movieTitle: undefined, isActionActive: true };
    render(<MovieDetailHeader {...props} />);
    expect(screen.getByLabelText('Following movie, tap to unfollow')).toBeTruthy();
  });

  it('falls back to "movie" in save label when movieTitle is undefined', () => {
    const props = { ...baseProps, movieTitle: undefined, actionType: 'watchlist' as const };
    render(<MovieDetailHeader {...props} />);
    expect(screen.getByLabelText('Save movie')).toBeTruthy();
  });

  it('falls back to "movie" in saved label when movieTitle is undefined', () => {
    const props = {
      ...baseProps,
      movieTitle: undefined,
      actionType: 'watchlist' as const,
      isActionActive: true,
    };
    render(<MovieDetailHeader {...props} />);
    expect(screen.getByLabelText('movie saved, tap to remove')).toBeTruthy();
  });
});
