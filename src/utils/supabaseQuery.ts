import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

/**
 * @contract Unwraps a Supabase query result, throwing on error.
 * Returns data with a fallback for null (defaults to empty array for list queries).
 */
export function unwrapList<T>(result: PostgrestResponse<T>): T[] {
  const { data, error } = result;
  if (error) throw error;
  return (data as T[]) ?? [];
}

/**
 * @contract Unwraps a Supabase single-row query result, throwing on error.
 * Returns data or null if not found.
 */
export function unwrapOne<T>(result: PostgrestSingleResponse<T>): T | null {
  const { data, error } = result;
  if (error) throw error;
  return data;
}
