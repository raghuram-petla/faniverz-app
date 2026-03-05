'use client';
import { useAuth } from '@/components/providers/AuthProvider';
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
  | 'notifications'
  | 'sync'
  | 'audit'
  | 'users';

/** Entity types that support CRUD */
export type AdminEntity =
  | 'movie'
  | 'actor'
  | 'production_house'
  | 'ott_release'
  | 'platform'
  | 'surprise'
  | 'notification'
  | 'sync';

/** Pages accessible per role */
const PAGE_ACCESS: Record<AdminRoleId, Set<AdminPage>> = {
  super_admin: new Set([
    'dashboard',
    'movies',
    'cast',
    'production-houses',
    'ott',
    'platforms',
    'surprise',
    'notifications',
    'sync',
    'audit',
    'users',
  ]),
  admin: new Set([
    'dashboard',
    'movies',
    'cast',
    'production-houses',
    'ott',
    'platforms',
    'surprise',
    'notifications',
    'sync',
    'audit',
  ]),
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
  super_admin: new Set([
    'movie',
    'actor',
    'production_house',
    'ott_release',
    'platform',
    'surprise',
    'notification',
    'sync',
  ]),
  admin: new Set([
    'movie',
    'actor',
    'production_house',
    'ott_release',
    'platform',
    'surprise',
    'notification',
    'sync',
  ]),
  production_house_admin: new Set(['movie', 'actor', 'ott_release']),
};

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const phIds = user?.productionHouseIds ?? [];

  const isSuperAdmin = role === 'super_admin';
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
    if (isSuperAdmin || isAdmin) return CREATE_ACCESS[role].has(entity);
    if (!isPHAdmin) return false;

    // PH admin: entity-specific checks
    if (entity === 'actor') return ownerId === user?.id;
    if (entity === 'movie' || entity === 'ott_release') return true; // RLS enforces PH scope
    return false;
  }

  function canDelete(entity: AdminEntity, ownerId?: string | null): boolean {
    return canUpdate(entity, ownerId);
  }

  return {
    role,
    isSuperAdmin,
    isAdmin,
    isPHAdmin,
    productionHouseIds: phIds,
    canViewPage,
    canCreate,
    canUpdate,
    canDelete,
    /** Audit log scope: super admin sees all, others see own */
    auditScope: isSuperAdmin ? ('all' as const) : ('own' as const),
  };
}
