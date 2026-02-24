jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Must be hoisted before component import
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
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

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: () => ({
    data: {
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
    },
    isLoading: false,
  }),
}));

const mockUpdateMutate = jest.fn();
jest.mock('@/features/auth/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

import EditProfileScreen from '../edit';

describe('EditProfileScreen', () => {
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
    // Override useProfile to return isLoading: true
    jest.spyOn(require('@/features/auth/hooks/useProfile'), 'useProfile').mockReturnValueOnce({
      data: null,
      isLoading: true,
    });
    render(<EditProfileScreen />);
    // The loading container renders ActivityIndicator, not the form
    expect(screen.queryByText('Edit Profile')).toBeNull();
  });
});
