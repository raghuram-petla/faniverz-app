import { supabase } from '@/lib/supabase-browser';

// @boundary: gets the current session's access token; signs out if expired
// @edge: 401 from server means JWT expired mid-session (autoRefreshToken:false)
async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    void supabase.auth.signOut();
    throw new Error('Session expired — please sign in again.');
  }
  return session.access_token;
}

// @boundary: sends an authenticated request to /api/admin-crud; throws on non-2xx.
// @coupling: must stay in sync with the ALLOWED_TABLES whitelist in /api/admin-crud/route.ts.
// Adding a new table to createCrudHooks/createMovieChildHooks without adding it to
// ALLOWED_TABLES causes a 403 "Table not allowed" error at runtime — no compile-time check.
// @edge: 401 means JWT expired mid-session — sign out to trigger redirect to /login
export async function crudFetch<R>(method: string, body: Record<string, unknown>): Promise<R> {
  const token = await getAccessToken();
  const res = await fetch('/api/admin-crud', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    void supabase.auth.signOut();
    throw new Error('Session expired — please sign in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
