import { supabase } from '@/lib/supabase-browser';

// @boundary: gets the current session's access token; throws if no session exists
async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated — please log in again.');
  return session.access_token;
}

// @boundary: sends an authenticated request to /api/admin-crud; throws on non-2xx
// @coupling: must stay in sync with the ALLOWED_TABLES whitelist in /api/admin-crud/route.ts
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
