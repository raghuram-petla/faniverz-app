jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
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
    expect(screen.getByText('profile.accountDetails')).toBeTruthy();
  });

  it('renders the user email', () => {
    render(<AccountScreen />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(screen.getByText('profile.email')).toBeTruthy();
  });

  it('renders Log Out and Delete Account rows', () => {
    render(<AccountScreen />);
    expect(screen.getByText('profile.logOut')).toBeTruthy();
    expect(screen.getByText('profile.deleteAccount')).toBeTruthy();
  });

  it('pressing Log Out shows a confirmation alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('profile.logOut'));
    expect(alertSpy).toHaveBeenCalledWith(
      'profile.logOut',
      'profile.logOutConfirm',
      expect.arrayContaining([
        expect.objectContaining({ text: 'common.cancel' }),
        expect.objectContaining({ text: 'profile.logOut', style: 'destructive' }),
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
    fireEvent.press(screen.getByText('profile.logOut'));

    await capturedOnPress?.();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('pressing Delete Account shows a confirmation alert with warning text', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('profile.deleteAccount'));
    expect(alertSpy).toHaveBeenCalledWith(
      'profile.deleteAccount',
      'profile.deleteAccountConfirm',
      expect.arrayContaining([
        expect.objectContaining({ text: 'common.cancel' }),
        expect.objectContaining({ text: 'common.delete', style: 'destructive' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it('calls deleteAccount.mutate when Delete is confirmed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('profile.deleteAccount'));

    const alertArgs = alertSpy.mock.calls[0];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    const deleteAction = buttons.find((b) => b.text === 'common.delete');
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

  it('handles signOut error gracefully without crashing', async () => {
    mockSignOut.mockRejectedValue(new Error('sign out failed'));
    let capturedOnPress: (() => Promise<void>) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive');
      capturedOnPress = destructive?.onPress as () => Promise<void>;
    });

    render(<AccountScreen />);
    fireEvent.press(screen.getByText('profile.logOut'));

    // Should not throw even if signOut fails
    await expect(capturedOnPress?.()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalled();
    // router.replace should NOT have been called since signOut threw
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('onSuccess callback navigates to profile tab after delete account', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('profile.deleteAccount'));

    const alertArgs = alertSpy.mock.calls[0];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    const deleteAction = buttons.find((b) => b.text === 'common.delete');
    deleteAction?.onPress?.();

    // Extract the onSuccess callback from mockDeleteMutate call
    const mutateCall = mockDeleteMutate.mock.calls[0];
    const { onSuccess } = mutateCall[1];
    onSuccess();

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile');
    alertSpy.mockRestore();
  });

  it('onError callback shows alert with error message', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('profile.deleteAccount'));

    const deleteActionButtons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const deleteAction = deleteActionButtons.find((b) => b.text === 'common.delete');
    deleteAction?.onPress?.();

    const mutateCall = mockDeleteMutate.mock.calls[0];
    const { onError } = mutateCall[1];

    // Test with Error instance
    onError(new Error('deletion failed'));
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'deletion failed');

    alertSpy.mockRestore();
  });

  it('onError callback shows fallback message for non-Error objects', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<AccountScreen />);
    fireEvent.press(screen.getByText('profile.deleteAccount'));

    const deleteActionButtons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const deleteAction = deleteActionButtons.find((b) => b.text === 'common.delete');
    deleteAction?.onPress?.();

    const mutateCall = mockDeleteMutate.mock.calls[0];
    const { onError } = mutateCall[1];

    // Test with non-Error object
    onError('some string error');
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'profile.deleteFailed');

    alertSpy.mockRestore();
  });
});
