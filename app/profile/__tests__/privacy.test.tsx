jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/features/auth/hooks/useUpdateProfile', () => ({
  useUpdateProfile: jest.fn(),
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <Text>{title}</Text>
      </View>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PrivacySettingsScreen from '../privacy';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';

const mockUseProfile = useProfile as jest.Mock;
const mockUseUpdateProfile = useUpdateProfile as jest.Mock;

describe('PrivacySettingsScreen', () => {
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({
      data: { is_profile_public: true, is_watchlist_public: true },
      isLoading: false,
    });
    mockUseUpdateProfile.mockReturnValue({ mutate: mockMutate });
  });

  it('renders "Privacy Settings" header', () => {
    render(<PrivacySettingsScreen />);
    expect(screen.getByText('Privacy Settings')).toBeTruthy();
  });

  it('shows loading indicator when profile is loading', () => {
    mockUseProfile.mockReturnValue({ data: null, isLoading: true });

    render(<PrivacySettingsScreen />);

    // When loading, the toggle rows should not be visible
    expect(screen.queryByText('Show my profile publicly')).toBeNull();
    expect(screen.queryByText('Show my watchlist')).toBeNull();
  });

  it('shows both toggle rows', () => {
    render(<PrivacySettingsScreen />);
    expect(screen.getByText('Show my profile publicly')).toBeTruthy();
    expect(screen.getByText('Show my watchlist')).toBeTruthy();
  });

  it('shows description text for profile toggle', () => {
    render(<PrivacySettingsScreen />);
    expect(screen.getByText('Others can see your profile, bio, and activity')).toBeTruthy();
  });

  it('shows description text for watchlist toggle', () => {
    render(<PrivacySettingsScreen />);
    expect(screen.getByText('Others can see movies on your watchlist')).toBeTruthy();
  });

  it('calls mutate with is_profile_public when profile toggle pressed', () => {
    render(<PrivacySettingsScreen />);

    // The profile toggle is the first touchable after the header
    fireEvent.press(screen.getByText('Show my profile publicly'));
    // Since the ToggleRow wraps the TouchableOpacity, we need to press the toggle itself
    // The toggle is a TouchableOpacity inside ToggleRow, let's find it by pressing
    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    // First touchable is profile toggle, second is watchlist toggle
    fireEvent.press(touchables[0]);

    expect(mockMutate).toHaveBeenCalledWith({ is_profile_public: false });
  });

  it('calls mutate with is_watchlist_public when watchlist toggle pressed', () => {
    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    // Second touchable is watchlist toggle
    fireEvent.press(touchables[1]);

    expect(mockMutate).toHaveBeenCalledWith({ is_watchlist_public: false });
  });

  it('toggles profile from false to true', () => {
    mockUseProfile.mockReturnValue({
      data: { is_profile_public: false, is_watchlist_public: true },
      isLoading: false,
    });

    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    expect(mockMutate).toHaveBeenCalledWith({ is_profile_public: true });
  });

  it('toggles watchlist from false to true', () => {
    mockUseProfile.mockReturnValue({
      data: { is_profile_public: true, is_watchlist_public: false },
      isLoading: false,
    });

    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[1]);

    expect(mockMutate).toHaveBeenCalledWith({ is_watchlist_public: true });
  });

  it('shows section description text', () => {
    render(<PrivacySettingsScreen />);
    expect(
      screen.getByText('Control who can see your profile and activity on Faniverz.'),
    ).toBeTruthy();
  });

  it('defaults to public when profile data is null', () => {
    mockUseProfile.mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    // Defaults to true via ?? true, so toggling should set to false
    expect(mockMutate).toHaveBeenCalledWith({ is_profile_public: false });
  });
});
