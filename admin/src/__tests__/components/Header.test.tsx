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

describe('Header', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders "ADMIN" heading', () => {
    render(<Header />);
    expect(screen.getByRole('heading', { name: /admin/i })).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(<Header />);
    expect(screen.getByTitle('Sign out')).toBeInTheDocument();
  });

  it('shows impersonate button for super admins', () => {
    setUser({
      id: 'u1',
      display_name: 'Admin',
      email: 'admin@test.com',
      is_admin: true,
      avatar_url: null,
      created_at: '2024-01-01',
      role: 'super_admin',
      productionHouseIds: [],
    });
    render(<Header />);
    expect(screen.getByTitle('Impersonate a role or user')).toBeInTheDocument();
  });

  it('hides impersonate button for non-super admins', () => {
    setUser({
      id: 'u1',
      display_name: 'Admin',
      email: 'admin@test.com',
      is_admin: true,
      avatar_url: null,
      created_at: '2024-01-01',
      role: 'admin',
      productionHouseIds: [],
    });
    render(<Header />);
    expect(screen.queryByTitle('Impersonate a role or user')).not.toBeInTheDocument();
  });

  it('opens impersonate modal when button clicked', () => {
    setUser({
      id: 'u1',
      display_name: 'Admin',
      email: 'admin@test.com',
      is_admin: true,
      avatar_url: null,
      created_at: '2024-01-01',
      role: 'super_admin',
      productionHouseIds: [],
    });
    render(<Header />);
    fireEvent.click(screen.getByTitle('Impersonate a role or user'));
    expect(screen.getByText('Impersonate Role')).toBeInTheDocument();
  });
});
