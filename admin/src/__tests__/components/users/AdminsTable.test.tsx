import { render, screen, fireEvent } from '@testing-library/react';
import { AdminsTable } from '@/components/users/AdminsTable';
import type { AdminsTableProps } from '@/components/users/AdminsTable';
import type { AdminUserWithDetails } from '@/lib/types';

vi.mock('@/components/users/LanguageAssignments', () => ({
  LanguageAssignments: ({ userId }: { userId: string }) => (
    <div data-testid={`lang-assignments-${userId}`}>Languages</div>
  ),
}));

vi.mock('lucide-react', () => ({
  Loader2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="loader-icon" {...props} />,
  Eye: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="eye-icon" {...props} />,
  Ban: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="ban-icon" {...props} />,
  ShieldCheck: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="shield-check-icon" {...props} />
  ),
  Trash2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="trash-icon" {...props} />,
}));

vi.mock('@/lib/utils', () => ({
  formatDateTime: (d: string) => d,
}));

const mockGetImageUrl = vi.fn((url: string, size: string) => {
  // Mimic the real getImageUrl by inserting size suffix before extension
  const dot = url.lastIndexOf('.');
  if (dot === -1) return `${url}_${size}`;
  return `${url.slice(0, dot)}_${size}${url.slice(dot)}`;
});
vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string, size: string) => mockGetImageUrl(url, size),
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

const defaultProps: AdminsTableProps = {
  users: [],
  isLoading: false,
  realUserId: 'current-user',
  isSuperAdmin: true,
  canManageAdmin: () => true,
  onImpersonate: vi.fn(),
  onBlock: vi.fn(),
  onUnblock: vi.fn(),
  onRevoke: vi.fn(),
  onRoleChange: vi.fn(),
  isRolePending: false,
  isRevokePending: false,
};

function renderTable(overrides: Partial<AdminsTableProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  // Reset mocks if they were replaced
  for (const key of [
    'onImpersonate',
    'onBlock',
    'onUnblock',
    'onRevoke',
    'onRoleChange',
  ] as const) {
    if (overrides[key] === undefined && typeof props[key] === 'function') {
      (props[key] as ReturnType<typeof vi.fn>).mockClear?.();
    }
  }
  return render(<AdminsTable {...props} />);
}

