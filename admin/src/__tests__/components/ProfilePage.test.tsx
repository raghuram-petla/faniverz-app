import { render, screen } from '@testing-library/react';
import type { AdminUser } from '@/lib/types';

const mockRefreshUser = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'u1',
      display_name: 'Admin',
      email: 'admin@test.com',
      is_admin: true,
      avatar_url: null,
      created_at: '2024-01-01',
      role: 'super_admin' as const,
      productionHouseIds: [],
    } satisfies AdminUser,
    isLoading: false,
    isAccessDenied: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    refreshUser: mockRefreshUser,
  })),
}));

vi.mock('@/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: ({ label, url }: { label: string; url: string }) => (
    <div data-testid="image-upload">{url ? `Preview: ${url}` : `Upload ${label}`}</div>
  ),
}));

import ProfilePage from '@/app/(dashboard)/profile/page';
import { useAuth } from '@/components/providers/AuthProvider';

describe('ProfilePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page heading', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('displays user email', () => {
    render(<ProfilePage />);
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('displays user role badge', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('shows upload button when no avatar', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Upload Avatar')).toBeInTheDocument();
  });

  it('shows avatar preview when user has avatar_url', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'u1',
        display_name: 'Admin',
        email: 'admin@test.com',
        is_admin: true,
        avatar_url: 'https://cdn.example.com/avatar.jpg',
        created_at: '2024-01-01',
        role: 'super_admin',
        productionHouseIds: [],
      },
      isLoading: false,
      isAccessDenied: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshUser: mockRefreshUser,
    });

    render(<ProfilePage />);
    expect(screen.getByText('Preview: https://cdn.example.com/avatar.jpg')).toBeInTheDocument();
  });

  it('renders back to dashboard link', () => {
    render(<ProfilePage />);
    const link = screen.getByText('Back to Dashboard');
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });
});
