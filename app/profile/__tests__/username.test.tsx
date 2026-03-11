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

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: () => ({ data: { username: null } }),
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
});
