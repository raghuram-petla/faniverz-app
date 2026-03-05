import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImpersonateModal } from '@/components/users/ImpersonateModal';
import type { AdminUserWithDetails } from '@/lib/types';

const { mockStartImpersonation, mockStartRoleImpersonation } = vi.hoisted(() => ({
  mockStartImpersonation: vi.fn(),
  mockStartRoleImpersonation: vi.fn(),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => ({
    startImpersonation: mockStartImpersonation,
    startRoleImpersonation: mockStartRoleImpersonation,
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

vi.mock('lucide-react', () => ({
  X: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="x-icon" {...props} />,
  Loader2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="loader-icon" {...props} />,
}));

function makeUser(overrides: Partial<AdminUserWithDetails> = {}): AdminUserWithDetails {
  return {
    id: 'user-1',
    display_name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
    role_id: 'admin',
    role_assigned_at: '2024-01-01T00:00:00Z',
    assigned_by: null,
    ph_assignments: [],
    ...overrides,
  };
}

describe('ImpersonateModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartImpersonation.mockResolvedValue(undefined);
    mockStartRoleImpersonation.mockResolvedValue(undefined);
  });

  it('renders "Impersonate User" heading when targetUser is provided', () => {
    render(<ImpersonateModal targetUser={makeUser()} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: /impersonate user/i })).toBeInTheDocument();
  });

  it('renders "Impersonate Role" heading when targetUser is null', () => {
    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: /impersonate role/i })).toBeInTheDocument();
  });

  it('shows target user display name and role when targetUser provided', () => {
    render(
      <ImpersonateModal
        targetUser={makeUser({ display_name: 'Alice', role_id: 'admin' })}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows role selector with Admin and PH Admin options when no targetUser', () => {
    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Admin');
    expect(options[1]).toHaveTextContent('PH Admin');
  });

  it('calls startImpersonation with target user ID when clicking Start', async () => {
    render(<ImpersonateModal targetUser={makeUser({ id: 'user-42' })} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /start impersonating/i }));
    await waitFor(() => {
      expect(mockStartImpersonation).toHaveBeenCalledWith('user-42');
    });
  });

  it('calls startRoleImpersonation with selected role when no targetUser', async () => {
    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /start impersonating/i }));
    await waitFor(() => {
      expect(mockStartRoleImpersonation).toHaveBeenCalledWith('admin', []);
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<ImpersonateModal targetUser={makeUser()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<ImpersonateModal targetUser={makeUser()} onClose={onClose} />);
    const backdrop = screen
      .getByRole('heading', { name: /impersonate user/i })
      .closest('.bg-surface-card')!.parentElement!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows disclaimer text about audit log', () => {
    render(<ImpersonateModal targetUser={makeUser()} onClose={onClose} />);
    expect(screen.getByText(/all changes will be recorded in the audit log/i)).toBeInTheDocument();
  });

  it('start button disabled when PH admin role selected without PH selection', () => {
    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'production_house_admin' } });
    const startButton = screen.getByRole('button', { name: /start impersonating/i });
    expect(startButton).toBeDisabled();
  });
});
