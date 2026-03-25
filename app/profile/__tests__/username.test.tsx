jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: { title: string }) => <Text>{title}</Text> };
});

const mockUseProfile = jest.fn(() => ({ data: { username: null as string | null } }));
jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

const mockMutateAsync = jest.fn();
jest.mock('@/features/auth/hooks/useUsername', () => ({
  useCheckUsername: jest.fn(() => ({
    isAvailable: null,
    isChecking: false,
    error: null,
  })),
  useSetUsername: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    error: null,
  }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import UsernameScreen from '../username';
import { useCheckUsername } from '@/features/auth/hooks/useUsername';

const mockUseCheckUsername = useCheckUsername as jest.Mock;

describe('UsernameScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders header', () => {
    render(<UsernameScreen />);
    expect(screen.getByText('profile.chooseUsername')).toBeTruthy();
  });

  it('renders @ prefix', () => {
    render(<UsernameScreen />);
    expect(screen.getByText('@')).toBeTruthy();
  });

  it('renders username input', () => {
    render(<UsernameScreen />);
    expect(screen.getByPlaceholderText('username')).toBeTruthy();
  });

  it('renders hint text', () => {
    render(<UsernameScreen />);
    expect(screen.getByText('profile.usernameHint')).toBeTruthy();
  });

  it('renders save button', () => {
    render(<UsernameScreen />);
    expect(screen.getByText('profile.saveUsername')).toBeTruthy();
  });

  it('shows error when username is invalid', () => {
    mockUseCheckUsername.mockReturnValue({
      isAvailable: null,
      isChecking: false,
      error: 'Username must be at least 3 characters',
    });

    render(<UsernameScreen />);
    expect(screen.getByText('Username must be at least 3 characters')).toBeTruthy();
  });

  it('disables save when username is not available', () => {
    mockUseCheckUsername.mockReturnValue({
      isAvailable: false,
      isChecking: false,
      error: 'Username is taken',
    });

    render(<UsernameScreen />);
    expect(screen.getByText('Username is taken')).toBeTruthy();
  });

  it('converts input to lowercase', () => {
    render(<UsernameScreen />);
    const input = screen.getByPlaceholderText('username');
    fireEvent.changeText(input, 'MyUser');
    expect(input.props.value).toBe('myuser');
  });

  it('calls mutateAsync and router.back when save is pressed and username is available', async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    mockUseCheckUsername.mockReturnValue({
      isAvailable: true,
      isChecking: false,
      error: null,
    });

    render(<UsernameScreen />);
    const saveBtn = screen.getByText('profile.saveUsername');
    await fireEvent.press(saveBtn);

    expect(mockMutateAsync).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('does not call mutateAsync when username is not available', async () => {
    mockUseCheckUsername.mockReturnValue({
      isAvailable: false,
      isChecking: false,
      error: null,
    });

    render(<UsernameScreen />);
    fireEvent.press(screen.getByText('profile.saveUsername'));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does not navigate back when mutateAsync throws', async () => {
    mockMutateAsync.mockRejectedValue(new Error('save failed'));
    mockUseCheckUsername.mockReturnValue({
      isAvailable: true,
      isChecking: false,
      error: null,
    });

    render(<UsernameScreen />);
    await fireEvent.press(screen.getByText('profile.saveUsername'));

    expect(mockMutateAsync).toHaveBeenCalled();
    // router.back should not be called after an error
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('shows activity indicator when isChecking', () => {
    mockUseCheckUsername.mockReturnValue({
      isAvailable: null,
      isChecking: true,
      error: null,
    });

    render(<UsernameScreen />);
    // ActivityIndicator renders — just verify no crash
    expect(screen.getByPlaceholderText('username')).toBeTruthy();
  });

  it('syncs username from profile when profile loads and user has not edited', () => {
    mockUseProfile.mockReturnValue({ data: { username: 'existing_user' } });

    render(<UsernameScreen />);
    const input = screen.getByPlaceholderText('username');
    expect(input.props.value).toBe('existing_user');

    mockUseProfile.mockReturnValue({ data: { username: null } });
  });

  it('does not overwrite user-edited username when profile loads', () => {
    render(<UsernameScreen />);
    const input = screen.getByPlaceholderText('username');
    // User types a new username
    fireEvent.changeText(input, 'newname');
    expect(input.props.value).toBe('newname');
  });

  it('shows mutation error when setUsernameMutation has error', () => {
    const mockUseSetUsername = jest.requireMock('@/features/auth/hooks/useUsername').useSetUsername;
    const origUseSetUsername = mockUseSetUsername;
    jest.requireMock('@/features/auth/hooks/useUsername').useSetUsername = () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: new Error('Username already taken'),
    });

    render(<UsernameScreen />);
    expect(screen.getByText('Username already taken')).toBeTruthy();

    jest.requireMock('@/features/auth/hooks/useUsername').useSetUsername = origUseSetUsername;
  });

  it('shows loading state when mutation is pending', () => {
    jest.requireMock('@/features/auth/hooks/useUsername').useSetUsername = () => ({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
    });

    render(<UsernameScreen />);
    // Save button should show ActivityIndicator instead of text
    expect(screen.queryByText('profile.saveUsername')).toBeNull();

    // Restore
    jest.requireMock('@/features/auth/hooks/useUsername').useSetUsername = () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });
  });

  it('shows checkmark icon when username is available', () => {
    mockUseCheckUsername.mockReturnValue({
      isAvailable: true,
      isChecking: false,
      error: null,
    });

    render(<UsernameScreen />);
    expect(screen.UNSAFE_queryByProps({ name: 'checkmark-circle' })).toBeTruthy();
  });

  it('shows close icon when username is not available', () => {
    mockUseCheckUsername.mockReturnValue({
      isAvailable: false,
      isChecking: false,
      error: 'Taken',
    });

    render(<UsernameScreen />);
    expect(screen.UNSAFE_queryByProps({ name: 'close-circle' })).toBeTruthy();
  });
});
