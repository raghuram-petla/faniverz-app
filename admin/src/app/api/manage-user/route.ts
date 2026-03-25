import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  verifyAdminCanMutate,
  errorResponse,
  unauthorizedResponse,
  viewerReadonlyResponse,
} from '@/lib/sync-helpers';

/**
 * POST /api/manage-user
 * Admin-only endpoint for banning/unbanning app users and updating profiles.
 *
 * Actions:
 * - { action: 'ban', userId, reason? } — Bans a user (sets ban_duration to 87600h = 10 years)
 * - { action: 'unban', userId }         — Removes the ban
 * - { action: 'update-profile', userId, fields: { display_name?, bio?, location? } }
 */
// @boundary: admin-only route — requires valid admin role via verifyAdmin
// @contract: accepts { action, userId, ...params }; returns { success: true, action } on success
// @sideeffect: ban/unban mutates Supabase Auth user state; update-profile writes to profiles table
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminCanMutate(req.headers.get('authorization'));
    /* v8 ignore start */
    if (auth === 'viewer_readonly') return viewerReadonlyResponse();
    /* v8 ignore stop */

    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { action, userId } = body;

    if (!action || !userId) {
      return NextResponse.json({ error: 'Missing action or userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (action === 'ban') {
      // @assumes: 87600h = 10 years; effectively a permanent ban — Supabase Auth rejects all login attempts
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: '87600h',
      });
      if (error) throw error;
      return NextResponse.json({ success: true, action: 'banned' });
    }

    if (action === 'unban') {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      });
      if (error) throw error;
      return NextResponse.json({ success: true, action: 'unbanned' });
    }

    if (action === 'update-profile') {
      const { fields } = body;
      if (!fields || typeof fields !== 'object') {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }
      // Only allow safe fields
      // @invariant: whitelist-only — unknown fields are silently dropped, never written to DB
      const allowed = ['display_name', 'bio', 'location'] as const;
      const safeFields: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in fields) safeFields[key] = fields[key];
      }
      const { error } = await supabase.from('profiles').update(safeFields).eq('id', userId);
      if (error) throw error;
      return NextResponse.json({ success: true, action: 'updated' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return errorResponse('manage-user', err);
  }
}
