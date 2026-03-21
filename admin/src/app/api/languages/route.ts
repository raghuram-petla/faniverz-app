import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdmin } from '@/lib/sync-helpers';

// @contract GET /api/languages → returns all available content languages

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('languages').select('id, code, name').order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
