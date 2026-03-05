'use client';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdminPage, AdminEntity } from '@/hooks/usePermissions';

export interface PermissionGateProps {
  /** Require a specific page to be accessible */
  page?: AdminPage;
  /** Require ability to create/update/delete an entity */
  entity?: AdminEntity;
  action?: 'create' | 'update' | 'delete';
  /** For ownership checks (actor created_by) */
  ownerId?: string | null;
  /** Require super admin specifically */
  superAdminOnly?: boolean;
  /** Content to show when permission is denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  page,
  entity,
  action = 'update',
  ownerId,
  superAdminOnly,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { isSuperAdmin, canViewPage, canCreate, canUpdate, canDelete } = usePermissions();

  let hasPermission = true;

  if (superAdminOnly) {
    hasPermission = isSuperAdmin;
  } else if (page) {
    hasPermission = canViewPage(page);
  } else if (entity) {
    if (action === 'create') {
      hasPermission = canCreate(entity);
    } else if (action === 'delete') {
      hasPermission = canDelete(entity, ownerId);
    } else {
      hasPermission = canUpdate(entity, ownerId);
    }
  }

  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}
