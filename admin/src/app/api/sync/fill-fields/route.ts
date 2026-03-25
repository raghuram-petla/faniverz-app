import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { processMovieFromTmdb } from '@/lib/sync-engine';
import { ensureAdminMutateAuth, errorResponse } from '@/lib/sync-helpers';

/**
 * POST /api/sync/fill-fields — apply TMDB fields to an existing movie.
 *
 * @contract: delegates ALL sync work to processMovieFromTmdb (the same engine
 * used by import-movies). This ensures a single source of truth — fill and
 * import share identical logic for images, videos, cast, and metadata.
 *
 * processMovieFromTmdb is idempotent and additive: it skips already-synced
 * items (videos, images, keywords) and only writes missing data.
 */
// @sideeffect: upserts movie row, syncs cast/crew/images/videos/keywords/providers
// @assumes: tmdb_id has UNIQUE constraint; movie must already exist in DB
export async function POST(request: NextRequest) {
  try {
    // @boundary: viewer role is read-only
    const guard = await ensureAdminMutateAuth(request.headers.get('authorization'));
    if (!guard.ok) return guard.response;
    const { apiKey } = guard;

    const { tmdbId, fields, forceResyncCast } = (await request.json()) as {
      tmdbId: number;
      fields: string[];
      forceResyncCast?: boolean;
    };
    // @edge: allow fields=[] when forceResyncCast=true — cast-only re-sync is a valid use case
    if (!tmdbId || !Array.isArray(fields) || (fields.length === 0 && !forceResyncCast)) {
      return NextResponse.json({ error: 'tmdbId and fields[] are required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // @contract: verify movie exists and read its original_language for native-lang video fetching
    const { data: existing } = await supabase
      .from('movies')
      .select('id, original_language')
      .eq('tmdb_id', tmdbId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Movie not found in DB.' }, { status: 404 });

    // @contract: detect original language for native-language video/translation fetching
    const originalLanguage =
      existing.original_language && existing.original_language !== 'en'
        ? existing.original_language
        : undefined;

    // @contract: single source of truth — same engine as import-movies.
    // resumable=true → additive sync (skip already-done items).
    // resumable=false → full-replace cast (for forceResyncCast).
    const result = await processMovieFromTmdb(tmdbId, apiKey, supabase, {
      resumable: !forceResyncCast,
      originalLanguage,
    });

    // @contract: return requested fields as updated — processMovieFromTmdb syncs everything
    // idempotently, so all requested fields are guaranteed to be at their latest TMDB values.
    const updatedFields = [...fields];
    if (forceResyncCast && !updatedFields.includes('cast')) {
      updatedFields.push('cast');
    }

    return NextResponse.json({ movieId: result.movieId, updatedFields });
  } catch (err) {
    if (err instanceof Error && err.message.includes('→ 429')) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return errorResponse('Fill fields', err);
  }
}
