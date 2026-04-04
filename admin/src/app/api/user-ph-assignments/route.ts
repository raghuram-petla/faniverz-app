import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminWithRole, errorResponse, unauthorizedResponse } from '@/lib/sync-helpers';

/**
 * GET /api/user-ph-assignments?userId=<uuid>
 * Returns production house assignments for a given admin user.
 *
 * POST /api/user-ph-assignments
 * Replaces all PH assignments for a user.
 * Body: { userId: string, productionHouseIds: string[] }
 * Only root/super_admin can assign.
 *
 * @boundary PH assignments only apply to 'production_house_admin' role users.
 */

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminWithRole(req.headers.get('authorization'));
    if (!auth) {
      return unauthorizedResponse();
    }

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('admin_ph_assignments')
      .select('production_house_id, assigned_by, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('user-ph-assignments fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch PH assignments' }, { status: 500 });
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

    // @boundary Only root/super_admin can assign production houses
    if (auth.role !== 'root' && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can assign production houses' },
        { status: 403 },
      );
    }

    const { userId, productionHouseIds } = await req.json();
    if (!userId || !Array.isArray(productionHouseIds)) {
      return NextResponse.json(
        { error: 'Missing userId or productionHouseIds array' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // @boundary Validate target user has 'production_house_admin' role
    const { data: targetRole, error: roleError } = await supabase
      .from('admin_user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .single();

    if (roleError || !targetRole) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }
    if (targetRole.role_id !== 'production_house_admin') {
      return NextResponse.json(
        { error: 'PH assignments can only be set for production_house_admin role users' },
        { status: 400 },
      );
    }

    // @sideeffect Atomic delete-then-insert via RPC to prevent partial state
    const { error: rpcError } = await supabase.rpc('replace_user_ph_assignments', {
      p_user_id: userId,
      p_production_house_ids: productionHouseIds,
      p_assigned_by: auth.user.id,
    });

    if (rpcError) {
      return errorResponse('Replace PH assignments', rpcError);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
