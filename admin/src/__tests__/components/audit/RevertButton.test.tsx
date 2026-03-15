import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RevertButton } from '@/components/audit/RevertButton';

const mockMutate = vi.fn();
const mockMutation: {
  mutate: typeof mockMutate;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
} = {
  mutate: mockMutate,
  isPending: false,
  isError: false,
  error: null,
};

vi.mock('@/hooks/useAdminAudit', () => ({
  useRevertAuditEntry: () => mockMutation,
}));

const defaultProps = {
  entryId: 'abc',
  action: 'update',
  revertedAt: null,
  revertedByName: null,
};

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('RevertButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation.isPending = false;
    mockMutation.isError = false;
    mockMutation.error = null;
  });

  it('renders the Revert button when not reverted', () => {
    renderWithProviders(<RevertButton {...defaultProps} />);
    expect(screen.getByText('Revert')).toBeDefined();
  });

  it('shows reverted status with admin name and timestamp', () => {
    renderWithProviders(
      <RevertButton
        {...defaultProps}
        revertedAt="2026-03-15T01:00:00Z"
        revertedByName="Raghuram P"
      />,
    );
    expect(screen.getByText(/Reverted/)).toBeDefined();
    expect(screen.getByText(/Raghuram P/)).toBeDefined();
    expect(screen.queryByText('Revert')).toBeNull();
  });

  it('shows reverted status without admin name when null', () => {
    renderWithProviders(<RevertButton {...defaultProps} revertedAt="2026-03-15T01:00:00Z" />);
    expect(screen.getByText(/Reverted/)).toBeDefined();
    expect(screen.queryByText('Revert')).toBeNull();
  });

  it('does not show confirm/cancel when reverted', () => {
    renderWithProviders(<RevertButton {...defaultProps} revertedAt="2026-03-15T01:00:00Z" />);
    expect(screen.queryByText('Confirm')).toBeNull();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('shows confirmation UI when clicked', () => {
    renderWithProviders(<RevertButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Revert'));
    expect(screen.getByText('Restore previous values?')).toBeDefined();
    expect(screen.getByText('Confirm')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('shows correct description for create action', () => {
    renderWithProviders(<RevertButton {...defaultProps} action="create" />);
    fireEvent.click(screen.getByText('Revert'));
    expect(screen.getByText('Delete this entity?')).toBeDefined();
  });

  it('shows correct description for delete action', () => {
    renderWithProviders(<RevertButton {...defaultProps} action="delete" />);
    fireEvent.click(screen.getByText('Revert'));
    expect(screen.getByText('Re-create this entity?')).toBeDefined();
  });

  it('calls mutate with entry ID on confirm', () => {
    renderWithProviders(<RevertButton {...defaultProps} entryId="abc-123" />);
    fireEvent.click(screen.getByText('Revert'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(mockMutate).toHaveBeenCalledWith('abc-123', expect.any(Object));
  });

  it('hides confirmation on cancel', () => {
    renderWithProviders(<RevertButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Revert'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Revert')).toBeDefined();
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('shows Reverting text when pending', () => {
    mockMutation.isPending = true;
    renderWithProviders(<RevertButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Revert'));
    expect(screen.getByText('Reverting...')).toBeDefined();
  });

  it('disables confirm button when pending', () => {
    mockMutation.isPending = true;
    renderWithProviders(<RevertButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Revert'));
    const btn = screen.getByText('Reverting...');
    expect(btn.closest('button')?.disabled).toBe(true);
  });

  it('shows error message when mutation fails', () => {
    mockMutation.isError = true;
    mockMutation.error = new Error('Something went wrong');
    renderWithProviders(<RevertButton {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('stops click propagation on revert button', () => {
    const parentClick = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <div onClick={parentClick}>
          <RevertButton {...defaultProps} />
        </div>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText('Revert'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
