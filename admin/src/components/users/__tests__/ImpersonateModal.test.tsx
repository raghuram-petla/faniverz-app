import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImpersonateModal } from '../ImpersonateModal';
import type { AdminUserWithDetails } from '@/lib/types';

const mockStartImpersonation = vi.fn();
const mockStartRoleImpersonation = vi.fn();
const mockRealUser = vi.fn();

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => ({
    startImpersonation: mockStartImpersonation,
    startRoleImpersonation: mockStartRoleImpersonation,
    realUser: mockRealUser(),
  }),
}));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase-browser', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('lucide-react', () => ({
  X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className} />,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className} />
  ),
}));

const mockOnClose = vi.fn();

const mockUser: AdminUserWithDetails = {
  id: 'u1',
  display_name: 'John',
  email: 'john@example.com',
  avatar_url: null,
  role_id: 'admin',
  role_assigned_at: '2025-01-01T00:00:00Z',
  assigned_by: null,
  ph_assignments: [],
  status: 'active',
  blocked_by: null,
  blocked_at: null,
  blocked_reason: null,
};

describe('ImpersonateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRealUser.mockReturnValue({ role: 'admin' });
    // Default: PH fetch returns empty (no-op for non-PH role)
    const noop = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ then: vi.fn() }) });
    mockFrom.mockReturnValue({ select: noop });
  });

  it('renders role mode when targetUser is null', () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    expect(screen.getByText('Impersonate Role')).toBeInTheDocument();
  });

  it('renders user mode when targetUser is provided', () => {
    render(<ImpersonateModal targetUser={mockUser} onClose={mockOnClose} />);
    expect(screen.getByText('Impersonate User')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('shows email when display_name is present', () => {
    render(<ImpersonateModal targetUser={mockUser} onClose={mockOnClose} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows role label badge', () => {
    render(<ImpersonateModal targetUser={mockUser} onClose={mockOnClose} />);
    // ADMIN_ROLE_LABELS['admin'] appears as badge in the user info panel
    const badge = document.querySelector('.bg-red-600\\/10');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toMatch(/admin/i);
  });

  it('shows email only (no subtitle) when display_name is null', () => {
    const userNoName = { ...mockUser, display_name: null };
    render(<ImpersonateModal targetUser={userNoName} onClose={mockOnClose} />);
    // email shown as primary name
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    // no separate subtitle
    const emailEls = screen.queryAllByText('john@example.com');
    expect(emailEls).toHaveLength(1);
  });

  it('shows PH assignments when user has them', () => {
    const userWithPH = {
      ...mockUser,
      ph_assignments: [{ production_house_id: 'ph1', production_house: { name: 'Studio A' } }],
    } as AdminUserWithDetails;
    render(<ImpersonateModal targetUser={userWithPH} onClose={mockOnClose} />);
    expect(screen.getByText(/Studio A/i)).toBeInTheDocument();
  });

  it('shows production_house_id fallback when production_house is null', () => {
    const userWithPH = {
      ...mockUser,
      ph_assignments: [{ production_house_id: 'ph-fallback-id', production_house: null }],
    } as unknown as AdminUserWithDetails;
    render(<ImpersonateModal targetUser={userWithPH} onClose={mockOnClose} />);
    expect(screen.getByText(/ph-fallback-id/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when X button clicked', () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.click(screen.getByTestId('x-icon').closest('button')!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    // The outer overlay div has onClick={onClose}
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not call onClose when inner card is clicked', () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    const card = document.querySelector('.bg-surface-card') as HTMLElement;
    fireEvent.click(card);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls startImpersonation when targetUser is set and Start clicked', async () => {
    mockStartImpersonation.mockResolvedValue(undefined);
    render(<ImpersonateModal targetUser={mockUser} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Start Impersonating'));
    await waitFor(() => {
      expect(mockStartImpersonation).toHaveBeenCalledWith('u1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls startRoleImpersonation for admin role', async () => {
    mockStartRoleImpersonation.mockResolvedValue(undefined);
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    // Default role is 'admin'
    fireEvent.click(screen.getByText('Start Impersonating'));
    await waitFor(() => {
      expect(mockStartRoleImpersonation).toHaveBeenCalledWith('admin', []);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('disables Start Impersonating when PH admin selected and no PHs chosen', () => {
    const noop = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({ then: vi.fn() }),
    });
    mockFrom.mockReturnValue({ select: noop });
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });
    const btn = screen.getByText('Start Impersonating').closest('button')!;
    expect(btn).toBeDisabled();
  });

  it('enables Start Impersonating for admin role (default)', () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    // admin role with no PH requirement — button should be enabled
    const btn = screen.getByText('Start Impersonating').closest('button')!;
    expect(btn).not.toBeDisabled();
  });

  it('toggles PH selection in and out', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        then: (resolve: Function) => {
          resolve({ data: [{ id: 'ph1', name: 'Studio One' }] });
        },
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });

    await waitFor(() => screen.getByText('Studio One'));

    const checkbox = screen.getByRole('checkbox');
    // Select it
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    // Deselect it
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('clears selectedPhIds when switching away from PH admin role', async () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    // Switch to PH admin then back to admin
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });
    // admin role: Start button should be enabled (selectedPhIds cleared)
    const btn = screen.getByText('Start Impersonating').closest('button')!;
    expect(btn).not.toBeDisabled();
  });

  it('shows "No production houses found" when empty list returned', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        then: (resolve: Function) => {
          resolve({ data: [] });
        },
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });

    await waitFor(() => {
      expect(screen.getByText('No production houses found')).toBeInTheDocument();
    });
  });

  it('shows super_admin option when realUser is root', () => {
    mockRealUser.mockReturnValue({ role: 'root' });
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    const values = options.map((o) => o.getAttribute('value'));
    expect(values).toContain('super_admin');
  });

  it('does not show super_admin option when realUser is not root', () => {
    mockRealUser.mockReturnValue({ role: 'super_admin' });
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    const values = options.map((o) => o.getAttribute('value'));
    expect(values).not.toContain('super_admin');
  });

  it('enables button when super_admin role is selected', () => {
    mockRealUser.mockReturnValue({ role: 'root' });
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'super_admin' } });
    const btn = screen.getByText('Start Impersonating').closest('button')!;
    expect(btn).not.toBeDisabled();
  });

  it('calls startRoleImpersonation with PH admin and selected PHs', async () => {
    mockStartRoleImpersonation.mockResolvedValue(undefined);
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        then: (resolve: Function) => {
          resolve({ data: [{ id: 'ph1', name: 'Studio One' }] });
        },
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });

    await waitFor(() => screen.getByText('Studio One'));

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('Start Impersonating'));

    await waitFor(() => {
      expect(mockStartRoleImpersonation).toHaveBeenCalledWith('production_house_admin', ['ph1']);
    });
  });

  it('handles fetch error with non-Error value in rejection handler', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        then: (_resolve: Function, reject?: Function) => {
          if (reject) reject('string-error');
        },
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });

    await waitFor(() => {
      expect(screen.getByText('Failed to load production houses')).toBeInTheDocument();
    });
  });

  it('handles fetch error when data contains an error', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        then: (resolve: Function) => {
          resolve({ data: null, error: { message: 'DB error' } });
        },
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });

    await waitFor(() => {
      expect(screen.getByText('DB error')).toBeInTheDocument();
    });
  });

  it('handles data: null response (uses empty array)', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        then: (resolve: Function) => {
          resolve({ data: null, error: null });
        },
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'production_house_admin' } });

    await waitFor(() => {
      expect(screen.getByText('No production houses found')).toBeInTheDocument();
    });
  });

  describe('production houses fetch — rejection handler regression', () => {
    it('resets phLoading on network failure via onRejected handler', async () => {
      // The .then(onFulfilled, onRejected) pattern: call onRejected to simulate failure
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          then: (_resolve: Function, reject?: Function) => {
            if (reject) reject(new Error('Network failure'));
          },
        }),
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);

      // Switch to PH admin to trigger the fetch
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'production_house_admin' } });

      // The onRejected handler should fire, set phError, and reset phLoading
      // @edge: component renders phError message (not empty-list text) when rejection fires
      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeInTheDocument();
      });
    });

    it('fetches production houses successfully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          then: (resolve: Function) => {
            resolve({ data: [{ id: 'ph1', name: 'Studio One' }] });
          },
        }),
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'production_house_admin' } });

      await waitFor(() => {
        expect(screen.getByText('Studio One')).toBeInTheDocument();
      });
    });
  });
});
