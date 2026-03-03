import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';

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
  usePathname: () => '/login',
  useParams: () => ({}),
}));

describe('LoginPage', () => {
  it('has Faniverz logo', () => {
    render(<LoginPage />);
    expect(screen.getByAltText('Faniverz')).toBeInTheDocument();
  });

  it('renders "Sign in with Google" button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('does not render email or password inputs', () => {
    render(<LoginPage />);
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
  });
});
