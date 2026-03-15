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
    blockedReason: null,
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

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: ({
    label,
    url,
    onReset,
    resetLabel,
  }: {
    label: string;
    url: string;
    onReset?: () => void;
    resetLabel?: string;
  }) => (
    <div data-testid="image-upload">
      {url ? `Preview: ${url}` : `Upload ${label}`}
      {onReset && (
        <button data-testid="reset-avatar" onClick={onReset}>
          {resetLabel}
        </button>
      )}
    </div>
  ),
}));

import ProfilePage from '@/app/(dashboard)/profile/page';
import { useAuth } from '@/components/providers/AuthProvider';

describe('ProfilePage', () => {
  beforeEach(() => vi.clearAllMocks());

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
      blockedReason: null,
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

  it('renders reset to Google avatar button', () => {
    render(<ProfilePage />);
    const resetBtn = screen.getByTestId('reset-avatar');
    expect(resetBtn).toBeInTheDocument();
    expect(resetBtn).toHaveTextContent('Reset to Google avatar');
  });
});
