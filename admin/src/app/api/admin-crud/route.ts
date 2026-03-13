import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdmin } from '@/lib/sync-helpers';

// @invariant: only these tables can be mutated through this generic endpoint
// @coupling: admin-crud-client.ts references this endpoint — keep in sync
const ALLOWED_TABLES = new Set([
  'movies',
  'platforms',
  'production_houses',
  'actors',
  'news_feed',
  'surprise_content',
  'movie_cast',
  'movie_videos',
  'movie_posters',
  'movie_platforms',
  'movie_production_houses',
  'movie_theatrical_runs',
  'reviews',
  'feed_comments',
]);

// @boundary: generic CRUD write endpoint using service role client (bypasses RLS)
// @assumes: verifyAdmin checks both JWT validity AND admin_user_roles membership

// @contract: PATCH { table, id?, filters?, data, returnOne? } → updates row(s), returns updated
// @edge: when filters used without returnOne, returns array; with id or returnOne, returns single row
export async function PATCH(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, id, filters, data, returnOne = true } = await req.json();
    if (!table || (!id && !filters) || !data) {
      return NextResponse.json(
        { error: 'Missing table, data, and either id or filters' },
        { status: 400 },
      );
    }
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table "${table}" is not allowed` }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from(table).update(data);
    if (id) query = query.eq('id', id);
    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }
    query = query.select();
    if (id || returnOne) query = query.single();

    const { data: row, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// @contract: POST { table, data } → inserts a single row, returns inserted row
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, data } = await req.json();
    if (!table || !data) {
      return NextResponse.json({ error: 'Missing table or data' }, { status: 400 });
    }
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table "${table}" is not allowed` }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase.from(table).insert(data).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// @contract: DELETE { table, id?, filters? } → deletes row(s) by id or compound filters
// @edge: supports both single-PK tables (pass id) and composite-PK tables (pass filters)
export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, id, filters } = await req.json();
    if (!table || (!id && !filters)) {
      return NextResponse.json(
        { error: 'Missing table, and either id or filters' },
        { status: 400 },
      );
    }
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table "${table}" is not allowed` }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from(table).delete();
    if (id) query = query.eq('id', id);
    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
