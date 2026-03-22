import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Mocks before imports ───
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseAuth = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

const mockUseAdminUserList = vi.fn();
const mockUseAdminInvitations = vi.fn();
const mockRevokeAdminMutate = vi.fn();
const mockRevokeInvitationMutate = vi.fn();
const mockUpdateRoleMutate = vi.fn();
const mockBlockAdminMutate = vi.fn();
const mockUnblockAdminMutate = vi.fn();

vi.mock('@/hooks/useAdminUsers', () => ({
  useAdminUserList: () => mockUseAdminUserList(),
  useAdminInvitations: () => mockUseAdminInvitations(),
  useRevokeAdmin: () => ({ mutate: mockRevokeAdminMutate, isPending: false }),
  useRevokeInvitation: () => ({ mutate: mockRevokeInvitationMutate, isPending: false }),
  useUpdateAdminRole: () => ({ mutate: mockUpdateRoleMutate, isPending: false }),
  useBlockAdmin: () => ({ mutate: mockBlockAdminMutate, isPending: false }),
  useUnblockAdmin: () => ({ mutate: mockUnblockAdminMutate, isPending: false }),
}));

vi.mock('@/components/users/ImpersonateModal', () => ({
  ImpersonateModal: ({
    targetUser,
    onClose,
  }: {
    targetUser: { id: string };
    onClose: () => void;
  }) => (
    <div data-testid="impersonate-modal">
      <span>Impersonate: {targetUser.id}</span>
      <button data-testid="close-impersonate" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@/components/users/BlockAdminModal', () => ({
  BlockAdminModal: ({
    target,
    onConfirm,
    onClose,
  }: {
    target: { id: string };
    onConfirm: (reason: string) => void;
    onClose: () => void;
    isPending: boolean;
  }) => (
    <div data-testid="block-modal">
      <span>Block: {target.id}</span>
      <button data-testid="confirm-block" onClick={() => onConfirm('bad behavior')}>
        Confirm
      </button>
      <button data-testid="close-block" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@/components/users/AdminsTable', () => ({
  AdminsTable: ({
    users,
    isLoading,
    onImpersonate,
    onBlock,
    onUnblock,
    onRevoke,
    onRoleChange,
  }: {
    users: Array<{ id: string; role_id: string; status: string }> | undefined;
    isLoading: boolean;
    realUserId?: string;
    isSuperAdmin: boolean;
    canManageAdmin: boolean;
    onImpersonate: (u: { id: string }) => void;
    onBlock: (u: { id: string }) => void;
    onUnblock: (userId: string) => void;
    onRevoke: (userId: string, roleId: string) => void;
    onRoleChange: (userId: string, roleId: string) => void;
    isRolePending: boolean;
    isRevokePending: boolean;
  }) => (
    <div data-testid="admins-table">
      {isLoading && <span data-testid="loading">Loading</span>}
      {users?.map((u) => (
        <div key={u.id} data-testid={`user-row-${u.id}`}>
          <span>
            {u.id} ({u.role_id})
          </span>
          <button onClick={() => onImpersonate(u)} data-testid={`impersonate-${u.id}`}>
            Impersonate
          </button>
          <button onClick={() => onBlock(u)} data-testid={`block-${u.id}`}>
            Block
          </button>
          <button onClick={() => onUnblock(u.id)} data-testid={`unblock-${u.id}`}>
            Unblock
          </button>
          <button onClick={() => onRevoke(u.id, u.role_id)} data-testid={`revoke-${u.id}`}>
            Revoke
          </button>
          <button onClick={() => onRoleChange(u.id, 'admin')} data-testid={`role-${u.id}`}>
            Change Role
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/users/InvitationsTable', () => ({
  InvitationsTable: ({
    invitations,
    isLoading,
    onRevoke,
  }: {
    invitations: Array<{ id: string }> | undefined;
    isLoading: boolean;
    onRevoke: (id: string) => void;
    isRevokePending: boolean;
  }) => (
    <div data-testid="invitations-table">
      {isLoading && <span data-testid="invites-loading">Loading invites</span>}
      {invitations?.map((inv) => (
        <div key={inv.id} data-testid={`invite-${inv.id}`}>
          <button onClick={() => onRevoke(inv.id)} data-testid={`revoke-invite-${inv.id}`}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  ),
}));

import UsersPage from '@/app/(dashboard)/users/page';

const makeUser = (id: string, roleId: string, status: 'active' | 'blocked' = 'active') => ({
  id,
  role_id: roleId,
  status,
});

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: { id: 'me', role: 'root' } });
    mockUsePermissions.mockReturnValue({
      role: 'root',
      isSuperAdmin: true,
      canManageAdmin: true,
    });
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('user-1', 'admin'), makeUser('user-2', 'super_admin')],
      isLoading: false,
    });
    mockUseAdminInvitations.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders Admins tab by default', () => {
    render(<UsersPage />);
    expect(screen.getByTestId('admins-table')).toBeInTheDocument();
  });

  it('renders status filter buttons (active, blocked, all)', () => {
    render(<UsersPage />);
    expect(screen.getByRole('button', { name: 'active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'blocked' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'all' })).toBeInTheDocument();
  });

  it('renders Invite Admin link for super admins', () => {
    render(<UsersPage />);
    expect(screen.getByText('Invite Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Invite Admin/ })).toHaveAttribute(
      'href',
      '/users/invite',
    );
  });

  it('hides Invite Admin link for non-super admins', () => {
    mockUsePermissions.mockReturnValue({
      role: 'admin',
      isSuperAdmin: false,
      canManageAdmin: false,
    });
    render(<UsersPage />);
    expect(screen.queryByText('Invite Admin')).not.toBeInTheDocument();
  });

  it('switches to Invitations tab', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByText('Invitations'));
    expect(screen.getByTestId('invitations-table')).toBeInTheDocument();
    expect(screen.queryByTestId('admins-table')).not.toBeInTheDocument();
  });

  it('hides status filter when on Invitations tab', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByText('Invitations'));
    expect(screen.queryByRole('button', { name: 'active' })).not.toBeInTheDocument();
  });

  it('renders users from hook data', () => {
    render(<UsersPage />);
    expect(screen.getByTestId('user-row-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('user-row-user-2')).toBeInTheDocument();
  });

  it('filters out users with higher rank than current user', () => {
    mockUsePermissions.mockReturnValue({
      role: 'admin',
      isSuperAdmin: false,
      canManageAdmin: true,
    });
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u-root', 'root'), makeUser('u-admin', 'admin')],
      isLoading: false,
    });
    render(<UsersPage />);
    // root rank > admin rank, so root user should be hidden
    expect(screen.queryByTestId('user-row-u-root')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-row-u-admin')).toBeInTheDocument();
  });

  it('filters by active status by default', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u1', 'admin', 'active'), makeUser('u2', 'admin', 'blocked')],
      isLoading: false,
    });
    render(<UsersPage />);
    expect(screen.getByTestId('user-row-u1')).toBeInTheDocument();
    expect(screen.queryByTestId('user-row-u2')).not.toBeInTheDocument();
  });

  it('shows blocked users when "blocked" filter selected', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u1', 'admin', 'active'), makeUser('u2', 'admin', 'blocked')],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'blocked' }));
    expect(screen.queryByTestId('user-row-u1')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-row-u2')).toBeInTheDocument();
  });

  it('shows all users when "all" filter selected', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u1', 'admin', 'active'), makeUser('u2', 'admin', 'blocked')],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'all' }));
    expect(screen.getByTestId('user-row-u1')).toBeInTheDocument();
    expect(screen.getByTestId('user-row-u2')).toBeInTheDocument();
  });

  it('opens ImpersonateModal when impersonate is triggered', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('impersonate-user-1'));
    expect(screen.getByTestId('impersonate-modal')).toBeInTheDocument();
  });

  it('closes ImpersonateModal on close', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('impersonate-user-1'));
    fireEvent.click(screen.getByTestId('close-impersonate'));
    expect(screen.queryByTestId('impersonate-modal')).not.toBeInTheDocument();
  });

  it('opens BlockAdminModal when block is triggered', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('block-user-1'));
    expect(screen.getByTestId('block-modal')).toBeInTheDocument();
  });

  it('closes BlockAdminModal on close', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('block-user-1'));
    fireEvent.click(screen.getByTestId('close-block'));
    expect(screen.queryByTestId('block-modal')).not.toBeInTheDocument();
  });

  it('calls blockAdminMutate on confirm block', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('block-user-1'));
    fireEvent.click(screen.getByTestId('confirm-block'));
    expect(mockBlockAdminMutate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', reason: 'bad behavior' }),
      expect.any(Object),
    );
  });

  it('alerts when trying to revoke the last root user', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u-root', 'root')],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('revoke-u-root'));
    expect(window.alert).toHaveBeenCalledWith('Cannot revoke the last root user.');
    expect(mockRevokeAdminMutate).not.toHaveBeenCalled();
  });

  it('alerts when trying to revoke the last super_admin', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u-sa', 'super_admin')],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('revoke-u-sa'));
    expect(window.alert).toHaveBeenCalledWith('Cannot revoke the last super admin.');
  });

  it('calls revokeAdmin.mutate on confirmed revoke', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [
        makeUser('u1', 'admin'),
        makeUser('u2', 'root'), // need 2 roots to allow revoke
        makeUser('u3', 'root'),
      ],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('revoke-u1'));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockRevokeAdminMutate).toHaveBeenCalledWith('u1', expect.any(Object));
  });

  it('calls unblockAdmin.mutate after confirm', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('unblock-user-1'));
    expect(window.confirm).toHaveBeenCalledWith(
      'Unblock this admin? They will regain previous access.',
    );
    expect(mockUnblockAdminMutate).toHaveBeenCalledWith('user-1', expect.any(Object));
  });

  it('does not unblock when confirm is cancelled', () => {
    window.confirm = vi.fn(() => false);
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('unblock-user-1'));
    expect(mockUnblockAdminMutate).not.toHaveBeenCalled();
  });

  it('calls updateRole.mutate on role change', () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('role-user-1'));
    expect(mockUpdateRoleMutate).toHaveBeenCalledWith(
      { userId: 'user-1', roleId: 'admin' },
      expect.any(Object),
    );
  });

  it('revokes invitation after confirm', () => {
    mockUseAdminInvitations.mockReturnValue({
      data: [{ id: 'invite-1' }],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByText('Invitations'));
    fireEvent.click(screen.getByTestId('revoke-invite-invite-1'));
    expect(window.confirm).toHaveBeenCalledWith('Revoke this invitation?');
    expect(mockRevokeInvitationMutate).toHaveBeenCalledWith('invite-1', expect.any(Object));
  });

  it('alerts on block of last root user', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u-root', 'root')],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('block-u-root'));
    fireEvent.click(screen.getByTestId('confirm-block'));
    expect(window.alert).toHaveBeenCalledWith('Cannot block the last active root user.');
    expect(mockBlockAdminMutate).not.toHaveBeenCalled();
  });

  it('alerts on block of last super_admin', () => {
    mockUseAdminUserList.mockReturnValue({
      data: [makeUser('u-sa', 'super_admin')],
      isLoading: false,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByTestId('block-u-sa'));
    fireEvent.click(screen.getByTestId('confirm-block'));
    expect(window.alert).toHaveBeenCalledWith('Cannot block the last active super admin.');
  });
});
