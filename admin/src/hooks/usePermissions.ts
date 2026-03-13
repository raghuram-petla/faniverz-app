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

// @invariant ALL_PAGES and ALL_ENTITIES must stay in sync with AdminPage/AdminEntity types above
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

/**
 * Role-based permissions hook.
 *
 * Uses the EFFECTIVE user (real or impersonated) so that all permission checks
 * reflect the currently-active role. This is critical for impersonation — when
 * a root user impersonates as super_admin, they should see exactly what a real
 * super_admin would see, including which actions are available.
 *
 * Role hierarchy: root > super_admin > admin > production_house_admin
 * See AdminRoleId in types.ts for the full hierarchy documentation.
 */
export function usePermissions() {
  const user = useEffectiveUser();
  const role = user?.role ?? null;
  const phIds = user?.productionHouseIds ?? [];

  // @invariant Role hierarchy: root > super_admin > admin > production_house_admin
  // @coupling useEffectiveUser resolves impersonation — all checks use impersonated role
  const isRoot = role === 'root';
  // isSuperAdmin includes root — root inherits all super_admin privileges
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
  // @assumes PH admin movie/ott_release updates are further scoped by Supabase RLS policies
  // @nullable ownerId — only checked for 'actor' entity by PH admins
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

  /**
   * Whether the current user can manage (block/unblock/revoke/impersonate)
   * an admin with the given role.
   *
   * Enforces strict hierarchy — a role can only act on roles BELOW it:
   *   root         → super_admin, admin, PH admin (everything except root)
   *   super_admin  → admin, PH admin (NOT super_admin or root)
   *   admin        → PH admin only
   *   PH admin     → nobody
   *
   * This is also used by AdminsTable to gate the impersonate (eye) button.
   * If you change this logic, update the impersonate button condition too.
   */
  function canManageAdmin(targetRole: AdminRoleId): boolean {
    if (!role) return false;
    if (isRoot) return targetRole !== 'root';
    if (role === 'super_admin')
      return targetRole === 'admin' || targetRole === 'production_house_admin';
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
    // @sync Must match server-side audit RLS policy scoping rules
    /** Audit log scope: root/super admin sees all, others see own */
    auditScope: isSuperAdmin ? ('all' as const) : ('own' as const),
  };
}
