jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
});
