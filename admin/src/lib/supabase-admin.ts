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
