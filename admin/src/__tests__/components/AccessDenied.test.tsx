import { render, screen, fireEvent } from '@testing-library/react';
import { AccessDenied } from '@/components/common/AccessDenied';

const mockSignOut = vi.fn();
let mockBlockedReason: string | null = null;

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    blockedReason: mockBlockedReason,
  }),
}));

vi.mock('lucide-react', () => ({
  ShieldX: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="shield-x-icon" {...props} />,
  Ban: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="ban-icon" {...props} />,
}));

describe('AccessDenied', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    mockBlockedReason = null;
  });

  it('renders "Access Denied" heading when not blocked', () => {
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

  it('renders "Access Blocked" heading when blockedReason is set', () => {
    mockBlockedReason = 'Violated policy';
    render(<AccessDenied />);
    expect(screen.getByRole('heading', { name: /access blocked/i })).toBeInTheDocument();
  });

  it('shows the blocked reason text when blockedReason is set', () => {
    mockBlockedReason = 'Violated policy';
    render(<AccessDenied />);
    expect(screen.getByText(/Violated policy/)).toBeInTheDocument();
  });

  it('does not render "Access Blocked" when blockedReason is null', () => {
    mockBlockedReason = null;
    render(<AccessDenied />);
    expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    expect(screen.queryByText(/access blocked/i)).not.toBeInTheDocument();
  });
});
