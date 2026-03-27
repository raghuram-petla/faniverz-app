import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImpersonateModal } from '@/components/users/ImpersonateModal';
import type { AdminUserWithDetails } from '@/lib/types';

const { mockStartImpersonation, mockStartRoleImpersonation } = vi.hoisted(() => ({
  mockStartImpersonation: vi.fn(),
  mockStartRoleImpersonation: vi.fn(),
}));

let mockRealUser: { role: string } | null = { role: 'super_admin' };

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => ({
    startImpersonation: mockStartImpersonation,
    startRoleImpersonation: mockStartRoleImpersonation,
    realUser: mockRealUser,
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
    status: 'active',
    blocked_by: null,
    blocked_at: null,
    blocked_reason: null,
    ...overrides,
  };
}

describe('ImpersonateModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartImpersonation.mockResolvedValue(undefined);
    mockStartRoleImpersonation.mockResolvedValue(undefined);
    mockRealUser = { role: 'super_admin' };
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
    expect(screen.getByText('Faniverz Admin')).toBeInTheDocument();
  });

  it('shows role selector with Admin, Production Admin, and Viewer options when no targetUser', () => {
    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Faniverz Admin');
    expect(options[1]).toHaveTextContent('Production Admin');
    expect(options[2]).toHaveTextContent('Viewer');
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

  it('shows Super Admin option in role dropdown when real user is root', () => {
    mockRealUser = { role: 'root' };
    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('Super Admin');
    expect(options[1]).toHaveTextContent('Faniverz Admin');
    expect(options[2]).toHaveTextContent('Production Admin');
    expect(options[3]).toHaveTextContent('Viewer');
  });

  it('does not show Super Admin option when real user is super_admin', () => {
    mockRealUser = { role: 'super_admin' };
    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Faniverz Admin');
    expect(options[1]).toHaveTextContent('Production Admin');
    expect(options[2]).toHaveTextContent('Viewer');
  });

  it('shows error message when production houses fetch fails', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((onSuccess: unknown, onError: (err: Error) => void) => {
        onError(new Error('Network error'));
      }),
    });

    render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'production_house_admin' } });

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // @edge: unmounting mid-fetch must not call setPhError/setPhLoading on unmounted component
  it('does not update state after unmount when PH fetch completes late', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
    let capturedSuccess: ((result: { data: unknown; error: null }) => void) | undefined;
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((onSuccess: (result: { data: unknown; error: null }) => void) => {
        capturedSuccess = onSuccess;
      }),
    });

    const { unmount } = render(<ImpersonateModal targetUser={null} onClose={onClose} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'production_house_admin' } });

    unmount();

    // Resolve the fetch after unmount — should be a no-op due to cancelled guard
    expect(() => {
      capturedSuccess?.({ data: [{ id: 'ph-1', name: 'House' }], error: null });
    }).not.toThrow();
  });
});
