import { render, screen, fireEvent } from '@testing-library/react';
import { InvitationsTable } from '@/components/users/InvitationsTable';
import type { InvitationsTableProps } from '@/components/users/InvitationsTable';
import type { AdminRoleId } from '@/lib/types';

vi.mock('lucide-react', () => ({
  Loader2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="loader-icon" {...props} />,
  Clock: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="clock-icon" {...props} />,
  CheckCircle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="check-circle-icon" {...props} />
  ),
  XCircle: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="x-circle-icon" {...props} />,
}));

vi.mock('@/lib/utils', () => ({
  formatDateTime: (d: string) => d,
}));

interface Invitation {
  id: string;
  email: string;
  role_id: AdminRoleId;
  status: string;
  created_at: string;
}

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: 'inv-1',
    email: 'invited@example.com',
    role_id: 'admin',
    status: 'pending',
    created_at: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

const defaultProps: InvitationsTableProps = {
  invitations: [],
  isLoading: false,
  onRevoke: vi.fn(),
  isRevokePending: false,
};

function renderTable(overrides: Partial<InvitationsTableProps> = {}) {
  return render(<InvitationsTable {...defaultProps} {...overrides} />);
}

describe('InvitationsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when isLoading', () => {
    renderTable({ isLoading: true });
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders invitation rows with email, role, and status', () => {
    const invitations = [
      makeInvitation({ id: 'i1', email: 'alice@test.com', role_id: 'admin', status: 'pending' }),
      makeInvitation({
        id: 'i2',
        email: 'bob@test.com',
        role_id: 'super_admin',
        status: 'accepted',
      }),
    ];
    renderTable({ invitations });
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('shows Pending status badge for pending invitations', () => {
    renderTable({ invitations: [makeInvitation({ status: 'pending' })] });
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('shows Accepted status badge for accepted invitations', () => {
    renderTable({ invitations: [makeInvitation({ status: 'accepted' })] });
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
  });

  it('shows Revoked status badge for revoked invitations', () => {
    renderTable({ invitations: [makeInvitation({ status: 'revoked' })] });
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('shows revoke button for pending invitations', () => {
    renderTable({ invitations: [makeInvitation({ status: 'pending' })] });
    // The revoke button renders an XCircle icon
    const actionCells = screen.getAllByTestId('x-circle-icon');
    // One is in the status column (revoked uses XCircle) — for pending, only the action button has it
    expect(actionCells.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show revoke button for accepted invitations', () => {
    renderTable({ invitations: [makeInvitation({ status: 'accepted' })] });
    // Accepted status shows check-circle, no action button with x-circle
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not show revoke button for revoked invitations', () => {
    renderTable({ invitations: [makeInvitation({ status: 'revoked' })] });
    // Revoked status shows x-circle in status column, but no action button
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRevoke when revoke button is clicked', () => {
    const onRevoke = vi.fn();
    renderTable({
      invitations: [makeInvitation({ id: 'inv-42', status: 'pending' })],
      onRevoke,
    });
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onRevoke).toHaveBeenCalledWith('inv-42');
  });

  it('disables revoke button when isRevokePending', () => {
    renderTable({
      invitations: [makeInvitation({ status: 'pending' })],
      isRevokePending: true,
    });
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows empty state when no invitations', () => {
    renderTable({ invitations: [] });
    expect(screen.getByText('No invitations yet')).toBeInTheDocument();
  });

  it('shows empty state when invitations is undefined', () => {
    renderTable({ invitations: undefined });
    expect(screen.getByText('No invitations yet')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderTable({ invitations: [makeInvitation()] });
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
