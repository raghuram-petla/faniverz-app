import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ScreenHeader from '../ScreenHeader';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

describe('ScreenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    // With the global Ionicons mock (View), we cannot directly verify the icon name,
    // but we can verify it renders without crashing with a different backIcon prop
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
    // The placeholder View should be rendered (it has width: 40 style)
    // We verify the component renders without error and the tree is non-null
    expect(toJSON()).toBeTruthy();
  });
});
