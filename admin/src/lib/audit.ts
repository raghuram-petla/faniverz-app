import { supabaseAdmin } from './supabase-admin';

export type AuditAction = 'create' | 'update' | 'delete' | 'sync';

export async function logAdminAction(
  adminUserId: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
) {
  await supabaseAdmin.from('audit_log').insert({
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? {},
  });
}
