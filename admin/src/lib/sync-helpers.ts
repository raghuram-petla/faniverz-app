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
 *
 * @boundary: creates a NEW Supabase client per request (not the singleton from
 * supabase-browser.ts) to validate the JWT server-side. This is intentional — the
 * browser client has autoRefreshToken disabled and uses the anon key, which is
 * correct for server-side token verification.
 * @assumes: the JWT has not expired. Supabase getUser() validates the token against
 * the auth server (not just local decode), so revoked tokens are correctly rejected.
 * However, network failures to the Supabase auth endpoint return error, causing
 * valid users to be treated as unauthenticated.
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
 *
 * @sideeffect: uses the service role client (getSupabaseAdmin) to read admin_user_roles,
 * bypassing RLS. This is required because the anon key can't read admin tables.
 * @edge: does NOT check the specific role level — any non-blocked role (root,
 * super_admin, admin, ph_admin) passes. Endpoint-level role checks must be done
 * separately by the caller. Currently only upload-handler.ts uses this, and it
 * allows any admin to upload images regardless of role.
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

/** Same as verifyAdmin but also returns the admin's role_id for role-based access control. */
export async function verifyAdminWithRole(
  authHeader: string | null,
): Promise<{ user: User; role: string } | null> {
  const user = await verifyBearer(authHeader);
  if (!user) return null;

  const supabase = getSupabaseAdmin();
  const { data: adminRole } = await supabase
    .from('admin_user_roles')
    .select('role_id, status')
    .eq('user_id', user.id)
    .single();

  if (!adminRole || adminRole.status === 'blocked') return null;
  return { user, role: adminRole.role_id };
}

/**
 * Verify a Bearer token, check admin role, AND reject viewer (read-only) role.
 * Use this for all mutation endpoints (POST/PATCH/DELETE).
 * Returns the user or null (unauthenticated/blocked) or 'viewer_readonly' string.
 *
 * @boundary Centralizes viewer mutation blocking — all write endpoints should use this
 * instead of verifyAdmin for mutation handlers.
 */
export async function verifyAdminCanMutate(
  authHeader: string | null,
): Promise<{ user: User; role: string } | null | 'viewer_readonly'> {
  const result = await verifyAdminWithRole(authHeader);
  if (!result) return null;
  if (result.role === 'viewer') return 'viewer_readonly';
  return result;
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
