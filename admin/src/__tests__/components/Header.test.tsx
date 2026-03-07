import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

const mockSignOut = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
    signInWithGoogle: vi.fn(),
    signOut: mockSignOut,
  })),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => ({
    isImpersonating: false,
    effectiveUser: null,
    realUser: null,
    startImpersonation: vi.fn(),
    startRoleImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
  },
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}));

import { useAuth } from '@/components/providers/AuthProvider';
import type { AdminUser } from '@/lib/types';

function setUser(user: AdminUser | null) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    isLoading: false,
    isAccessDenied: false,
    signInWithGoogle: vi.fn(),
    signOut: mockSignOut,
  });
}

const superAdmin: AdminUser = {
  id: 'u1',
  display_name: 'Admin',
  email: 'admin@test.com',
  is_admin: true,
  avatar_url: null,
  created_at: '2024-01-01',
  role: 'super_admin',
  productionHouseIds: [],
};

function openMenu() {
  fireEvent.click(screen.getByLabelText('User menu'));
}

describe('Header', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders "ADMIN" heading', () => {
    render(<Header />);
    expect(screen.getByRole('heading', { name: /admin/i })).toBeInTheDocument();
  });

  it('renders user menu button', () => {
    render(<Header />);
    expect(screen.getByLabelText('User menu')).toBeInTheDocument();
  });

  it('opens dropdown when avatar is clicked', () => {
    render(<Header />);
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    openMenu();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('shows email and role in dropdown', () => {
    setUser(superAdmin);
    render(<Header />);
    openMenu();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('shows theme option in dropdown', () => {
    render(<Header />);
    openMenu();
    expect(screen.getByText('Theme: System')).toBeInTheDocument();
  });

  it('shows impersonate option for super admins', () => {
    setUser(superAdmin);
    render(<Header />);
    openMenu();
    expect(screen.getByText('Impersonate')).toBeInTheDocument();
  });

  it('hides impersonate option for non-super admins', () => {
    setUser({ ...superAdmin, role: 'admin' });
    render(<Header />);
    openMenu();
    expect(screen.queryByText('Impersonate')).not.toBeInTheDocument();
  });

  it('opens impersonate modal when option clicked', () => {
    setUser(superAdmin);
    render(<Header />);
    openMenu();
    fireEvent.click(screen.getByText('Impersonate'));
    expect(screen.getByText('Impersonate Role')).toBeInTheDocument();
  });

  it('calls signOut when sign out clicked', () => {
    render(<Header />);
    openMenu();
    fireEvent.click(screen.getByText('Sign out'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('closes dropdown on click outside', () => {
    render(<Header />);
    openMenu();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });
});
