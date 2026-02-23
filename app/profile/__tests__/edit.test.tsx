import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

jest.mock('@/features/auth/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: jest.fn(),
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
});
