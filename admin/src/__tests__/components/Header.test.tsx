import { render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
}));

describe('Header', () => {
  it('renders "Admin Panel" heading', () => {
    render(<Header />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(<Header />);
    expect(screen.getByTitle('Sign out')).toBeInTheDocument();
  });
});
