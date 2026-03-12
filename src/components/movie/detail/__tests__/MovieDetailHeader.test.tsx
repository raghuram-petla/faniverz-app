import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MovieDetailHeader } from '../MovieDetailHeader';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockDismissAll = jest.fn();
const mockState = { index: 0 };

jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissAll: mockDismissAll }),
  useNavigation: () => ({ getState: () => mockState }),
}));

const baseProps = {
  insetsTop: 44,
  actionType: 'follow' as const,
  isActionActive: false,
  onBack: jest.fn(),
  onShare: jest.fn(),
  onToggleAction: jest.fn(),
  movieTitle: 'Test Movie',
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

  it('shows home button when stack depth >= 2', () => {
    mockState.index = 2;
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.getByLabelText(/home/i)).toBeTruthy();
  });

  it('does not show home button when stack depth < 2', () => {
    mockState.index = 1;
    render(<MovieDetailHeader {...baseProps} />);
    expect(screen.queryByLabelText(/home/i)).toBeNull();
  });

  it('home button dismisses all screens on press', () => {
    mockState.index = 2;
    render(<MovieDetailHeader {...baseProps} />);
    fireEvent.press(screen.getByTestId('home-button'));
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
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
});
