import { supabase } from '@/lib/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be 20 characters or less';
  if (!USERNAME_REGEX.test(username)) return 'Only lowercase letters, numbers, and underscores';
  return null;
}

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

  const { error } = await supabase.from('profiles').update({ username }).eq('id', userId);
  if (error) throw error;
}
