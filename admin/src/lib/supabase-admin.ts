import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

// @boundary: bypasses all RLS policies — every query runs as superuser; NEVER import from client-side code
// @invariant: singleton — all API routes share one client instance per server process
// @assumes: SUPABASE_SERVICE_ROLE_KEY env var is set at runtime (non-null assertion)
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _client;
}

// @contract: returns a per-request service-role client with x-admin-user-id header set.
// The audit_trigger_fn reads this header via current_setting('request.header.x-admin-user-id')
// to attribute DB changes to the admin who initiated them.
// @sideeffect: creates a NEW client per call — do NOT cache; each request needs its own header.
// @coupling: audit_trigger_fn in 20260314000069_fix_audit_trigger_null_guard.sql reads this header.
export function getAuditableSupabaseAdmin(adminUserId: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { headers: { 'x-admin-user-id': adminUserId } } },
  );
}
