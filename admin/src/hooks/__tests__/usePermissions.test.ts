import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockEffectiveUser = vi.fn();

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => mockEffectiveUser(),
}));

import { usePermissions } from '@/hooks/usePermissions';

function makeUser(role: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    role,
    productionHouseIds: [],
    languageCodes: [],
    ...overrides,
  };
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null role when user is null', () => {
    mockEffectiveUser.mockReturnValue(null);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.role).toBeNull();
    expect(result.current.canViewPage('dashboard')).toBe(false);
    expect(result.current.canCreate('movie')).toBe(false);
    expect(result.current.canUpdate('movie')).toBe(false);
    expect(result.current.canDeleteChild()).toBe(false);
    expect(result.current.canAccessLanguage('te')).toBe(false);
    expect(result.current.canManageAdmin('viewer')).toBe(false);
  });

  describe('root role', () => {
    beforeEach(() => {
      mockEffectiveUser.mockReturnValue(makeUser('root'));
    });

    it('has all permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isRoot).toBe(true);
      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isReadOnly).toBe(false);
      expect(result.current.canViewPage('users')).toBe(true);
      expect(result.current.canCreate('movie')).toBe(true);
      expect(result.current.canUpdate('movie')).toBe(true);
      expect(result.current.canDeleteTopLevel()).toBe(true);
      expect(result.current.canDeleteChild()).toBe(true);
      expect(result.current.canAccessLanguage('te')).toBe(true);
      expect(result.current.auditScope).toBe('all');
    });

    it('can manage all roles except root', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('root')).toBe(false);
      expect(result.current.canManageAdmin('super_admin')).toBe(true);
      expect(result.current.canManageAdmin('admin')).toBe(true);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(true);
      expect(result.current.canManageAdmin('viewer')).toBe(true);
    });
  });

  describe('super_admin role', () => {
    beforeEach(() => {
      mockEffectiveUser.mockReturnValue(makeUser('super_admin'));
    });

    it('has correct permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isRoot).toBe(false);
      expect(result.current.canDeleteTopLevel()).toBe(true);
    });

    it('can manage admin and PH admin but not super_admin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('super_admin')).toBe(false);
      expect(result.current.canManageAdmin('admin')).toBe(true);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(true);
    });
  });

  describe('admin role', () => {
    beforeEach(() => {
      mockEffectiveUser.mockReturnValue(makeUser('admin', { languageCodes: ['te', 'hi'] }));
    });

    it('has correct flags', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isReadOnly).toBe(false);
      expect(result.current.canDeleteTopLevel()).toBe(false);
      expect(result.current.canDeleteChild()).toBe(true);
      expect(result.current.auditScope).toBe('own');
    });

    it('canAccessLanguage checks language codes', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(true);
      expect(result.current.canAccessLanguage('hi')).toBe(true);
      expect(result.current.canAccessLanguage('en')).toBe(false);
      expect(result.current.canAccessLanguage(null)).toBe(true); // null = unrestricted
    });

    it('canAccessLanguage returns true when no language codes assigned', () => {
      mockEffectiveUser.mockReturnValue(makeUser('admin', { languageCodes: [] }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('en')).toBe(true);
    });

    it('can only manage PH admin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('admin')).toBe(false);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(true);
      expect(result.current.canManageAdmin('viewer')).toBe(true);
    });

    it('canUpdate checks CREATE_ACCESS for admin role', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canUpdate('movie')).toBe(true);
      expect(result.current.canUpdate('sync')).toBe(true);
    });
  });

  describe('production_house_admin role', () => {
    beforeEach(() => {
      mockEffectiveUser.mockReturnValue(
        makeUser('production_house_admin', { productionHouseIds: ['ph-1'] }),
      );
    });

    it('has correct flags', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isPHAdmin).toBe(true);
      expect(result.current.isReadOnly).toBe(false);
      expect(result.current.canDeleteTopLevel()).toBe(false);
      expect(result.current.canDeleteChild()).toBe(false);
    });

    it('can only view scoped pages', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canViewPage('dashboard')).toBe(true);
      expect(result.current.canViewPage('movies')).toBe(true);
      expect(result.current.canViewPage('sync')).toBe(false);
      expect(result.current.canViewPage('users')).toBe(false);
    });

    it('can create movie/actor/ott_release only', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canCreate('movie')).toBe(true);
      expect(result.current.canCreate('actor')).toBe(true);
      expect(result.current.canCreate('ott_release')).toBe(true);
      expect(result.current.canCreate('platform')).toBe(false);
    });

    it('canUpdate checks entity-specific rules', () => {
      const { result } = renderHook(() => usePermissions());
      // movie and ott_release — RLS enforces scope
      expect(result.current.canUpdate('movie')).toBe(true);
      expect(result.current.canUpdate('ott_release')).toBe(true);
      // actor — only own
      expect(result.current.canUpdate('actor', 'user-1')).toBe(true);
      expect(result.current.canUpdate('actor', 'other-user')).toBe(false);
      // other entities — false
      expect(result.current.canUpdate('platform')).toBe(false);
    });

    it('canAccessLanguage returns false for PH admin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(false);
    });

    it('canManageAdmin can only manage viewers', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('viewer')).toBe(true);
      expect(result.current.canManageAdmin('admin')).toBe(false);
    });
  });

  describe('viewer role', () => {
    beforeEach(() => {
      mockEffectiveUser.mockReturnValue(makeUser('viewer'));
    });

    it('has correct flags', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isViewer).toBe(true);
      expect(result.current.isReadOnly).toBe(true);
      expect(result.current.canDeleteTopLevel()).toBe(false);
      expect(result.current.canDeleteChild()).toBe(false);
      expect(result.current.auditScope).toBe('all');
    });

    it('can view all pages but cannot create/update', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canViewPage('dashboard')).toBe(true);
      expect(result.current.canCreate('movie')).toBe(false);
      expect(result.current.canUpdate('movie')).toBe(false);
    });

    it('canManageAdmin returns false for all', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('viewer')).toBe(false);
    });

    it('canAccessLanguage returns false', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(false);
    });
  });

  describe('canDelete (legacy)', () => {
    it('delegates to canUpdate', () => {
      mockEffectiveUser.mockReturnValue(makeUser('admin'));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDelete('movie')).toBe(true);
    });
  });
});
