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
import { Alert } from 'react-native';
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
    expect(screen.getByText('Allow others to see your profile page.')).toBeTruthy();
  });

  it('shows description text for watchlist toggle', () => {
    render(<PrivacySettingsScreen />);
    expect(screen.getByText('Allow others to see your watchlist.')).toBeTruthy();
  });

  it('calls mutate with is_profile_public and onError when profile toggle pressed', () => {
    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    // First touchable is profile toggle
    fireEvent.press(touchables[0]);

    expect(mockMutate).toHaveBeenCalledWith(
      { is_profile_public: false },
      { onError: expect.any(Function) },
    );
  });

  it('calls mutate with is_watchlist_public and onError when watchlist toggle pressed', () => {
    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    // Second touchable is watchlist toggle
    fireEvent.press(touchables[1]);

    expect(mockMutate).toHaveBeenCalledWith(
      { is_watchlist_public: false },
      { onError: expect.any(Function) },
    );
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

    expect(mockMutate).toHaveBeenCalledWith(
      { is_profile_public: true },
      { onError: expect.any(Function) },
    );
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

    expect(mockMutate).toHaveBeenCalledWith(
      { is_watchlist_public: true },
      { onError: expect.any(Function) },
    );
  });

  it('shows section description text', () => {
    render(<PrivacySettingsScreen />);
    expect(screen.getByText('Control who can see your profile and activity.')).toBeTruthy();
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
    expect(mockMutate).toHaveBeenCalledWith(
      { is_profile_public: false },
      { onError: expect.any(Function) },
    );
  });

  it('shows Alert when onError callback is invoked with Error instance', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    // Extract the onError callback from the mutate call
    const onErrorCallback = mockMutate.mock.calls[0][1].onError;
    onErrorCallback(new Error('Network failure'));

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Network failure');
    alertSpy.mockRestore();
  });

  it('shows Alert with fallback message when onError receives non-Error', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[1]);

    // Extract the onError callback from the watchlist mutate call
    const onErrorCallback = mockMutate.mock.calls[0][1].onError;
    onErrorCallback('string error');

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Update failed');
    alertSpy.mockRestore();
  });

  // @contract: isPending guard prevents duplicate mutations from rapid double-taps
  it('does not call mutate a second time when isPending is true', () => {
    mockUseUpdateProfile.mockReturnValue({ mutate: mockMutate, isPending: true });
    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);
    fireEvent.press(touchables[0]);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call mutate for watchlist toggle when isPending is true', () => {
    mockUseUpdateProfile.mockReturnValue({ mutate: mockMutate, isPending: true });
    render(<PrivacySettingsScreen />);

    const { TouchableOpacity } = require('react-native');
    const touchables = screen.UNSAFE_queryAllByType(TouchableOpacity);
    fireEvent.press(touchables[1]);

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
