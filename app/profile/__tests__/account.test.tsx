jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
}));

const mockSignOut = jest.fn();
jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: () => ({ signOut: mockSignOut }),
}));

const mockDeleteMutate = jest.fn();
jest.mock('@/features/auth/hooks/useDeleteAccount', () => ({
  useDeleteAccount: () => ({ mutate: mockDeleteMutate }),
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

  it('pressing Delete Account shows a confirmation alert with warning text', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('Delete Account'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Account',
      'This will permanently delete your account and all associated data including watchlists, reviews, and follows. This cannot be undone.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it('calls deleteAccount.mutate when Delete is confirmed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('Delete Account'));

    const alertArgs = alertSpy.mock.calls[0];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    const deleteAction = buttons.find((b) => b.text === 'Delete');
    deleteAction?.onPress?.();

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
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
