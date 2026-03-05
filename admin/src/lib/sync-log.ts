import type { SupabaseClient } from '@supabase/supabase-js';

/** Create a sync_log entry in 'running' status. Returns the log ID. */
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

/** Update a sync_log entry on completion. */
export async function completeSyncLog(
  supabase: SupabaseClient,
  syncLogId: string,
  result: {
    status: 'success' | 'failed';
    moviesAdded?: number;
    moviesUpdated?: number;
    errors?: unknown[];
  },
): Promise<void> {
  await supabase
    .from('sync_logs')
    .update({
      status: result.status,
      movies_added: result.moviesAdded ?? 0,
      movies_updated: result.moviesUpdated ?? 0,
      errors: result.errors?.length ? result.errors : [],
      completed_at: new Date().toISOString(),
    })
    .eq('id', syncLogId);
}
