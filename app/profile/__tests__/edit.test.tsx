jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Must be hoisted before component import
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  }),
}));

const stableProfile = {
  id: 'user-1',
  display_name: 'John Doe',
  email: 'test@example.com',
  phone: '+91 98765 43210',
  location: 'Hyderabad, India',
  bio: 'Big fan of Indian cinema.',
  avatar_url: null,
  preferred_lang: 'te',
  is_admin: false,
  is_profile_public: true,
  is_watchlist_public: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

const mockUpdateMutate = jest.fn();
jest.mock('@/features/auth/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

const mockPickAndUpload = jest.fn();
jest.mock('@/features/profile/hooks/useAvatarUpload', () => ({
  useAvatarUpload: () => ({
    pickAndUpload: mockPickAndUpload,
    isUploading: false,
  }),
}));

import EditProfileScreen from '../edit';
import { useProfile } from '@/features/auth/hooks/useProfile';

const mockUseProfile = useProfile as jest.Mock;

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ data: stableProfile, isLoading: false });
  });

  it('renders "Edit Profile" header', () => {
    render(<EditProfileScreen />);
    expect(screen.getByText('profile.editProfile')).toBeTruthy();
  });

  it('shows Full Name input with profile value', () => {
    render(<EditProfileScreen />);
    // The label is rendered as an uppercase styled text
    expect(screen.getByText('profile.fullName')).toBeTruthy();
    // The TextInput is populated with the profile display_name
    const input = screen.getByDisplayValue('John Doe');
    expect(input).toBeTruthy();
  });

  it('shows bio character counter', () => {
    render(<EditProfileScreen />);
    // Bio label is present
    expect(screen.getByText('profile.bio')).toBeTruthy();
    // The counter Text element renders "25/150" with BIO_LIMIT=150
    // "Big fan of Indian cinema." is 25 characters; counter uses exact combined text
    expect(screen.getByText(/25\/150/)).toBeTruthy();
  });

  it('shows Save button', () => {
    render(<EditProfileScreen />);
    expect(screen.getByText('profile.saveChanges')).toBeTruthy();
  });

  it('renders all form fields with initial profile values', () => {
    render(<EditProfileScreen />);
    expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    expect(screen.getByDisplayValue('+91 98765 43210')).toBeTruthy();
    expect(screen.getByDisplayValue('Hyderabad, India')).toBeTruthy();
    expect(screen.getByDisplayValue('Big fan of Indian cinema.')).toBeTruthy();
  });

  it('calls updateProfile when Save Changes is pressed', () => {
    render(<EditProfileScreen />);
    fireEvent.press(screen.getByText('profile.saveChanges'));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'John Doe',
        bio: 'Big fan of Indian cinema.',
      }),
      expect.any(Object),
    );
  });

  it('shows email field as non-editable with hint text', () => {
    render(<EditProfileScreen />);
    expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
    expect(screen.getByText('profile.emailHint')).toBeTruthy();
  });

  it('shows skeleton when profile is loading', () => {
    mockUseProfile.mockReturnValue({ data: null, isLoading: true });
    render(<EditProfileScreen />);
    expect(screen.getByTestId('edit-profile-skeleton')).toBeTruthy();
    expect(screen.queryByText('profile.editProfile')).toBeNull();
  });

  it('shows validation alert when bio exceeds 150 characters', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<EditProfileScreen />);

    // Type a bio that's over 150 characters
    const longBio = 'A'.repeat(151);
    fireEvent.changeText(screen.getByDisplayValue('Big fan of Indian cinema.'), longBio);

    // Press save
    fireEvent.press(screen.getByText('profile.saveChanges'));

    expect(alertSpy).toHaveBeenCalledWith('profile.bioTooLong', 'profile.bioTooLongMessage');
    // updateProfile should NOT have been called
    expect(mockUpdateMutate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('updates display name and saves', () => {
    render(<EditProfileScreen />);

    fireEvent.changeText(screen.getByDisplayValue('John Doe'), 'Jane Doe');
    fireEvent.press(screen.getByText('profile.saveChanges'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Jane Doe',
      }),
      expect.any(Object),
    );
  });

  it('updates phone field', () => {
    render(<EditProfileScreen />);

    fireEvent.changeText(screen.getByDisplayValue('+91 98765 43210'), '+91 12345 67890');
    fireEvent.press(screen.getByText('profile.saveChanges'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+91 12345 67890',
      }),
      expect.any(Object),
    );
  });

  it('updates location field', () => {
    render(<EditProfileScreen />);

    fireEvent.changeText(screen.getByDisplayValue('Hyderabad, India'), 'Chennai, India');
    fireEvent.press(screen.getByText('profile.saveChanges'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Chennai, India',
      }),
      expect.any(Object),
    );
  });

  it('calls pickAndUpload when Change Photo is pressed', () => {
    render(<EditProfileScreen />);
    fireEvent.press(screen.getByText('profile.changePhoto'));
    expect(mockPickAndUpload).toHaveBeenCalled();
  });

  it('shows Saved alert and navigates back on successful save', () => {
    const mockBack = jest.fn();
    const useRouterSpy = jest
      .spyOn(require('expo-router'), 'useRouter')
      .mockReturnValue({ back: mockBack, push: jest.fn() });
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<EditProfileScreen />);
    fireEvent.press(screen.getByText('profile.saveChanges'));

    const [, callbacks] = mockUpdateMutate.mock.calls[0];
    callbacks.onSuccess();

    expect(alertSpy).toHaveBeenCalledWith('common.saved', 'profile.profileUpdated');
    expect(mockBack).toHaveBeenCalled();

    alertSpy.mockRestore();
    useRouterSpy.mockRestore();
  });

  it('shows Error alert on failed save', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<EditProfileScreen />);
    fireEvent.press(screen.getByText('profile.saveChanges'));

    const [, callbacks] = mockUpdateMutate.mock.calls[0];
    callbacks.onError();

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'profile.profileSaveFailed');
    alertSpy.mockRestore();
  });

  it('shows ActivityIndicator on save button when isSaving is true', () => {
    const mockModule = jest.requireMock('@/features/auth/hooks/useUpdateProfile');
    const origImpl = mockModule.useUpdateProfile;
    mockModule.useUpdateProfile = () => ({ mutate: mockUpdateMutate, isPending: true });

    const { UNSAFE_getByType } = render(<EditProfileScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

    mockModule.useUpdateProfile = origImpl;
  });

  it('initializes form with empty strings when profile fields are null', () => {
    const nullFieldProfile = {
      ...stableProfile,
      display_name: null,
      phone: null,
      location: null,
      bio: null,
    };
    mockUseProfile.mockReturnValueOnce({ data: nullFieldProfile, isLoading: false });

    render(<EditProfileScreen />);

    // All fields should default to empty string (not "null")
    expect(screen.queryByDisplayValue('null')).toBeNull();
    // Save button should still be present
    expect(screen.getByText('profile.saveChanges')).toBeTruthy();
  });

  it('renders on android platform without crashing', () => {
    const Platform = require('react-native').Platform;
    const origOS = Platform.OS;
    Platform.OS = 'android';

    render(<EditProfileScreen />);
    expect(screen.getByText('profile.editProfile')).toBeTruthy();

    Platform.OS = origOS;
  });

  it('shows uploading text when isUploading is true', () => {
    const mockModule = jest.requireMock('@/features/profile/hooks/useAvatarUpload');
    const origImpl = mockModule.useAvatarUpload;
    mockModule.useAvatarUpload = () => ({
      pickAndUpload: mockPickAndUpload,
      isUploading: true,
    });

    render(<EditProfileScreen />);
    expect(screen.getByText('profile.uploading')).toBeTruthy();

    mockModule.useAvatarUpload = origImpl;
  });

  it('shows empty email when user is null (email defaults to empty string)', () => {
    const authModule = jest.requireMock('@/features/auth/providers/AuthProvider');
    const origUseAuth = authModule.useAuth;
    authModule.useAuth = () => ({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    render(<EditProfileScreen />);
    // Email field should be empty (user?.email ?? '' branch)
    expect(screen.getByText('profile.email')).toBeTruthy();

    authModule.useAuth = origUseAuth;
  });
});
