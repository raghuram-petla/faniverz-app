import { render, screen } from '@testing-library/react';
import { PermissionGate } from '@/components/common/PermissionGate';

const mockUsePermissions = vi.fn();

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

function makePermissions(overrides: Record<string, unknown> = {}) {
  return {
    isSuperAdmin: false,
    canViewPage: vi.fn(() => false),
    canCreate: vi.fn(() => false),
    canUpdate: vi.fn(() => false),
    canDelete: vi.fn(() => false),
    ...overrides,
  };
}

describe('PermissionGate', () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue(makePermissions());
  });

  it('renders children when superAdminOnly=true and user is super admin', () => {
    mockUsePermissions.mockReturnValue(makePermissions({ isSuperAdmin: true }));

    render(
      <PermissionGate superAdminOnly>
        <span>Secret content</span>
      </PermissionGate>,
    );

    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('renders fallback when superAdminOnly=true and user is not super admin', () => {
    mockUsePermissions.mockReturnValue(makePermissions({ isSuperAdmin: false }));

    render(
      <PermissionGate superAdminOnly fallback={<span>No access</span>}>
        <span>Secret content</span>
      </PermissionGate>,
    );

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  it('renders children when page check passes', () => {
    mockUsePermissions.mockReturnValue(makePermissions({ canViewPage: vi.fn(() => true) }));

    render(
      <PermissionGate page="movies">
        <span>Movies page</span>
      </PermissionGate>,
    );

    expect(screen.getByText('Movies page')).toBeInTheDocument();
  });

  it('renders fallback when page check fails', () => {
    mockUsePermissions.mockReturnValue(makePermissions({ canViewPage: vi.fn(() => false) }));

    render(
      <PermissionGate page="users" fallback={<span>Denied</span>}>
        <span>Users page</span>
      </PermissionGate>,
    );

    expect(screen.queryByText('Users page')).not.toBeInTheDocument();
    expect(screen.getByText('Denied')).toBeInTheDocument();
  });

  it('renders children when entity create check passes', () => {
    mockUsePermissions.mockReturnValue(makePermissions({ canCreate: vi.fn(() => true) }));

    render(
      <PermissionGate entity="movie" action="create">
        <button>Add Movie</button>
      </PermissionGate>,
    );

    expect(screen.getByText('Add Movie')).toBeInTheDocument();
  });

  it('renders fallback when entity create check fails', () => {
    mockUsePermissions.mockReturnValue(makePermissions({ canCreate: vi.fn(() => false) }));

    render(
      <PermissionGate entity="movie" action="create" fallback={<span>Cannot create</span>}>
        <button>Add Movie</button>
      </PermissionGate>,
    );

    expect(screen.queryByText('Add Movie')).not.toBeInTheDocument();
    expect(screen.getByText('Cannot create')).toBeInTheDocument();
  });

  it('uses update as the default action for entity checks', () => {
    const canUpdate = vi.fn(() => true);
    mockUsePermissions.mockReturnValue(makePermissions({ canUpdate }));

    render(
      <PermissionGate entity="actor">
        <span>Edit actor</span>
      </PermissionGate>,
    );

    expect(canUpdate).toHaveBeenCalledWith('actor', undefined);
    expect(screen.getByText('Edit actor')).toBeInTheDocument();
  });

  it('renders fallback as null by default when no permission', () => {
    mockUsePermissions.mockReturnValue(makePermissions({ canViewPage: vi.fn(() => false) }));

    const { container } = render(
      <PermissionGate page="audit">
        <span>Audit log</span>
      </PermissionGate>,
    );

    expect(screen.queryByText('Audit log')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });
});
