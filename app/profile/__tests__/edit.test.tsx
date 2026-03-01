jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
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
  bio: 'Big fan of Telugu cinema.',
  avatar_url: null,
  preferred_lang: 'te',
  is_admin: false,
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
    expect(screen.getByText('Edit Profile')).toBeTruthy();
  });

  it('shows Full Name input with profile value', () => {
    render(<EditProfileScreen />);
    // The label is rendered as an uppercase styled text
    expect(screen.getByText('Full Name')).toBeTruthy();
    // The TextInput is populated with the profile display_name
    const input = screen.getByDisplayValue('John Doe');
    expect(input).toBeTruthy();
  });

  it('shows bio character counter', () => {
    render(<EditProfileScreen />);
    // Bio label is present
    expect(screen.getByText('Bio')).toBeTruthy();
    // The counter Text element renders "25/150" with BIO_LIMIT=150
    // "Big fan of Telugu cinema." is 25 characters; counter uses exact combined text
    expect(screen.getByText(/25\/150/)).toBeTruthy();
  });

  it('shows Save button', () => {
    render(<EditProfileScreen />);
    expect(screen.getByText('Save Changes')).toBeTruthy();
  });

  it('renders all form fields with initial profile values', () => {
    render(<EditProfileScreen />);
    expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
    expect(screen.getByDisplayValue('+91 98765 43210')).toBeTruthy();
    expect(screen.getByDisplayValue('Hyderabad, India')).toBeTruthy();
    expect(screen.getByDisplayValue('Big fan of Telugu cinema.')).toBeTruthy();
  });

  it('calls updateProfile when Save Changes is pressed', () => {
    render(<EditProfileScreen />);
    fireEvent.press(screen.getByText('Save Changes'));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'John Doe',
        bio: 'Big fan of Telugu cinema.',
      }),
      expect.any(Object),
    );
  });

  it('shows email field as non-editable with hint text', () => {
    render(<EditProfileScreen />);
    expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
    expect(screen.getByText('Email cannot be changed here.')).toBeTruthy();
  });

  it('shows loading indicator when profile is loading', () => {
    mockUseProfile.mockReturnValue({ data: null, isLoading: true });
    render(<EditProfileScreen />);
    // The loading container renders ActivityIndicator, not the form
    expect(screen.queryByText('Edit Profile')).toBeNull();
  });

  it('shows validation alert when bio exceeds 150 characters', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<EditProfileScreen />);

    // Type a bio that's over 150 characters
    const longBio = 'A'.repeat(151);
    fireEvent.changeText(screen.getByDisplayValue('Big fan of Telugu cinema.'), longBio);

    // Press save
    fireEvent.press(screen.getByText('Save Changes'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Bio too long',
      'Please keep your bio under 150 characters.',
    );
    // updateProfile should NOT have been called
    expect(mockUpdateMutate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('updates display name and saves', () => {
    render(<EditProfileScreen />);

    fireEvent.changeText(screen.getByDisplayValue('John Doe'), 'Jane Doe');
    fireEvent.press(screen.getByText('Save Changes'));

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
    fireEvent.press(screen.getByText('Save Changes'));

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
    fireEvent.press(screen.getByText('Save Changes'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Chennai, India',
      }),
      expect.any(Object),
    );
  });

  it('shows Change Photo button', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<EditProfileScreen />);

    fireEvent.press(screen.getByText('Change Photo'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Coming Soon',
      'Photo upload will be available in a future update.',
    );
    alertSpy.mockRestore();
  });

  it('shows Saved alert and navigates back on successful save', () => {
    const mockBack = jest.fn();
    const useRouterSpy = jest
      .spyOn(require('expo-router'), 'useRouter')
      .mockReturnValue({ back: mockBack, push: jest.fn() });
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<EditProfileScreen />);
    fireEvent.press(screen.getByText('Save Changes'));

    const [, callbacks] = mockUpdateMutate.mock.calls[0];
    callbacks.onSuccess();

    expect(alertSpy).toHaveBeenCalledWith('Saved', 'Your profile has been updated.');
    expect(mockBack).toHaveBeenCalled();

    alertSpy.mockRestore();
    useRouterSpy.mockRestore();
  });

  it('shows Error alert on failed save', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<EditProfileScreen />);
    fireEvent.press(screen.getByText('Save Changes'));

    const [, callbacks] = mockUpdateMutate.mock.calls[0];
    callbacks.onError();

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Failed to save your profile. Please try again.',
    );
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
    expect(screen.getByText('Save Changes')).toBeTruthy();
  });
});
