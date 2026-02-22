import { supabase } from './supabase-browser';

export type AuditAction = 'create' | 'update' | 'delete' | 'sync' | 'status_change';
export type EntityType = 'movie' | 'ott_release' | 'platform' | 'cast' | 'notification';

export async function logAdminAction(
  action: AuditAction,
  entityType: EntityType,
  entityId: number,
  changes?: Record<string, unknown>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes: changes ?? null,
  });
}
