import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const mockSignInWithGoogle = vi.fn();
let mockUser: { id: string } | null = null;
let mockAuthLoading = false;

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockAuthLoading,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

import LoginPage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = null;
  mockAuthLoading = false;
});

describe('LoginPage — rendering', () => {
  it('renders Google sign-in button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeTruthy();
  });

  it('does not render email or password inputs', () => {
    render(<LoginPage />);
    expect(screen.queryByPlaceholderText('Email')).toBeNull();
    expect(screen.queryByPlaceholderText('Password')).toBeNull();
  });

  it('does not render "or" divider', () => {
    render(<LoginPage />);
    expect(screen.queryByText('or')).toBeNull();
  });

  it('does not show error initially', () => {
    render(<LoginPage />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('LoginPage — redirect when already logged in', () => {
  it('redirects to / when user is set and not loading', async () => {
    mockUser = { id: 'u1' };
    mockAuthLoading = false;
    render(<LoginPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('does not redirect while auth is loading', () => {
    mockAuthLoading = true;
    render(<LoginPage />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('LoginPage — Google sign-in', () => {
  it('calls signInWithGoogle when Google button is clicked', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalled());
  });

  it('shows error when signInWithGoogle throws', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('Google sign-in failed'));
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText('Google sign-in failed')).toBeTruthy();
    });
  });

  it('shows fallback error when thrown value is not an Error instance', async () => {
    mockSignInWithGoogle.mockRejectedValue('some string error');
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText('Google sign-in failed')).toBeTruthy();
    });
  });
});
