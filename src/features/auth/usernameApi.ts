import { supabase } from '@/lib/supabase';

// @sync: this regex must match the DB CHECK constraint (username ~ '^[a-z0-9_]{3,20}$') in migration
// 20260310000048_profile_username.sql. If they diverge, client-side validation passes but DB rejects the update
// with a constraint violation error that surfaces as a raw Postgres error message, not a user-friendly one.
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be 20 characters or less';
  if (!USERNAME_REGEX.test(username)) return 'Only lowercase letters, numbers, and underscores';
  return null;
}

// @sync: checks availability by querying profiles table, but between this check and the subsequent setUsername call,
// another user can claim the same username (TOCTOU race). The DB UNIQUE constraint on profiles.username is the
// real enforcement — this check is purely for UX feedback and can show false positives under concurrent use.
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data === null;
}

export async function setUsername(userId: string, username: string): Promise<void> {
  const validationError = validateUsername(username);
  if (validationError) throw new Error(validationError);

  // @edge: if the UNIQUE constraint on profiles.username is violated (concurrent claim), Supabase returns
  // error code '23505' with message containing 'duplicate key'. This raw Postgres error is thrown as-is —
  // callers (useSetUsername) surface it via Alert.alert, showing a technical DB error to the user.
  const { error } = await supabase.from('profiles').update({ username }).eq('id', userId);
  if (error) throw error;
}
