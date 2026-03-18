import type { SupabaseClient } from '@supabase/supabase-js';

// @contract: createSyncLog and completeSyncLog are expected to be called as a pair.
// If the caller crashes between create and complete, the sync_log row stays in
// 'running' status permanently — the admin UI shows it as "In progress..." with
// no timeout or stale-detection. Manual DB cleanup is required.
// @coupling: sync-engine.ts re-exports these for backwards compatibility — callers
// can import from either sync-engine.ts or sync-log.ts.
export async function createSyncLog(
  supabase: SupabaseClient,
  functionName: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      function_name: functionName,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create sync log: ${error.message}`);
  return data.id as string;
}

// @edge: if this update fails (e.g. network error), the sync_log stays in 'running'
// even though the sync actually completed successfully. The thrown error propagates to
// the API route, which returns 500 to the admin — the admin may re-trigger the sync,
// causing duplicate movie processing (safe due to upsert, but wastes time and API calls).
export async function completeSyncLog(
  supabase: SupabaseClient,
  syncLogId: string,
  result: {
    status: 'success' | 'failed';
    moviesAdded?: number;
    moviesUpdated?: number;
    errors?: unknown[];
    /** @contract: item names processed — movie titles or actor names */
    details?: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from('sync_logs')
    .update({
      status: result.status,
      movies_added: result.moviesAdded ?? 0,
      movies_updated: result.moviesUpdated ?? 0,
      errors: result.errors?.length ? result.errors : [],
      details: result.details?.length ? result.details : [],
      completed_at: new Date().toISOString(),
    })
    .eq('id', syncLogId);

  if (error) throw new Error(`Failed to complete sync log: ${error.message}`);
}
