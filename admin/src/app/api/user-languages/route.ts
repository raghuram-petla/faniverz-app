import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  verifyAdminWithRole,
  errorResponse,
  unauthorizedResponse,
  badRequest,
  notFound,
  forbiddenResponse,
} from '@/lib/sync-helpers';

/**
 * GET /api/user-languages?userId=<uuid>
 * Returns language assignments for a given admin user.
 *
 * POST /api/user-languages
 * Replaces all language assignments for a user.
 * Body: { userId: string, languageIds: string[] }
 * Only root/super_admin can assign languages.
 *
 * @boundary Language assignments only apply to 'admin' role users.
 * Root/super_admin have implicit all-language access.
 */

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminWithRole(req.headers.get('authorization'));
    if (!auth) {
      return unauthorizedResponse();
    }

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return badRequest('Missing userId parameter');
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_languages')
      .select('language_id, assigned_by, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('user-languages fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch language assignments' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminWithRole(req.headers.get('authorization'));
    if (!auth) {
      return unauthorizedResponse();
    }

    // @boundary Only root/super_admin can assign languages
    if (auth.role !== 'root' && auth.role !== 'super_admin') {
      return forbiddenResponse('Only super admins can assign languages');
    }

    const { userId, languageIds } = await req.json();
    if (!userId || !Array.isArray(languageIds)) {
      return badRequest('Missing userId or languageIds array');
    }

    const supabase = getSupabaseAdmin();

    // @boundary Validate target user has 'admin' role — language assignments only apply to admins
    const { data: targetRole, error: roleError } = await supabase
      .from('admin_user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .single();

    if (roleError || !targetRole) {
      return notFound('Target user not found');
    }
    if (targetRole.role_id !== 'admin') {
      return badRequest('Language assignments can only be set for admin role users');
    }

    // @sideeffect Atomic delete-then-insert via RPC to prevent partial state
    const { error: rpcError } = await supabase.rpc('replace_user_languages', {
      p_user_id: userId,
      p_language_ids: languageIds,
      p_assigned_by: auth.user.id,
    });

    if (rpcError) {
      return errorResponse('Replace language assignments', rpcError);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
