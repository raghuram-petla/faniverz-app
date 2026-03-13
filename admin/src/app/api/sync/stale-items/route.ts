import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdmin } from '@/lib/sync-helpers';

/**
 * GET /api/sync/stale-items?type=movies&days=30
 * GET /api/sync/stale-items?type=actors-missing-bios
 *
 * Lists items that need refreshing. Read-only — no DB writes.
 */
// @contract: returns { type, items, days? } — items capped at 200 per query
// @sync: read-only — identifies stale records but does not refresh them
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const supabase = getSupabaseAdmin();

    if (type === 'movies') {
      // @assumes: days defaults to 30 if not provided; movies not synced within that window are stale
      const days = parseInt(searchParams.get('days') ?? '30', 10);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('movies')
        .select('id, title, tmdb_id, tmdb_last_synced_at')
        .not('tmdb_id', 'is', null)
        // @edge: movies with null tmdb_last_synced_at are treated as never-synced (most stale)
        .or(`tmdb_last_synced_at.is.null,tmdb_last_synced_at.lt.${cutoff}`)
        .order('tmdb_last_synced_at', { ascending: true, nullsFirst: true })
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ type: 'movies', items: data ?? [], days });
    }

    if (type === 'actors-missing-bios') {
      // @assumes: only actors with tmdb_person_id can have their bio fetched — excludes manual entries
      const { data, error } = await supabase
        .from('actors')
        .select('id, name, tmdb_person_id')
        .not('tmdb_person_id', 'is', null)
        .is('biography', null)
        .order('name')
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ type: 'actors-missing-bios', items: data ?? [] });
    }

    return NextResponse.json(
      { error: 'Invalid type. Use "movies" or "actors-missing-bios".' },
      { status: 400 },
    );
  } catch (err) {
    console.error('Stale items query failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Query failed' },
      { status: 500 },
    );
  }
}
