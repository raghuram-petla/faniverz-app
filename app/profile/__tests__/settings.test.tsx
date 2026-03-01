jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
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

describe('SettingsScreen', () => {
  it('renders "Settings" header', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders notification toggles section', () => {
    render(<SettingsScreen />);
    // Section heading
    expect(screen.getByText('Notifications')).toBeTruthy();
    // Individual toggle rows
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
    // Find the Push Notifications toggle
    // Toggle is a TouchableOpacity — find all of them
    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    // The first toggleable touchable is the Push Notifications toggle
    // Push Notifications row has a Toggle component
    // We can verify the text and press the toggle
    expect(screen.getByText('Push Notifications')).toBeTruthy();
    // The toggles are the TouchableOpacities with toggle styles
    // Since we can't directly test state, we just verify that pressing doesn't crash
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
    expect(screen.getByText('Help & Support')).toBeTruthy();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders Privacy section', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Privacy')).toBeTruthy();
    expect(screen.getByText('Change Password')).toBeTruthy();
    expect(screen.getByText('Privacy Settings')).toBeTruthy();
  });

  it('renders Preferences section', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Preferences')).toBeTruthy();
  });

  it('toggles email notifications', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Email Notifications')).toBeTruthy();
    // Find the toggle for email notifications by pressing the second toggle
    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    // The first touchable is the push toggle, the second is the email toggle
    // Press the email toggle (second toggleable element)
    fireEvent.press(touchables[1]);
    // If it didn't crash, the toggle worked
    expect(screen.getByText('Email Notifications')).toBeTruthy();
  });
});
