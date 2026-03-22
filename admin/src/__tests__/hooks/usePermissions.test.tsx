import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { AdminUser } from '@/lib/types';

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: vi.fn(() => null),
}));

import { usePermissions } from '@/hooks/usePermissions';
import type { AdminPage, AdminEntity } from '@/hooks/usePermissions';
import { useEffectiveUser } from '@/hooks/useImpersonation';

const ALL_PAGES: AdminPage[] = [
  'dashboard',
  'movies',
  'cast',
  'production-houses',
  'platforms',
  'surprise',
  'feed',
  'notifications',
  'reviews',
  'comments',
  'sync',
  'audit',
  'app-users',
  'theaters',
  'users',
];

const ALL_ENTITIES: AdminEntity[] = [
  'movie',
  'actor',
  'production_house',
  'ott_release',
  'platform',
  'surprise',
  'news_feed',
  'notification',
  'sync',
];

function makeUser(overrides: Partial<AdminUser> & Pick<AdminUser, 'role'>): AdminUser {
  return {
    id: 'user-1',
    display_name: 'Test User',
    email: 'test@example.com',
    is_admin: true,
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    productionHouseIds: [],
    languageIds: [],
    languageCodes: [],
    ...overrides,
  };
}

function setUser(user: AdminUser | null) {
  vi.mocked(useEffectiveUser).mockReturnValue(user);
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. No user
  it('returns null role when no user', () => {
    setUser(null);
    const { result } = renderHook(() => usePermissions());

    expect(result.current.role).toBeNull();
    expect(result.current.isRoot).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isPHAdmin).toBe(false);
    expect(result.current.productionHouseIds).toEqual([]);
  });

  // 2. Root — flags and page access
  describe('root role', () => {
    it('isRoot and isSuperAdmin are both true', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isRoot).toBe(true);
      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isPHAdmin).toBe(false);
    });

    it('canViewPage returns true for all pages', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());

      for (const page of ALL_PAGES) {
        expect(result.current.canViewPage(page)).toBe(true);
      }
    });

    it('canCreate returns true for all entities', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canCreate(entity)).toBe(true);
      }
    });

    it('canUpdate returns true for all entities', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canUpdate(entity)).toBe(true);
      }
    });

    it('auditScope is "all"', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.auditScope).toBe('all');
    });
  });

  // 3. Root — canManageAdmin
  describe('root canManageAdmin', () => {
    it('can manage super_admin, admin, and production_house_admin', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageAdmin('super_admin')).toBe(true);
      expect(result.current.canManageAdmin('admin')).toBe(true);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(true);
    });

    it('cannot manage other root users', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageAdmin('root')).toBe(false);
    });
  });

  // 4. Super admin — page access
  describe('super_admin page access', () => {
    it('isSuperAdmin is true and canViewPage returns true for all pages including users', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isRoot).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isPHAdmin).toBe(false);

      for (const page of ALL_PAGES) {
        expect(result.current.canViewPage(page)).toBe(true);
      }
    });
  });

  // 5. Admin — page access
  describe('admin page access', () => {
    it('isAdmin is true and canViewPage returns true for all pages including users', () => {
      setUser(makeUser({ role: 'admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.isPHAdmin).toBe(false);

      for (const page of ALL_PAGES) {
        expect(result.current.canViewPage(page)).toBe(true);
      }
    });
  });

  // 6. PH admin — page access
  describe('production_house_admin page access', () => {
    it('isPHAdmin is true and canViewPage returns correct access', () => {
      setUser(makeUser({ role: 'production_house_admin', productionHouseIds: ['ph-1'] }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isPHAdmin).toBe(true);
      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.isAdmin).toBe(false);

      const allowed: AdminPage[] = [
        'dashboard',
        'movies',
        'cast',
        'production-houses',
        'theaters',
        'audit',
      ];
      const denied: AdminPage[] = [
        'platforms',
        'surprise',
        'feed',
        'notifications',
        'reviews',
        'comments',
        'sync',
        'app-users',
        'users',
      ];

      for (const page of allowed) {
        expect(result.current.canViewPage(page)).toBe(true);
      }
      for (const page of denied) {
        expect(result.current.canViewPage(page)).toBe(false);
      }
    });
  });

  // 7. Super admin — canCreate for all entities
  describe('super_admin create access', () => {
    it('canCreate returns true for all entities', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canCreate(entity)).toBe(true);
      }
    });
  });

  // 8. PH admin — canCreate
  describe('production_house_admin create access', () => {
    it('canCreate returns true for movie/actor/ott_release, false for others', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());

      const allowed: AdminEntity[] = ['movie', 'actor', 'ott_release'];
      const denied: AdminEntity[] = [
        'production_house',
        'platform',
        'surprise',
        'notification',
        'sync',
      ];

      for (const entity of allowed) {
        expect(result.current.canCreate(entity)).toBe(true);
      }
      for (const entity of denied) {
        expect(result.current.canCreate(entity)).toBe(false);
      }
    });
  });

  // 9. PH admin — canUpdate('actor', ownerId) only when ownerId matches user.id
  describe('production_house_admin canUpdate actor', () => {
    it('returns true only when ownerId matches user.id', () => {
      setUser(makeUser({ id: 'ph-user-42', role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canUpdate('actor', 'ph-user-42')).toBe(true);
      expect(result.current.canUpdate('actor', 'other-user')).toBe(false);
      expect(result.current.canUpdate('actor', null)).toBe(false);
      expect(result.current.canUpdate('actor', undefined)).toBe(false);
    });
  });

  // 10. PH admin — canUpdate('movie') returns true
  describe('production_house_admin canUpdate movie', () => {
    it('returns true for movie (RLS handles scoping)', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canUpdate('movie')).toBe(true);
      expect(result.current.canUpdate('ott_release')).toBe(true);
    });
  });

  // 11. PH admin — canUpdate('production_house') returns false
  describe('production_house_admin canUpdate production_house', () => {
    it('returns false for production_house', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canUpdate('production_house')).toBe(false);
      expect(result.current.canUpdate('platform')).toBe(false);
      expect(result.current.canUpdate('surprise')).toBe(false);
      expect(result.current.canUpdate('notification')).toBe(false);
      expect(result.current.canUpdate('sync')).toBe(false);
    });
  });

  // 12. auditScope
  describe('auditScope', () => {
    it('is "all" for super_admin', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.auditScope).toBe('all');
    });

    it('is "own" for admin', () => {
      setUser(makeUser({ role: 'admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.auditScope).toBe('own');
    });

    it('is "own" for production_house_admin', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.auditScope).toBe('own');
    });

    it('is "own" when no user', () => {
      setUser(null);
      const { result } = renderHook(() => usePermissions());

      expect(result.current.auditScope).toBe('own');
    });
  });

  // Extra: canViewPage/canCreate return false when no user
  describe('no user access checks', () => {
    it('canViewPage returns false for all pages when no user', () => {
      setUser(null);
      const { result } = renderHook(() => usePermissions());

      for (const page of ALL_PAGES) {
        expect(result.current.canViewPage(page)).toBe(false);
      }
    });

    it('canCreate returns false for all entities when no user', () => {
      setUser(null);
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canCreate(entity)).toBe(false);
      }
    });

    it('canUpdate returns false for all entities when no user', () => {
      setUser(null);
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canUpdate(entity)).toBe(false);
      }
    });

    it('canDelete returns false for all entities when no user', () => {
      setUser(null);
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canDelete(entity)).toBe(false);
      }
    });
  });

  // canDelete delegates to canUpdate
  describe('canDelete', () => {
    it('returns same result as canUpdate for super_admin', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canDelete(entity)).toBe(result.current.canUpdate(entity));
      }
    });

    it('returns same result as canUpdate for PH admin with ownerId', () => {
      setUser(makeUser({ id: 'user-1', role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canDelete('actor', 'user-1')).toBe(true);
      expect(result.current.canDelete('actor', 'other-user')).toBe(false);
    });
  });

  // canManageAdmin
  describe('canManageAdmin', () => {
    it('super_admin can manage admin and production_house_admin but not super_admin or root', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageAdmin('admin')).toBe(true);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(true);
      expect(result.current.canManageAdmin('super_admin')).toBe(false);
      expect(result.current.canManageAdmin('root')).toBe(false);
    });

    it('admin can manage production_house_admin but not admin, super_admin, or root', () => {
      setUser(makeUser({ role: 'admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageAdmin('production_house_admin')).toBe(true);
      expect(result.current.canManageAdmin('admin')).toBe(false);
      expect(result.current.canManageAdmin('super_admin')).toBe(false);
      expect(result.current.canManageAdmin('root')).toBe(false);
    });

    it('production_house_admin cannot manage any role', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageAdmin('admin')).toBe(false);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(false);
      expect(result.current.canManageAdmin('super_admin')).toBe(false);
      expect(result.current.canManageAdmin('root')).toBe(false);
    });

    it('returns false for all roles when no user', () => {
      setUser(null);
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageAdmin('admin')).toBe(false);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(false);
      expect(result.current.canManageAdmin('super_admin')).toBe(false);
      expect(result.current.canManageAdmin('root')).toBe(false);
    });
  });

  // Viewer role — read-only access
  describe('viewer role', () => {
    it('isViewer and isReadOnly are true, other flags false', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isViewer).toBe(true);
      expect(result.current.isReadOnly).toBe(true);
      expect(result.current.isRoot).toBe(false);
      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isPHAdmin).toBe(false);
    });

    it('canViewPage returns true for ALL pages', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());

      for (const page of ALL_PAGES) {
        expect(result.current.canViewPage(page)).toBe(true);
      }
    });

    it('canCreate returns false for ALL entities', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canCreate(entity)).toBe(false);
      }
    });

    it('canUpdate returns false for ALL entities', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canUpdate(entity)).toBe(false);
      }
    });

    it('canDelete returns false for ALL entities', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());

      for (const entity of ALL_ENTITIES) {
        expect(result.current.canDelete(entity)).toBe(false);
      }
    });

    it('canManageAdmin returns false for ALL roles', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageAdmin('root')).toBe(false);
      expect(result.current.canManageAdmin('super_admin')).toBe(false);
      expect(result.current.canManageAdmin('admin')).toBe(false);
      expect(result.current.canManageAdmin('production_house_admin')).toBe(false);
      expect(result.current.canManageAdmin('viewer')).toBe(false);
    });

    it('auditScope is "all"', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.auditScope).toBe('all');
    });
  });

  // All non-viewer roles can manage viewer
  describe('canManageAdmin viewer target', () => {
    it('root can manage viewer', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('viewer')).toBe(true);
    });

    it('super_admin can manage viewer', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('viewer')).toBe(true);
    });

    it('admin can manage viewer', () => {
      setUser(makeUser({ role: 'admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('viewer')).toBe(true);
    });

    it('production_house_admin can manage viewer', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canManageAdmin('viewer')).toBe(true);
    });
  });

  // productionHouseIds passed through
  describe('productionHouseIds', () => {
    it('returns the production house IDs from the user', () => {
      setUser(makeUser({ role: 'production_house_admin', productionHouseIds: ['ph-1', 'ph-2'] }));
      const { result } = renderHook(() => usePermissions());

      expect(result.current.productionHouseIds).toEqual(['ph-1', 'ph-2']);
    });
  });

  // canDeleteTopLevel — only root/super_admin
  describe('canDeleteTopLevel', () => {
    it('returns true for root', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteTopLevel()).toBe(true);
    });

    it('returns true for super_admin', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteTopLevel()).toBe(true);
    });

    it('returns false for admin', () => {
      setUser(makeUser({ role: 'admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteTopLevel()).toBe(false);
    });

    it('returns false for production_house_admin', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteTopLevel()).toBe(false);
    });

    it('returns false for viewer', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteTopLevel()).toBe(false);
    });
  });

  // canDeleteChild — root/super_admin/admin only
  describe('canDeleteChild', () => {
    it('returns true for root', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteChild()).toBe(true);
    });

    it('returns true for super_admin', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteChild()).toBe(true);
    });

    it('returns true for admin', () => {
      setUser(makeUser({ role: 'admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteChild()).toBe(true);
    });

    it('returns false for production_house_admin', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteChild()).toBe(false);
    });

    it('returns false for viewer', () => {
      setUser(makeUser({ role: 'viewer' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canDeleteChild()).toBe(false);
    });
  });

  // canAccessLanguage — language-scoped access control (uses language codes)
  describe('canAccessLanguage', () => {
    it('returns true for root regardless of language', () => {
      setUser(makeUser({ role: 'root' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(true);
      expect(result.current.canAccessLanguage(null)).toBe(true);
    });

    it('returns true for super_admin regardless of language', () => {
      setUser(makeUser({ role: 'super_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(true);
    });

    it('returns true for admin with matching language code', () => {
      setUser(makeUser({ role: 'admin', languageCodes: ['te', 'ta'] }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(true);
      expect(result.current.canAccessLanguage('ta')).toBe(true);
    });

    it('returns false for admin without matching language code', () => {
      setUser(makeUser({ role: 'admin', languageCodes: ['te'] }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('hi')).toBe(false);
    });

    it('returns true for admin when languageCode is null', () => {
      setUser(makeUser({ role: 'admin', languageCodes: ['te'] }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage(null)).toBe(true);
    });

    it('returns true for admin with no language assignments (unrestricted)', () => {
      setUser(makeUser({ role: 'admin', languageCodes: [] }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('hi')).toBe(true);
    });

    it('returns false for production_house_admin', () => {
      setUser(makeUser({ role: 'production_house_admin' }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(false);
    });

    it('returns false when no user', () => {
      setUser(null);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAccessLanguage('te')).toBe(false);
    });
  });

  // languageCodes passed through
  describe('languageCodes', () => {
    it('returns the language codes from the user', () => {
      setUser(makeUser({ role: 'admin', languageCodes: ['te', 'ta'] }));
      const { result } = renderHook(() => usePermissions());
      expect(result.current.languageCodes).toEqual(['te', 'ta']);
    });
  });
});
