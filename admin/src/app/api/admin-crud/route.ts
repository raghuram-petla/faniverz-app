import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminCanMutate } from '@/lib/sync-helpers';

// @boundary Generic CRUD endpoint that delegates to the admin_crud RPC function.
// The RPC sets app.admin_user_id in the same transaction, ensuring the audit
// trigger can attribute changes to the correct admin.

const viewerReadonlyResponse = () =>
  NextResponse.json({ error: 'Viewer role is read-only' }, { status: 403 });

// @contract PATCH { table, id?, filters?, data, returnOne? } → updates row(s)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminCanMutate(req.headers.get('authorization'));
    if (auth === 'viewer_readonly') return viewerReadonlyResponse();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, id, filters, data } = await req.json();
    if (!table || (!id && !filters) || !data) {
      return NextResponse.json(
        { error: 'Missing table, data, and either id or filters' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    // @sideeffect RPC sets app.admin_user_id before the UPDATE for audit attribution
    const { data: row, error } = await supabase.rpc('admin_crud', {
      p_admin_id: auth.user.id,
      p_table: table,
      p_operation: 'update',
      p_data: data,
      p_id: id ?? null,
      p_filters: filters ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// @contract POST { table, data } → inserts a single row, returns inserted row
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminCanMutate(req.headers.get('authorization'));
    if (auth === 'viewer_readonly') return viewerReadonlyResponse();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, data } = await req.json();
    if (!table || !data) {
      return NextResponse.json({ error: 'Missing table or data' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase.rpc('admin_crud', {
      p_admin_id: auth.user.id,
      p_table: table,
      p_operation: 'insert',
      p_data: data,
      p_id: null,
      p_filters: null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// @contract DELETE { table, id?, filters? } → deletes row(s) by id or filters
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminCanMutate(req.headers.get('authorization'));
    if (auth === 'viewer_readonly') return viewerReadonlyResponse();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, id, filters } = await req.json();
    if (!table || (!id && !filters)) {
      return NextResponse.json(
        { error: 'Missing table, and either id or filters' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: result, error } = await supabase.rpc('admin_crud', {
      p_admin_id: auth.user.id,
      p_table: table,
      p_operation: 'delete',
      p_data: null,
      p_id: id ?? null,
      p_filters: filters ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(result ?? { success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
