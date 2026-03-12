import { render, screen, fireEvent } from '@testing-library/react';
import { BlockAdminModal } from '@/components/users/BlockAdminModal';
import type { AdminUserWithDetails } from '@/lib/types';

vi.mock('lucide-react', () => ({
  Ban: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="ban-icon" {...props} />,
  X: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="x-icon" {...props} />,
}));

function makeUser(overrides: Partial<AdminUserWithDetails> = {}): AdminUserWithDetails {
  return {
    id: 'user-1',
    display_name: 'Test Admin',
    email: 'admin@example.com',
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

describe('BlockAdminModal', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders target admin display_name in the message', () => {
    render(
      <BlockAdminModal
        target={makeUser({ display_name: 'Alice' })}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders target admin email when display_name is null', () => {
    render(
      <BlockAdminModal
        target={makeUser({ display_name: null, email: 'bob@example.com' })}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('renders reason textarea', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    expect(screen.getByPlaceholderText(/why is this admin being blocked/i)).toBeInTheDocument();
  });

  it('block button is disabled when reason is empty', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    const blockButton = screen.getByRole('button', { name: /block admin/i });
    expect(blockButton).toBeDisabled();
  });

  it('block button is disabled when isPending is true', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={true}
      />,
    );
    const textarea = screen.getByPlaceholderText(/why is this admin being blocked/i);
    fireEvent.change(textarea, { target: { value: 'Violation of policy' } });
    const blockButton = screen.getByRole('button', { name: /blocking/i });
    expect(blockButton).toBeDisabled();
  });

  it('shows "Blocking..." text when isPending', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={true}
      />,
    );
    expect(screen.getByText(/blocking/i)).toBeInTheDocument();
  });

  it('calls onConfirm with reason when Block button is clicked', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    const textarea = screen.getByPlaceholderText(/why is this admin being blocked/i);
    fireEvent.change(textarea, { target: { value: 'Security breach' } });
    const blockButton = screen.getByRole('button', { name: /block admin/i });
    fireEvent.click(blockButton);
    expect(onConfirm).toHaveBeenCalledWith('Security breach');
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    const xIcon = screen.getByTestId('x-icon');
    fireEvent.click(xIcon.closest('button')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('block button becomes enabled when reason is typed', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    const blockButton = screen.getByRole('button', { name: /block admin/i });
    expect(blockButton).toBeDisabled();
    const textarea = screen.getByPlaceholderText(/why is this admin being blocked/i);
    fireEvent.change(textarea, { target: { value: 'Bad behavior' } });
    expect(blockButton).toBeEnabled();
  });

  it('block button stays disabled when reason is whitespace only', () => {
    render(
      <BlockAdminModal
        target={makeUser()}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    );
    const textarea = screen.getByPlaceholderText(/why is this admin being blocked/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    const blockButton = screen.getByRole('button', { name: /block admin/i });
    expect(blockButton).toBeDisabled();
  });
});
