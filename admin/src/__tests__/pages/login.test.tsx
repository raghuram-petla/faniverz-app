import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';

const mockSignInWithGoogle = vi.fn();
const mockReplace = vi.fn();

const mockAuthState = {
  user: null as unknown,
  isLoading: false,
};

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    isLoading: mockAuthState.isLoading,
    signInWithGoogle: mockSignInWithGoogle,
    signOut: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, back: vi.fn() }),
  usePathname: () => '/login',
  useParams: () => ({}),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithGoogle.mockResolvedValue(undefined);
    mockAuthState.user = null;
    mockAuthState.isLoading = false;
  });

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

  it('calls signInWithGoogle when button is clicked', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error when signInWithGoogle fails', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('OAuth failed'));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => {
      expect(screen.getByText('OAuth failed')).toBeInTheDocument();
    });
  });

  it('shows generic error message for non-Error failures', async () => {
    mockSignInWithGoogle.mockRejectedValue('unknown error');
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => {
      expect(screen.getByText('Google sign-in failed')).toBeInTheDocument();
    });
  });

  it('renders Admin text below logo', () => {
    render(<LoginPage />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});

describe('LoginPage - layout', () => {
  it('does not redirect when user is not authenticated', () => {
    render(<LoginPage />);
    // mockReplace should NOT be called when user is null
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('LoginPage - redirect when authenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = null;
    mockAuthState.isLoading = false;
  });

  it('redirects to / when user is authenticated and auth is not loading', () => {
    mockAuthState.user = { id: 'user-1', email: 'admin@test.com' };
    mockAuthState.isLoading = false;

    render(<LoginPage />);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not redirect when auth is still loading', () => {
    mockAuthState.user = { id: 'user-1' };
    mockAuthState.isLoading = true;

    render(<LoginPage />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
