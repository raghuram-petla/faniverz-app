import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImpersonateModal } from '../ImpersonateModal';
import type { AdminUserWithDetails } from '@/lib/types';

const mockStartImpersonation = vi.fn();
const mockStartRoleImpersonation = vi.fn();

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => ({
    startImpersonation: mockStartImpersonation,
    startRoleImpersonation: mockStartRoleImpersonation,
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

  it('calls onClose when Cancel clicked', () => {
    render(<ImpersonateModal targetUser={null} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
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
