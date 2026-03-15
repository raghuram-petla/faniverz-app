import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminCanMutate } from '@/lib/sync-helpers';

// @contract POST { auditEntryId } → reverts the change via DB function
// @sideeffect The DB function sets app.admin_user_id so the audit trigger
// logs the revert under the admin who initiated it
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminCanMutate(req.headers.get('authorization'));
    if (auth === 'viewer_readonly') {
      return NextResponse.json({ error: 'Viewer role is read-only' }, { status: 403 });
    }
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auditEntryId } = await req.json();
    if (!auditEntryId) {
      return NextResponse.json({ error: 'Missing auditEntryId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // @boundary Single RPC call handles the entire revert in one transaction
    const { data, error } = await supabase.rpc('revert_audit_entry', {
      p_admin_id: auth.user.id,
      p_entry_id: auditEntryId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
