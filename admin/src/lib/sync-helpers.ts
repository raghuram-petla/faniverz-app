import { NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Validate that TMDB_API_KEY is configured. Returns the key or an error response.
 */
export function ensureTmdbApiKey():
  | { ok: true; apiKey: string }
  | { ok: false; response: NextResponse } {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'TMDB_API_KEY is not configured.' }, { status: 503 }),
    };
  }
  return { ok: true, apiKey };
}

/**
 * Verify a Bearer token from the Authorization header using Supabase auth.
 * Returns the authenticated user or null.
 */
export async function verifyBearer(authHeader: string | null): Promise<User | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);

  return error || !user ? null : user;
}

/**
 * Verify a Bearer token AND check that the user has an admin role.
 * Returns the authenticated admin user or null.
 */
export async function verifyAdmin(authHeader: string | null): Promise<User | null> {
  const user = await verifyBearer(authHeader);
  if (!user) return null;

  const supabase = getSupabaseAdmin();
  const { data: adminRole } = await supabase
    .from('admin_user_roles')
    .select('role_id, status')
    .eq('user_id', user.id)
    .single();

  if (!adminRole || adminRole.status === 'blocked') return null;
  return user;
}

/**
 * Build a standard 500 error response from a caught error.
 */
export function errorResponse(label: string, err: unknown, status = 500): NextResponse {
  console.error(`${label} failed:`, err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : `${label} failed` },
    { status },
  );
}
