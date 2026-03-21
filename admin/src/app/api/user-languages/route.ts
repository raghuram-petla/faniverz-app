import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminWithRole, errorResponse } from '@/lib/sync-helpers';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_languages')
      .select('language_id, assigned_by, created_at')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @boundary Only root/super_admin can assign languages
    if (auth.role !== 'root' && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can assign languages' },
        { status: 403 },
      );
    }

    const { userId, languageIds } = await req.json();
    if (!userId || !Array.isArray(languageIds)) {
      return NextResponse.json({ error: 'Missing userId or languageIds array' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // @boundary Validate target user has 'admin' role — language assignments only apply to admins
    const { data: targetRole, error: roleError } = await supabase
      .from('admin_user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .single();

    if (roleError || !targetRole) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }
    if (targetRole.role_id !== 'admin') {
      return NextResponse.json(
        { error: 'Language assignments can only be set for admin role users' },
        { status: 400 },
      );
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
