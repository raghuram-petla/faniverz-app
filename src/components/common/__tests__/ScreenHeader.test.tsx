import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ScreenHeader from '../ScreenHeader';

const mockBack = jest.fn();
const mockDismissAll = jest.fn();

// Mutable state returned by useNavigation().getState()
const mockState = { index: 1 };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, dismissAll: mockDismissAll }),
  useNavigation: () => ({ getState: () => mockState }),
}));

describe('ScreenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: 1 screen pushed (index 1 = tabs at 0, movie at 1)
    mockState.index = 1;
  });

  it('renders title text', () => {
    const { getByText } = render(<ScreenHeader title="My Reviews" />);
    expect(getByText('My Reviews')).toBeTruthy();
  });

  it('back button is present with "Go back" accessibility label', () => {
    const { getByLabelText } = render(<ScreenHeader title="Test" />);
    expect(getByLabelText('Go back')).toBeTruthy();
  });

  it('back button calls router.back() when pressed', () => {
    const { getByLabelText } = render(<ScreenHeader title="Test" />);
    fireEvent.press(getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('custom onBack is called when provided', () => {
    const customBack = jest.fn();
    const { getByLabelText } = render(<ScreenHeader title="Test" onBack={customBack} />);
    fireEvent.press(getByLabelText('Go back'));
    expect(customBack).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('custom backIcon renders correctly', () => {
    const { getByLabelText } = render(<ScreenHeader title="Test" backIcon="arrow-back" />);
    expect(getByLabelText('Go back')).toBeTruthy();
  });

  it('titleBadge renders when provided', () => {
    const { getByText } = render(
      <ScreenHeader title="Notifications" titleBadge={<Text>5</Text>} />,
    );
    expect(getByText('5')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
  });

  it('rightAction renders when provided', () => {
    const { getByText } = render(<ScreenHeader title="Test" rightAction={<Text>Action</Text>} />);
    expect(getByText('Action')).toBeTruthy();
  });

  it('placeholder shown when no rightAction', () => {
    const { toJSON } = render(<ScreenHeader title="Test" />);
    expect(toJSON()).toBeTruthy();
  });

  it('does not show home button when stack index < 2', () => {
    mockState.index = 1;
    const { queryByTestId } = render(<ScreenHeader title="Test" />);
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('shows home button when stack index >= 2', () => {
    mockState.index = 2;
    const { getByTestId } = render(<ScreenHeader title="Test" />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('home button calls router.dismissAll()', () => {
    mockState.index = 3;
    const { getByTestId } = render(<ScreenHeader title="Test" />);
    fireEvent.press(getByTestId('home-button'));
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
  });
});
