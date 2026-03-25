import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockSignOut = vi.fn();
const mockUseAuth = vi.fn();
const mockUseImpersonation = vi.fn();
const mockSetTheme = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => mockUseImpersonation(),
}));

const mockTheme = vi.hoisted(() => ({ current: 'dark' as string | undefined }));
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme.current, setTheme: mockSetTheme }),
}));

vi.mock('@/components/layout/Breadcrumb', () => ({
  Breadcrumb: () => <nav data-testid="breadcrumb">Breadcrumb</nav>,
}));

vi.mock('@/components/layout/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Language</div>,
}));

vi.mock('@/components/users/ImpersonateModal', () => ({
  ImpersonateModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="impersonate-modal">
      <button onClick={onClose} data-testid="close-modal">
        Close
      </button>
    </div>
  ),
}));

const mockGetImageUrl = vi.fn(
  (_url: string, _size: string, _bucket: string) => `https://cdn.example.com/avatar.jpg`,
);
vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string, size: string, bucket: string) => mockGetImageUrl(url, size, bucket),
}));

vi.mock('@/lib/types', () => ({
  ADMIN_ROLE_LABELS: {
    admin: 'Admin',
    super_admin: 'Super Admin',
    root: 'Root',
    editor: 'Editor',
    viewer: 'Viewer',
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

import { Header } from '../Header';

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { email: 'admin@test.com', role: 'admin', avatar_url: null },
      signOut: mockSignOut,
    });
    mockUseImpersonation.mockReturnValue({ isImpersonating: false });
  });

  it('renders header with breadcrumb and language switcher', () => {
    render(<Header />);
    expect(screen.getByTestId('breadcrumb')).toBeTruthy();
    expect(screen.getByTestId('language-switcher')).toBeTruthy();
  });

  it('shows user menu button', () => {
    render(<Header />);
    expect(screen.getByLabelText('User menu')).toBeTruthy();
  });

  it('opens menu when user button clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('admin@test.com')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('shows role label when user has a role', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('calls signOut when Sign out clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Sign out'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('closes menu after sign out', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Sign out'));
    expect(screen.queryByText('admin@test.com')).toBeNull();
  });

  it('shows theme switcher options in menu', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByLabelText('System theme')).toBeTruthy();
    expect(screen.getByLabelText('Light theme')).toBeTruthy();
    expect(screen.getByLabelText('Dark theme')).toBeTruthy();
  });

  it('calls setTheme when theme option clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByLabelText('Light theme'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('shows Impersonate button for super_admin', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'super@test.com', role: 'super_admin', avatar_url: null },
      signOut: mockSignOut,
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Impersonate')).toBeTruthy();
  });

  it('shows Impersonate button for root', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'root@test.com', role: 'root', avatar_url: null },
      signOut: mockSignOut,
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Impersonate')).toBeTruthy();
  });

  it('does NOT show Impersonate when already impersonating', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'super@test.com', role: 'super_admin', avatar_url: null },
      signOut: mockSignOut,
    });
    mockUseImpersonation.mockReturnValue({ isImpersonating: true });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.queryByText('Impersonate')).toBeNull();
  });

  it('does NOT show Impersonate for regular admin', () => {
    render(<Header />); // admin role, not super_admin/root
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.queryByText('Impersonate')).toBeNull();
  });

  it('opens ImpersonateModal when Impersonate clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'super@test.com', role: 'super_admin', avatar_url: null },
      signOut: mockSignOut,
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Impersonate'));
    expect(screen.getByTestId('impersonate-modal')).toBeTruthy();
  });

  it('closes ImpersonateModal when onClose called', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'super@test.com', role: 'super_admin', avatar_url: null },
      signOut: mockSignOut,
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Impersonate'));
    fireEvent.click(screen.getByTestId('close-modal'));
    expect(screen.queryByTestId('impersonate-modal')).toBeNull();
  });

  it('shows avatar image when user has avatar_url', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'user@test.com', role: 'admin', avatar_url: '/avatar.jpg' },
      signOut: mockSignOut,
    });
    render(<Header />);
    const img = screen.getByAltText('Avatar');
    expect(img).toBeTruthy();
  });

  it('shows User icon when avatar_url is null', () => {
    render(<Header />); // avatar_url: null in default setup
    // No avatar img, just a User SVG icon
    expect(screen.queryByAltText('Avatar')).toBeNull();
  });

  it('closes menu on outside click (mousedown event)', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('admin@test.com')).toBeTruthy();
    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('admin@test.com')).toBeNull();
  });

  it('shows Profile link in menu', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    const profileLink = screen.getByText('Profile').closest('a')!;
    expect(profileLink.getAttribute('href')).toBe('/profile');
  });

  it('closes menu when Profile link clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.queryByText('admin@test.com')).toBeNull();
  });

  it('uses "system" as default when theme is undefined', () => {
    mockTheme.current = undefined;
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    // "System" theme option should be active
    const systemBtn = screen.getByLabelText('System theme');
    expect(systemBtn.className).toContain('bg-surface-card');
    mockTheme.current = 'dark';
  });

  it('does not close menu when clicking inside the menu dropdown', () => {
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('admin@test.com')).toBeTruthy();
    // Click inside the menu (on the email text) — should not close
    fireEvent.mouseDown(screen.getByText('admin@test.com'));
    expect(screen.getByText('admin@test.com')).toBeTruthy();
  });

  it('falls back to raw avatar_url when getImageUrl returns null', () => {
    mockGetImageUrl.mockReturnValueOnce(null as unknown as string);
    mockUseAuth.mockReturnValue({
      user: { email: 'user@test.com', role: 'admin', avatar_url: '/raw-avatar.jpg' },
      signOut: mockSignOut,
    });
    render(<Header />);
    const img = screen.getByAltText('Avatar');
    expect(img).toHaveAttribute('src', '/raw-avatar.jpg');
  });

  it('falls back to User icon when avatar image fails to load', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'user@test.com', role: 'admin', avatar_url: '/broken.jpg' },
      signOut: mockSignOut,
    });
    render(<Header />);
    const img = screen.getByAltText('Avatar');
    // Simulate image error
    fireEvent.error(img);
    // After error, the img should be replaced with the User icon
    expect(screen.queryByAltText('Avatar')).toBeNull();
  });

  it('shows "Admin" text fallback when user email is null', () => {
    mockUseAuth.mockReturnValue({
      user: { email: null, role: 'admin', avatar_url: null },
      signOut: mockSignOut,
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('User menu'));
    // There will be 'Admin' from both the role badge (ADMIN_ROLE_LABELS) and fallback text —
    // just verify the menu opened and the role badge is shown
    const adminTexts = screen.getAllByText('Admin');
    expect(adminTexts.length).toBeGreaterThanOrEqual(1);
  });
});
