'use client';
import { useEffectiveUser } from '@/hooks/useImpersonation';
import type { AdminRoleId } from '@/lib/types';

/** Pages in the admin panel */
export type AdminPage =
  | 'dashboard'
  | 'movies'
  | 'cast'
  | 'production-houses'
  | 'ott'
  | 'platforms'
  | 'surprise'
  | 'feed'
  | 'notifications'
  | 'reviews'
  | 'comments'
  | 'watchlist'
  | 'follows'
  | 'favorites'
  | 'feed-votes'
  | 'sync'
  | 'audit'
  | 'app-users'
  | 'users';

/** Entity types that support CRUD */
export type AdminEntity =
  | 'movie'
  | 'actor'
  | 'production_house'
  | 'ott_release'
  | 'platform'
  | 'surprise'
  | 'news_feed'
  | 'notification'
  | 'sync';

const ALL_PAGES: Set<AdminPage> = new Set([
  'dashboard',
  'movies',
  'cast',
  'production-houses',
  'ott',
  'platforms',
  'surprise',
  'feed',
  'notifications',
  'reviews',
  'comments',
  'watchlist',
  'follows',
  'favorites',
  'feed-votes',
  'sync',
  'audit',
  'app-users',
  'users',
]);

const ALL_ENTITIES: Set<AdminEntity> = new Set([
  'movie',
  'actor',
  'production_house',
  'ott_release',
  'platform',
  'surprise',
  'news_feed',
  'notification',
  'sync',
]);

/** Pages accessible per role */
const PAGE_ACCESS: Record<AdminRoleId, Set<AdminPage>> = {
  root: ALL_PAGES,
  super_admin: ALL_PAGES,
  admin: ALL_PAGES,
  production_house_admin: new Set([
    'dashboard',
    'movies',
    'cast',
    'production-houses',
    'ott',
    'audit',
  ]),
};

/** Entities each role can CREATE */
const CREATE_ACCESS: Record<AdminRoleId, Set<AdminEntity>> = {
  root: ALL_ENTITIES,
  super_admin: ALL_ENTITIES,
  admin: ALL_ENTITIES,
  production_house_admin: new Set(['movie', 'actor', 'ott_release']),
};

export function usePermissions() {
  const user = useEffectiveUser();
  const role = user?.role ?? null;
  const phIds = user?.productionHouseIds ?? [];

  const isRoot = role === 'root';
  const isSuperAdmin = role === 'super_admin' || isRoot;
  const isAdmin = role === 'admin';
  const isPHAdmin = role === 'production_house_admin';

  /** Whether the current user can view a given page */
  function canViewPage(page: AdminPage): boolean {
    if (!role) return false;
    return PAGE_ACCESS[role].has(page);
  }

  /** Whether the current user can create an entity of the given type */
  function canCreate(entity: AdminEntity): boolean {
    if (!role) return false;
    return CREATE_ACCESS[role].has(entity);
  }

  /**
   * Whether the current user can update/delete a given entity.
   * For PH admins, pass ownerId (created_by) for actor ownership checks.
   */
  function canUpdate(entity: AdminEntity, ownerId?: string | null): boolean {
    if (!role) return false;
    if (isRoot || isSuperAdmin || isAdmin) return CREATE_ACCESS[role].has(entity);
    if (!isPHAdmin) return false;

    // PH admin: entity-specific checks
    if (entity === 'actor') return ownerId === user?.id;
    if (entity === 'movie' || entity === 'ott_release') return true; // RLS enforces PH scope
    return false;
  }

  function canDelete(entity: AdminEntity, ownerId?: string | null): boolean {
    return canUpdate(entity, ownerId);
  }

  /** Whether the current user can block/unblock/revoke an admin with the given role */
  function canManageAdmin(targetRole: AdminRoleId): boolean {
    if (!role) return false;
    // Root can manage anyone except other root users
    if (isRoot) return targetRole !== 'root';
    // Super admin can manage admin + PH admin only (not super_admin or root)
    if (role === 'super_admin')
      return targetRole === 'admin' || targetRole === 'production_house_admin';
    // Admin can only manage PH admins
    if (isAdmin) return targetRole === 'production_house_admin';
    return false;
  }

  return {
    role,
    isRoot,
    isSuperAdmin,
    isAdmin,
    isPHAdmin,
    productionHouseIds: phIds,
    canViewPage,
    canCreate,
    canUpdate,
    canDelete,
    canManageAdmin,
    /** Audit log scope: root/super admin sees all, others see own */
    auditScope: isSuperAdmin ? ('all' as const) : ('own' as const),
  };
}
