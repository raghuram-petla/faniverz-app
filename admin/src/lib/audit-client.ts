import { supabase } from './supabase-browser';

type AuditAction = 'create' | 'update' | 'delete' | 'sync';

/**
 * Log an audit trail entry from the browser.
 * Fire-and-forget — callers should NOT await this.
 */
export function logAudit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return;
    supabase.from('audit_log').insert({
      admin_user_id: session.user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? {},
    });
  });
}
