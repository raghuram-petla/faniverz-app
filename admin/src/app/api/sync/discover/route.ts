import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { discoverMoviesByLanguage, discoverMoviesByLanguageAndMonth } from '@/lib/tmdb';
import {
  ensureTmdbApiKey,
  errorResponse,
  verifyAdmin,
  unauthorizedResponse,
} from '@/lib/sync-helpers';

/**
 * POST /api/sync/discover
 * Discover movies on TMDB by language, year (and optional months).
 * Returns results + which tmdb_ids already exist in our DB.
 * Read-only — no DB writes.
 */
// @contract: returns { results: TMDBMovie[], existingMovies: ExistingMovieData[] }
export async function POST(request: NextRequest) {
  try {
    // @boundary: admin-only — prevents unauthenticated TMDB API usage
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return unauthorizedResponse();
    }

    // @coupling: ensureTmdbApiKey reads TMDB_API_KEY env var; returns error response if missing
    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    // @nullable: months is optional — omitting it discovers all movies for the entire year
    // @nullable: language is optional — omitting it discovers movies in all supported languages
    const { year, months, language } = body as {
      year: number;
      months?: number[];
      language?: string;
    };

    if (!year || year < 1900 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // @contract: when language is null/undefined ("All"), discover for every supported
    // language in the DB and merge results (deduplicated by TMDB id).
    let langs: string[];
    if (language) {
      langs = [language];
    } else {
      const { data: langRows } = await supabase.from('languages').select('code');
      langs = (langRows ?? []).map((r) => r.code as string);
      if (langs.length === 0) langs = ['te']; // @edge: fallback if languages table is empty
    }

    // Discover from TMDB — one call per language, then merge + dedupe by TMDB id
    const seenIds = new Set<number>();
    const results: Awaited<ReturnType<typeof discoverMoviesByLanguage>> = [];
    for (const lang of langs) {
      if (months && months.length > 0) {
        // @contract: discover each selected month separately and merge results
        for (const mo of months) {
          const batch = await discoverMoviesByLanguageAndMonth(year, mo, lang, tmdb.apiKey);
          for (const m of batch) {
            if (!seenIds.has(m.id)) {
              seenIds.add(m.id);
              results.push(m);
            }
          }
        }
      } else {
        const batch = await discoverMoviesByLanguage(year, lang, tmdb.apiKey);
        for (const m of batch) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            results.push(m);
          }
        }
      }
    }

    // Batch-check which tmdb_ids already exist in our DB, fetching all
    // fillable fields so the frontend can show a field-level diff without
    // a separate per-movie query.
    // @sync: read-only DB check — no writes, safe for repeated calls
    // @edge: batch tmdb_ids too — "All languages" year discover can return 300+ results
    const tmdbIds = results.map((m) => m.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingRows: any[] = [];
    const TMDB_BATCH = 50;
    for (let i = 0; i < tmdbIds.length; i += TMDB_BATCH) {
      const chunk = tmdbIds.slice(i, i + TMDB_BATCH);
      const { data } = await supabase
        .from('movies')
        .select(
          'id, tmdb_id, title, synopsis, poster_url, backdrop_url, director, runtime, genres, imdb_id, title_te, synopsis_te, tagline, tmdb_status, tmdb_vote_average, tmdb_vote_count, budget, revenue, certification, spoken_languages',
        )
        .in('tmdb_id', chunk);
      if (data) existingRows.push(...data);
    }

    // @contract: resolve relative R2 keys to full URLs server-side so client components
    // can use poster_url directly without needing env vars (Turbopack doesn't substitute
    // process.env in client bundles for non-NEXT_PUBLIC_ vars)
    const postersBase = process.env.R2_PUBLIC_BASE_URL_POSTERS?.replace(/\/$/, '');
    const backdropsBase = process.env.R2_PUBLIC_BASE_URL_BACKDROPS?.replace(/\/$/, '');
    const existingIds = existingRows.map((r: { id: string }) => r.id);

    // @sideeffect: fetch aggregate counts for gap detection
    // @edge: Supabase/PostgREST silently truncates results at max-rows (default 1000).
    // With 177+ movies, junction table rows (e.g. 177 * 5 posters = 885+) can exceed
    // the limit. Movies whose rows fall past the cutoff get count=0, creating false gaps.
    // Batching into chunks of 50 keeps each query well under any row limit.
    const BATCH_SIZE = 50;

    // @contract: batch a Supabase .in() query across chunks, merging all results
    async function batchedIn<T>(
      queryFn: (ids: string[]) => PromiseLike<{ data: T[] | null }>,
    ): Promise<T[]> {
      if (existingIds.length === 0) return [];
      const results: T[] = [];
      for (let i = 0; i < existingIds.length; i += BATCH_SIZE) {
        const chunk = existingIds.slice(i, i + BATCH_SIZE);
        const { data } = await queryFn(chunk);
        if (data) results.push(...data);
      }
      return results;
    }

    const [posterData, backdropData, videoData, keywordData, phData, platformData] =
      await Promise.all([
        batchedIn<{ movie_id: string }>((ids) =>
          supabase
            .from('movie_images')
            .select('movie_id')
            .in('movie_id', ids)
            .eq('image_type', 'poster'),
        ),
        batchedIn<{ movie_id: string }>((ids) =>
          supabase
            .from('movie_images')
            .select('movie_id')
            .in('movie_id', ids)
            .eq('image_type', 'backdrop'),
        ),
        batchedIn<{ movie_id: string }>((ids) =>
          supabase.from('movie_videos').select('movie_id').in('movie_id', ids),
        ),
        batchedIn<{ movie_id: string }>((ids) =>
          supabase.from('movie_keywords').select('movie_id').in('movie_id', ids),
        ),
        batchedIn<{ movie_id: string }>((ids) =>
          supabase.from('movie_production_houses').select('movie_id').in('movie_id', ids),
        ),
        batchedIn<{ movie_id: string; platform_id: string }>((ids) =>
          supabase.from('movie_platforms').select('movie_id, platform_id').in('movie_id', ids),
        ),
      ]);

    // @contract: count existingRows per movie_id for each aggregate type
    function countByMovie(data: { movie_id: string }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const r of data) map.set(r.movie_id, (map.get(r.movie_id) ?? 0) + 1);
      return map;
    }
    const posterCounts = countByMovie(posterData);
    const backdropCounts = countByMovie(backdropData);
    const videoCounts = countByMovie(videoData);
    const keywordCounts = countByMovie(keywordData);
    const phCounts = countByMovie(phData);

    // @contract: collect platform IDs per movie for display names
    const platformsByMovie = new Map<string, string[]>();
    for (const r of platformData) {
      const list = platformsByMovie.get(r.movie_id) ?? [];
      list.push(r.platform_id);
      platformsByMovie.set(r.movie_id, list);
    }

    const existingMovies = existingRows.map((row) => ({
      ...row,
      poster_url:
        row.poster_url && !row.poster_url.startsWith('http') && postersBase
          ? `${postersBase}/${row.poster_url}`
          : row.poster_url,
      backdrop_url:
        row.backdrop_url && !row.backdrop_url.startsWith('http') && backdropsBase
          ? `${backdropsBase}/${row.backdrop_url}`
          : row.backdrop_url,
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
