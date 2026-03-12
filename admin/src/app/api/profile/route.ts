import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdmin } from '@/lib/sync-helpers';

const ALLOWED_FIELDS = ['avatar_url', 'display_name'] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const googleAvatarUrl =
      (user.user_metadata?.avatar_url as string) ?? (user.user_metadata?.picture as string) ?? null;

    return NextResponse.json({ google_avatar_url: googleAvatarUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabaseAdmin = getSupabaseAdmin();
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
