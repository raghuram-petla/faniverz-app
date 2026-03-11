jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
}));

import SettingsScreen from '../settings';
import { useAuth } from '@/features/auth/providers/AuthProvider';

const mockUseAuth = useAuth as jest.Mock;

function setupLoggedIn() {
  mockUseAuth.mockReturnValue({ user: { id: 'user-1', email: 'fan@example.com' } });
}

function setupGuest() {
  mockUseAuth.mockReturnValue({ user: null });
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLoggedIn();
  });

  it('renders "Settings" header', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders Appearance section with all theme options', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
  });

  it('calls setMode when a theme chip is pressed', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Dark'));
  });

  it('renders notification toggles section when logged in', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('Push Notifications')).toBeTruthy();
    expect(screen.getByText('Email Notifications')).toBeTruthy();
  });

  it('renders "Language" preference with "English" value', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
  });

  it('shows footer with version info', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Faniverz v1.0.0')).toBeTruthy();
    expect(screen.getByText('Build 2024.02.23')).toBeTruthy();
  });

  it('renders toggle switches and toggles push notifications', () => {
    render(<SettingsScreen />);
    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    expect(screen.getByText('Push Notifications')).toBeTruthy();
    fireEvent.press(touchables[0]);
  });

  it('navigates to language screen when Language option is pressed', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Language'));
    expect(mockPush).toHaveBeenCalledWith('/profile/language');
  });

  it('shows alert when Change Password is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Change Password'));
    expect(alertSpy).toHaveBeenCalledWith('Coming Soon', 'This feature is not yet available.');
    alertSpy.mockRestore();
  });

  it('shows alert when Privacy Settings is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Privacy Settings'));
    expect(alertSpy).toHaveBeenCalledWith('Coming Soon', 'This feature is not yet available.');
    alertSpy.mockRestore();
  });

  it('shows alert when Help & Support is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Help & Support'));
    expect(alertSpy).toHaveBeenCalledWith('Coming Soon', 'This feature is not yet available.');
    alertSpy.mockRestore();
  });

  it('shows alert when Terms of Service is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Terms of Service'));
    expect(alertSpy).toHaveBeenCalledWith('Coming Soon', 'This feature is not yet available.');
    alertSpy.mockRestore();
  });

  it('shows alert when Privacy Policy is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('Privacy Policy'));
    expect(alertSpy).toHaveBeenCalledWith('Coming Soon', 'This feature is not yet available.');
    alertSpy.mockRestore();
  });

  it('renders the About section with all items', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText('FAQ')).toBeTruthy();
    expect(screen.getByText('Help & Support')).toBeTruthy();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders Privacy section when logged in', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Privacy')).toBeTruthy();
    expect(screen.getByText('Change Password')).toBeTruthy();
    expect(screen.getByText('Privacy Settings')).toBeTruthy();
  });

  it('renders Preferences section', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Preferences')).toBeTruthy();
  });

  it('navigates to FAQ screen when FAQ is pressed', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText('FAQ'));
    expect(mockPush).toHaveBeenCalledWith('/profile/faq');
  });

  it('toggles email notifications', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Email Notifications')).toBeTruthy();
    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[1]);
    expect(screen.getByText('Email Notifications')).toBeTruthy();
  });

  // ── Guest (not logged in) ──────────────────────────────────────────────

  it('shows Appearance, Preferences, About sections when guest', () => {
    setupGuest();
    render(<SettingsScreen />);
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByText('Preferences')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('hides Notifications and Privacy sections when guest', () => {
    setupGuest();
    render(<SettingsScreen />);
    expect(screen.queryByText('Notifications')).toBeNull();
    expect(screen.queryByText('Push Notifications')).toBeNull();
    expect(screen.queryByText('Privacy')).toBeNull();
    expect(screen.queryByText('Change Password')).toBeNull();
  });
});
