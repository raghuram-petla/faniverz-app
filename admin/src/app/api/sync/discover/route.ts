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

    // Batch-check which tmdb_ids already exist in our DB, fetching scalar fields.
    // @contract: aggregate counts (images, videos, keywords, etc.) are NOT fetched here —
    // they are fetched per-movie by the lookup route for self-contained gap analysis.
    // This eliminates the Supabase row-limit truncation bug that caused false gaps.
    // @edge: batch tmdb_ids — "All languages" year discover can return 300+ results
    const tmdbIds = results.map((m) => m.id);
    interface MovieRow {
      id: string;
      tmdb_id: number;
      title: string | null;
      synopsis: string | null;
      release_date: string | null;
      poster_url: string | null;
      backdrop_url: string | null;
      director: string | null;
      runtime: number | null;
      genres: string[] | null;
      imdb_id: string | null;
      title_te: string | null;
      synopsis_te: string | null;
      tagline: string | null;
      tmdb_status: string | null;
      tmdb_vote_average: number | null;
      tmdb_vote_count: number | null;
      budget: number | null;
      revenue: number | null;
      certification: string | null;
      spoken_languages: string[] | null;
    }
    const existingRows: MovieRow[] = [];
    const TMDB_BATCH = 50;
    for (let i = 0; i < tmdbIds.length; i += TMDB_BATCH) {
      const chunk = tmdbIds.slice(i, i + TMDB_BATCH);
      const { data } = await supabase
        .from('movies')
        .select(
          'id, tmdb_id, title, synopsis, release_date, poster_url, backdrop_url, director, runtime, genres, imdb_id, title_te, synopsis_te, tagline, tmdb_status, tmdb_vote_average, tmdb_vote_count, budget, revenue, certification, spoken_languages',
        )
        .in('tmdb_id', chunk);
      if (data) existingRows.push(...(data as MovieRow[]));
    }

    // @contract: resolve relative R2 keys to full URLs server-side
    const postersBase = process.env.R2_PUBLIC_BASE_URL_POSTERS?.replace(/\/$/, '');
    const backdropsBase = process.env.R2_PUBLIC_BASE_URL_BACKDROPS?.replace(/\/$/, '');

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
