import { render, screen, fireEvent } from '@testing-library/react';
import { AccessDenied } from '@/components/common/AccessDenied';

const mockSignOut = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
  }),
}));

vi.mock('lucide-react', () => ({
  ShieldX: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="shield-x-icon" {...props} />,
}));

describe('AccessDenied', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it('renders "Access Denied" heading', () => {
    render(<AccessDenied />);
    expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
  });

  it('renders contact administrator message', () => {
    render(<AccessDenied />);
    expect(screen.getByText(/please contact your administrator/i)).toBeInTheDocument();
  });

  it('renders "Sign Out" button', () => {
    render(<AccessDenied />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls signOut when button is clicked', () => {
    render(<AccessDenied />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