describe('AdminsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm for role change tests
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner when isLoading', () => {
    renderTable({ isLoading: true });
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders user rows with name, email, and role badge', () => {
    const users = [
      makeUser({ id: 'u1', display_name: 'Alice', email: 'alice@test.com', role_id: 'admin' }),
      makeUser({ id: 'u2', display_name: 'Bob', email: 'bob@test.com', role_id: 'super_admin' }),
    ];
    renderTable({ users });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
  });

  it('shows "Active" status for active users', () => {
    renderTable({ users: [makeUser({ status: 'active' })] });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Blocked" status for blocked users', () => {
    renderTable({
      users: [makeUser({ status: 'blocked', blocked_reason: 'policy violation' })],
    });
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows role dropdown for non-self users when viewer is super admin', () => {
    renderTable({
      users: [makeUser({ id: 'other-user', role_id: 'admin' })],
      realUserId: 'current-user',
      isSuperAdmin: true,
    });
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('admin');
  });

  it('shows role badge (not dropdown) for self user', () => {
    renderTable({
      users: [makeUser({ id: 'current-user', role_id: 'super_admin' })],
      realUserId: 'current-user',
      isSuperAdmin: true,
    });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('shows role badge (not dropdown) for non-super-admin viewers', () => {
    renderTable({
      users: [makeUser({ id: 'other-user', role_id: 'admin' })],
      realUserId: 'current-user',
      isSuperAdmin: false,
      canManageAdmin: () => false,
    });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows Block button for active users that canManageAdmin', () => {
    const onBlock = vi.fn();
    renderTable({
      users: [makeUser({ id: 'other-user', status: 'active', role_id: 'admin' })],
      canManageAdmin: () => true,
      onBlock,
    });
    const blockButton = screen.getByTitle('Block');
    expect(blockButton).toBeInTheDocument();
  });

  it('shows Unblock button for blocked users that canManageAdmin', () => {
    const onUnblock = vi.fn();
    renderTable({
      users: [makeUser({ id: 'other-user', status: 'blocked', role_id: 'admin' })],
      canManageAdmin: () => true,
      onUnblock,
    });
    const unblockButton = screen.getByTitle('Unblock');
    expect(unblockButton).toBeInTheDocument();
  });

  it('shows Revoke button when canManageAdmin returns true', () => {
    renderTable({
      users: [makeUser({ id: 'other-user' })],
      isSuperAdmin: true,
      canManageAdmin: () => true,
      realUserId: 'current-user',
    });
    expect(screen.getByTitle('Revoke access')).toBeInTheDocument();
  });

  it('does not show Revoke button when canManageAdmin returns false', () => {
    renderTable({
      users: [makeUser({ id: 'other-user' })],
      isSuperAdmin: false,
      canManageAdmin: () => false,
      realUserId: 'current-user',
    });
    expect(screen.queryByTitle('Revoke access')).not.toBeInTheDocument();
  });

  it('shows Impersonate button only for super admins on active non-self users', () => {
    renderTable({
      users: [makeUser({ id: 'other-user', status: 'active' })],
      isSuperAdmin: true,
      realUserId: 'current-user',
    });
    expect(screen.getByTitle('Impersonate')).toBeInTheDocument();
  });

  it('does not show Impersonate button for non-super-admins', () => {
    renderTable({
      users: [makeUser({ id: 'other-user', status: 'active' })],
      isSuperAdmin: false,
      realUserId: 'current-user',
    });
    expect(screen.queryByTitle('Impersonate')).not.toBeInTheDocument();
  });

  it('does not show Impersonate button for blocked users', () => {
    renderTable({
      users: [makeUser({ id: 'other-user', status: 'blocked' })],
      isSuperAdmin: true,
      realUserId: 'current-user',
    });
    expect(screen.queryByTitle('Impersonate')).not.toBeInTheDocument();
  });

  it('calls onBlock when Block button is clicked', () => {
    const onBlock = vi.fn();
    const user = makeUser({ id: 'other-user', status: 'active' });
    renderTable({
      users: [user],
      canManageAdmin: () => true,
      onBlock,
    });
    fireEvent.click(screen.getByTitle('Block'));
    expect(onBlock).toHaveBeenCalledWith(user);
  });

  it('calls onUnblock when Unblock button is clicked', () => {
    const onUnblock = vi.fn();
    renderTable({
      users: [makeUser({ id: 'other-user', status: 'blocked' })],
      canManageAdmin: () => true,
      onUnblock,
    });
    fireEvent.click(screen.getByTitle('Unblock'));
    expect(onUnblock).toHaveBeenCalledWith('other-user');
  });

  it('calls onRevoke when Revoke button is clicked', () => {
    const onRevoke = vi.fn();
    renderTable({
      users: [makeUser({ id: 'other-user', role_id: 'admin' })],
      isSuperAdmin: true,
      canManageAdmin: () => true,
      realUserId: 'current-user',
      onRevoke,
    });
    fireEvent.click(screen.getByTitle('Revoke access'));
    expect(onRevoke).toHaveBeenCalledWith('other-user', 'admin');
  });

  it('shows empty state when no users', () => {
    renderTable({ users: [] });
    expect(screen.getByText('No admin users found')).toBeInTheDocument();
  });

  it('shows empty state when users is undefined', () => {
    renderTable({ users: undefined });
    expect(screen.getByText('No admin users found')).toBeInTheDocument();
  });

  it('does not show action buttons for self user', () => {
    renderTable({
      users: [makeUser({ id: 'current-user', status: 'active' })],
      realUserId: 'current-user',
      isSuperAdmin: true,
    });
    expect(screen.queryByTitle('Block')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Impersonate')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Revoke access')).not.toBeInTheDocument();
  });

  it('shows "Unnamed" when display_name is null', () => {
    renderTable({
      users: [makeUser({ display_name: null })],
    });
    expect(screen.getByText('Unnamed')).toBeInTheDocument();
  });

  it('does not show Block button when canManageAdmin returns false', () => {
    renderTable({
      users: [makeUser({ id: 'other-user', status: 'active', role_id: 'super_admin' })],
      canManageAdmin: () => false,
    });
    expect(screen.queryByTitle('Block')).not.toBeInTheDocument();
  });

  // Impersonate hierarchy tests — role hierarchy: root > super_admin > admin > PH admin
  // A user can only impersonate roles BELOW them, never at same level or above.
  describe('impersonate hierarchy', () => {
    it('super admin cannot impersonate other super admins', () => {
      renderTable({
        users: [makeUser({ id: 'other-sa', role_id: 'super_admin', status: 'active' })],
        isSuperAdmin: true,
        canManageAdmin: (role) => role === 'admin' || role === 'production_house_admin',
        realUserId: 'current-user',
      });
      expect(screen.queryByTitle('Impersonate')).not.toBeInTheDocument();
    });

    it('super admin can impersonate admin users', () => {
      renderTable({
        users: [makeUser({ id: 'admin-user', role_id: 'admin', status: 'active' })],
        isSuperAdmin: true,
        canManageAdmin: (role) => role === 'admin' || role === 'production_house_admin',
        realUserId: 'current-user',
      });
      expect(screen.getByTitle('Impersonate')).toBeInTheDocument();
    });

    it('super admin can impersonate PH admin users', () => {
      renderTable({
        users: [makeUser({ id: 'ph-user', role_id: 'production_house_admin', status: 'active' })],
        isSuperAdmin: true,
        canManageAdmin: (role) => role === 'admin' || role === 'production_house_admin',
        realUserId: 'current-user',
      });
      expect(screen.getByTitle('Impersonate')).toBeInTheDocument();
    });

    it('root can impersonate super admin users', () => {
      renderTable({
        users: [makeUser({ id: 'sa-user', role_id: 'super_admin', status: 'active' })],
        isSuperAdmin: true,
        canManageAdmin: (role) => role !== 'root',
        realUserId: 'current-user',
      });
      expect(screen.getByTitle('Impersonate')).toBeInTheDocument();
    });

    it('root cannot impersonate other root users', () => {
      renderTable({
        users: [makeUser({ id: 'other-root', role_id: 'root', status: 'active' })],
        isSuperAdmin: true,
        canManageAdmin: (role) => role !== 'root',
        realUserId: 'current-user',
      });
      expect(screen.queryByTitle('Impersonate')).not.toBeInTheDocument();
    });
  });

  // Avatar rendering tests
  describe('avatar rendering', () => {
    it('renders avatar image when avatar_url is present', () => {
      renderTable({
        users: [
          makeUser({ avatar_url: 'https://cdn.example.com/avatar.jpg', display_name: 'Alice' }),
        ],
      });
      const img = screen.getByAltText('Alice');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar_sm.jpg');
    });

    it('renders initials fallback when avatar_url is null', () => {
      renderTable({
        users: [makeUser({ avatar_url: null, display_name: 'Bob' })],
      });
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('renders "?" when avatar_url and display_name are both null', () => {
      renderTable({
        users: [makeUser({ avatar_url: null, display_name: null })],
      });
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  // Root role tests
  describe('root role display', () => {
    it('shows root as static badge with amber styling, never as dropdown', () => {
      renderTable({
        users: [makeUser({ id: 'root-user', role_id: 'root' })],
        isSuperAdmin: true,
        realUserId: 'current-user',
      });
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText('Root')).toBeInTheDocument();
    });

    it('does not include root in role dropdown options', () => {
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'admin' })],
        isSuperAdmin: true,
        realUserId: 'current-user',
      });
      const select = screen.getByRole('combobox');
      const options = select.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.getAttribute('value'));
      expect(values).not.toContain('root');
      expect(values).toContain('super_admin');
      expect(values).toContain('admin');
      expect(values).toContain('production_house_admin');
    });
  });

  describe('role change', () => {
    it('calls onRoleChange when role is changed and confirmed', () => {
      const onRoleChange = vi.fn();
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'admin' })],
        isSuperAdmin: true,
        realUserId: 'current-user',
        onRoleChange,
      });
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'super_admin' } });
      expect(onRoleChange).toHaveBeenCalledWith('other-user', 'super_admin');
    });

    it('does not call onRoleChange when confirm is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const onRoleChange = vi.fn();
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'admin' })],
        isSuperAdmin: true,
        realUserId: 'current-user',
        onRoleChange,
      });
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'super_admin' } });
      expect(onRoleChange).not.toHaveBeenCalled();
    });

    it('disables role dropdown when isRolePending', () => {
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'admin' })],
        isSuperAdmin: true,
        realUserId: 'current-user',
        isRolePending: true,
      });
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('disables role dropdown when user is blocked', () => {
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'admin', status: 'blocked' })],
        isSuperAdmin: true,
        realUserId: 'current-user',
      });
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('impersonate callback', () => {
    it('calls onImpersonate when impersonate button is clicked', () => {
      const onImpersonate = vi.fn();
      const user = makeUser({ id: 'other-user', status: 'active', role_id: 'admin' });
      renderTable({
        users: [user],
        isSuperAdmin: true,
        realUserId: 'current-user',
        onImpersonate,
      });
      fireEvent.click(screen.getByTitle('Impersonate'));
      expect(onImpersonate).toHaveBeenCalledWith(user);
    });
  });

  describe('production house assignments', () => {
    it('shows PH names when ph_assignments has entries', () => {
      renderTable({
        users: [
          makeUser({
            id: 'other-user',
            ph_assignments: [
              { production_house_id: 'ph-1', production_house: { name: 'Mythri' } } as never,
            ],
          }),
        ],
      });
      expect(screen.getByText('Mythri')).toBeInTheDocument();
    });

    it('shows dash when no PH assignments', () => {
      renderTable({
        users: [makeUser({ id: 'other-user', ph_assignments: [] })],
      });
      // The "—" dash in the PHs column
      const cells = screen.getAllByText('—');
      expect(cells.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('language assignments', () => {
    it('shows language assignments for admin role users when isSuperAdmin', () => {
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'admin' })],
        isSuperAdmin: true,
      });
      expect(screen.getByTestId('lang-assignments-other-user')).toBeInTheDocument();
    });

    it('shows dash for non-admin role users', () => {
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'super_admin' })],
        isSuperAdmin: true,
      });
      expect(screen.queryByTestId('lang-assignments-other-user')).not.toBeInTheDocument();
    });
  });

  describe('revoke pending', () => {
    it('disables Revoke button when isRevokePending', () => {
      renderTable({
        users: [makeUser({ id: 'other-user', role_id: 'admin' })],
        isSuperAdmin: true,
        realUserId: 'current-user',
        isRevokePending: true,
      });
      const revokeBtn = screen.getByTitle('Revoke access');
      expect(revokeBtn).toBeDisabled();
    });
  });

  describe('table headers', () => {
    it('renders all column headers', () => {
      renderTable();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('PHs')).toBeInTheDocument();
      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Since')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('avatar and PH fallback branches', () => {
    it('falls back to raw avatar_url when getImageUrl returns null', () => {
      mockGetImageUrl.mockReturnValueOnce(null as unknown as string);
      renderTable({
        users: [makeUser({ avatar_url: 'https://raw.example.com/avatar.jpg' })],
      });
      const img = document.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://raw.example.com/avatar.jpg');
    });

    it('shows production_house_id when production_house name is missing', () => {
      renderTable({
        users: [
          makeUser({
            ph_assignments: [
              { production_house_id: 'orphan-ph-id', production_house: undefined } as never,
            ],
          }),
        ],
      });
      expect(screen.getByText('orphan-ph-id')).toBeInTheDocument();
    });
  });
});
