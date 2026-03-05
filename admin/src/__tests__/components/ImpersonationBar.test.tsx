import { render, screen, fireEvent } from '@testing-library/react';
import { ImpersonationBar } from '@/components/layout/ImpersonationBar';
import type { AdminUser } from '@/lib/types';

const { mockStopImpersonation, mockUseImpersonation } = vi.hoisted(() => ({
  mockStopImpersonation: vi.fn(),
  mockUseImpersonation: vi.fn(),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => mockUseImpersonation(),
}));

vi.mock('lucide-react', () => ({
  Eye: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="eye-icon" {...props} />,
  X: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="x-icon" {...props} />,
}));

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-1',
    display_name: 'John Doe',
    email: 'john@example.com',
    is_admin: true,
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    role: 'admin',
    productionHouseIds: [],
    ...overrides,
  };
}

describe('ImpersonationBar', () => {
  beforeEach(() => {
    mockStopImpersonation.mockClear();
    mockUseImpersonation.mockReturnValue({
      isImpersonating: true,
      effectiveUser: makeUser(),
      stopImpersonation: mockStopImpersonation,
    });
  });

  it('returns null when not impersonating', () => {
    mockUseImpersonation.mockReturnValue({
      isImpersonating: false,
      effectiveUser: makeUser(),
      stopImpersonation: mockStopImpersonation,
    });

    const { container } = render(<ImpersonationBar />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when effectiveUser is null', () => {
    mockUseImpersonation.mockReturnValue({
      isImpersonating: true,
      effectiveUser: null,
      stopImpersonation: mockStopImpersonation,
    });

    const { container } = render(<ImpersonationBar />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the impersonated user display name and role label', () => {
    render(<ImpersonationBar />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('(Admin)')).toBeInTheDocument();
    expect(screen.getByText(/impersonating/i)).toBeInTheDocument();
  });

  it('shows email as fallback when no display_name', () => {
    mockUseImpersonation.mockReturnValue({
      isImpersonating: true,
      effectiveUser: makeUser({ display_name: null, email: 'jane@example.com' }),
      stopImpersonation: mockStopImpersonation,
    });

    render(<ImpersonationBar />);

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows "Unknown" when no display_name or email', () => {
    mockUseImpersonation.mockReturnValue({
      isImpersonating: true,
      effectiveUser: makeUser({ display_name: null, email: null }),
      stopImpersonation: mockStopImpersonation,
    });

    render(<ImpersonationBar />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('calls stopImpersonation when Stop button is clicked', () => {
    render(<ImpersonationBar />);

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(mockStopImpersonation).toHaveBeenCalledTimes(1);
  });

  it.each([
    { role: 'super_admin' as const, label: 'Super Admin' },
    { role: 'admin' as const, label: 'Admin' },
    { role: 'production_house_admin' as const, label: 'PH Admin' },
  ])('shows correct role label "$label" for role "$role"', ({ role, label }) => {
    mockUseImpersonation.mockReturnValue({
      isImpersonating: true,
      effectiveUser: makeUser({ role }),
      stopImpersonation: mockStopImpersonation,
    });

    render(<ImpersonationBar />);

    expect(screen.getByText(`(${label})`)).toBeInTheDocument();
  });

  it('renders the Eye icon', () => {
    render(<ImpersonationBar />);
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
  });
});
