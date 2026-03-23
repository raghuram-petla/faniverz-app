import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { discoverMoviesByLanguage, discoverMoviesByLanguageAndMonth } from '@/lib/tmdb';
import { ensureTmdbApiKey, errorResponse, verifyAdmin } from '@/lib/sync-helpers';

/**
 * POST /api/sync/discover
 * Discover movies on TMDB by language, year (and optional month).
 * Returns results + which tmdb_ids already exist in our DB.
 * Read-only — no DB writes.
 */
// @contract: returns { results: TMDBMovie[], existingMovies: ExistingMovieData[] }
export async function POST(request: NextRequest) {
  try {
    // @boundary: admin-only — prevents unauthenticated TMDB API usage
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @coupling: ensureTmdbApiKey reads TMDB_API_KEY env var; returns error response if missing
    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    // @nullable: month is optional — omitting it discovers all movies for the entire year
    // @nullable: language defaults to 'te' (Telugu) if not provided
    const { year, month, language } = body as { year: number; month?: number; language?: string };
    const lang = language || 'te';

    if (!year || year < 1900 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }

    // Discover from TMDB
    const results = month
      ? await discoverMoviesByLanguageAndMonth(year, month, lang, tmdb.apiKey)
      : await discoverMoviesByLanguage(year, lang, tmdb.apiKey);

    // Batch-check which tmdb_ids already exist in our DB, fetching all
    // fillable fields so the frontend can show a field-level diff without
    // a separate per-movie query.
    // @sync: read-only DB check — no writes, safe for repeated calls
    const tmdbIds = results.map((m) => m.id);
    const supabase = getSupabaseAdmin();
    const { data: existingRows } = await supabase
      .from('movies')
      .select(
        'id, tmdb_id, title, synopsis, poster_url, backdrop_url, director, runtime, genres, imdb_id, title_te, synopsis_te, tagline, tmdb_status, tmdb_vote_average, tmdb_vote_count, budget, revenue, certification, spoken_languages',
      )
      .in('tmdb_id', tmdbIds);

    // @contract: resolve relative R2 keys to full URLs server-side so client components
    // can use poster_url directly without needing env vars (Turbopack doesn't substitute
    // process.env in client bundles for non-NEXT_PUBLIC_ vars)
    const postersBase = process.env.R2_PUBLIC_BASE_URL_POSTERS?.replace(/\/$/, '');
    const rows = existingRows ?? [];
    const existingIds = rows.map((r) => r.id);

    // @sideeffect: fetch aggregate counts for gap detection — parallel queries for efficiency
    const [posterRows, backdropRows, videoRows, keywordRows, phRows, platformRows] =
      existingIds.length > 0
        ? await Promise.all([
            supabase
              .from('movie_images')
              .select('movie_id')
              .in('movie_id', existingIds)
              .eq('image_type', 'poster'),
            supabase
              .from('movie_images')
              .select('movie_id')
              .in('movie_id', existingIds)
              .eq('image_type', 'backdrop'),
            supabase.from('movie_videos').select('movie_id').in('movie_id', existingIds),
            supabase.from('movie_keywords').select('movie_id').in('movie_id', existingIds),
            supabase.from('movie_production_houses').select('movie_id').in('movie_id', existingIds),
            supabase
              .from('movie_platforms')
              .select('movie_id, platform_id')
              .in('movie_id', existingIds),
          ])
        : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

    // @contract: count rows per movie_id for each aggregate type
    function countByMovie(data: { movie_id: string }[] | null): Map<string, number> {
      const map = new Map<string, number>();
      for (const r of data ?? []) map.set(r.movie_id, (map.get(r.movie_id) ?? 0) + 1);
      return map;
    }
    const posterCounts = countByMovie(posterRows.data);
    const backdropCounts = countByMovie(backdropRows.data);
    const videoCounts = countByMovie(videoRows.data);
    const keywordCounts = countByMovie(keywordRows.data);
    const phCounts = countByMovie(phRows.data);

    // @contract: collect platform IDs per movie for display names
    const platformsByMovie = new Map<string, string[]>();
    for (const r of platformRows.data ?? []) {
      const list = platformsByMovie.get(r.movie_id) ?? [];
      list.push(r.platform_id);
      platformsByMovie.set(r.movie_id, list);
    }

    const existingMovies = rows.map((row) => ({
      ...row,
      poster_url:
        row.poster_url && !row.poster_url.startsWith('http') && postersBase
          ? `${postersBase}/${row.poster_url}`
          : row.poster_url,
      poster_count: posterCounts.get(row.id) ?? 0,
      backdrop_count: backdropCounts.get(row.id) ?? 0,
      video_count: videoCounts.get(row.id) ?? 0,
      keyword_count: keywordCounts.get(row.id) ?? 0,
      production_house_count: phCounts.get(row.id) ?? 0,
      platform_names: platformsByMovie.get(row.id) ?? [],
    }));

    // @sideeffect check for title-based duplicates — movies in DB with matching titles but no tmdb_id
    const existingTmdbIds = new Set(existingMovies.map((m) => m.tmdb_id));
    const unmatchedTitles = results.filter((m) => !existingTmdbIds.has(m.id)).map((m) => m.title);
    let duplicateSuspects: Record<number, { id: string; title: string }> = {};
    if (unmatchedTitles.length > 0) {
      const { data: suspects } = await supabase
        .from('movies')
        .select('id, title, tmdb_id')
        .is('tmdb_id', null)
        .in('title', unmatchedTitles);
      if (suspects && suspects.length > 0) {
        const suspectMap = new Map(suspects.map((s) => [s.title.toLowerCase(), s]));
        for (const m of results) {
          const match = suspectMap.get(m.title.toLowerCase());
          if (match) duplicateSuspects[m.id] = { id: match.id, title: match.title };
        }
      }
    }

    return NextResponse.json({ results, existingMovies, duplicateSuspects });
  } catch (err) {
    return errorResponse('Discover', err);
  }
}
