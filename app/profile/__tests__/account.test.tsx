jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}));

const mockSignOut = jest.fn();
jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: () => ({ signOut: mockSignOut }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AccountScreen from '../account';

describe('AccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Account Details header', () => {
    render(<AccountScreen />);
    expect(screen.getByText('Account Details')).toBeTruthy();
  });

  it('renders the user email', () => {
    render(<AccountScreen />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders Log Out and Delete Account rows', () => {
    render(<AccountScreen />);
    expect(screen.getByText('Log Out')).toBeTruthy();
    expect(screen.getByText('Delete Account')).toBeTruthy();
  });

  it('pressing Log Out shows a confirmation alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('Log Out'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Log Out',
      'Are you sure you want to log out?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Log Out', style: 'destructive' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it('pressing the destructive Log Out button calls signOut and navigates', async () => {
    mockSignOut.mockResolvedValue(undefined);
    let capturedOnPress: (() => Promise<void>) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive');
      capturedOnPress = destructive?.onPress as () => Promise<void>;
    });

    render(<AccountScreen />);
    fireEvent.press(screen.getByText('Log Out'));

    await capturedOnPress?.();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('pressing Delete Account shows Coming Soon alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('Delete Account'));
    expect(alertSpy).toHaveBeenCalledWith('Coming Soon', 'This feature is not yet available.');
    alertSpy.mockRestore();
  });

  it('renders empty string when user email is null', () => {
    const mockModule = jest.requireMock('@/features/auth/providers/AuthProvider');
    const origImpl = mockModule.useAuth;
    mockModule.useAuth = () => ({ user: { id: 'user-1', email: null } });

    render(<AccountScreen />);
    // Email field should render empty (covers user?.email ?? '' null branch)
    expect(screen.queryByText('test@example.com')).toBeNull();

    mockModule.useAuth = origImpl;
  });
});
