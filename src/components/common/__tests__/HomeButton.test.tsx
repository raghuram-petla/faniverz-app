import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeButton } from '../HomeButton';

const mockDismissAll = jest.fn();
const mockState = { index: 1 };

jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissAll: mockDismissAll }),
  useNavigation: () => ({ getState: () => mockState }),
}));

describe('HomeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.index = 1;
  });

  it('renders nothing when stack index < 2', () => {
    mockState.index = 1;
    const { queryByTestId } = render(<HomeButton />);
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('renders nothing when stack index is 0', () => {
    mockState.index = 0;
    const { queryByTestId } = render(<HomeButton />);
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('renders when stack index >= 2', () => {
    mockState.index = 2;
    const { getByTestId } = render(<HomeButton />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('renders when stack index is 3', () => {
    mockState.index = 3;
    const { getByTestId } = render(<HomeButton />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('renders when forceShow is true regardless of depth', () => {
    mockState.index = 0;
    const { getByTestId } = render(<HomeButton forceShow />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('calls router.dismissAll() on press', () => {
    mockState.index = 2;
    const { getByTestId } = render(<HomeButton />);
    fireEvent.press(getByTestId('home-button'));
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label', () => {
    mockState.index = 2;
    const { getByLabelText } = render(<HomeButton />);
    expect(getByLabelText('Go to home')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    mockState.index = 2;
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(<HomeButton style={customStyle} />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('applies custom iconColor prop', () => {
    mockState.index = 2;
    const { getByTestId } = render(<HomeButton iconColor="#ffffff" />);
    expect(getByTestId('home-button')).toBeTruthy();
  });
});
