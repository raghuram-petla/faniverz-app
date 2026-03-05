import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service role key.
 * Lazy-initialized to avoid build-time errors when env vars are absent.
 * Bypasses RLS — only use in API routes, never expose to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _client;
}
