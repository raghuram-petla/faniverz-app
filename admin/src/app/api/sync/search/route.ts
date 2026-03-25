import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { searchMovies, searchPersons } from '@/lib/tmdb';
import {
  ensureTmdbApiKey,
  errorResponse,
  verifyAdmin,
  unauthorizedResponse,
} from '@/lib/sync-helpers';

/**
 * POST /api/sync/search
 * Search TMDB for both movies and persons by text query.
 * Cross-references results with DB to mark existing items.
 * @contract Read-only — no DB writes.
 * @contract Returns both movie and actor results in a single response.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return unauthorizedResponse();
    }

    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    const { query, language } = body as { query: string; language?: string };

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // @contract Fetch supported language codes from DB — used to filter search results
    const { data: supportedLangs } = await supabase.from('languages').select('code');
    const supportedCodes = new Set((supportedLangs ?? []).map((l) => l.code as string));

    // @sideeffect parallel TMDB API calls for movies + persons
    // @nullable language — when provided, filters movies by original_language
    const [allMovieResults, personResults] = await Promise.all([
      searchMovies(query, tmdb.apiKey, language || undefined),
      searchPersons(query, tmdb.apiKey),
    ]);

    // @contract Filter movie results to only supported languages
    const movieResults =
      supportedCodes.size > 0
        ? allMovieResults.filter(
            (m) => !m.original_language || supportedCodes.has(m.original_language),
          )
        : allMovieResults;

    // @sideeffect parallel DB lookups to mark existing items
    const movieTmdbIds = movieResults.map((m) => m.id);
    const personTmdbIds = personResults.map((p) => p.id);

    const [movieExisting, personExisting] = await Promise.all([
      movieTmdbIds.length > 0
        ? supabase.from('movies').select('tmdb_id').in('tmdb_id', movieTmdbIds)
        : { data: [] },
      personTmdbIds.length > 0
        ? supabase.from('actors').select('tmdb_person_id').in('tmdb_person_id', personTmdbIds)
        : { data: [] },
    ]);

    // @sideeffect check for potential title-based duplicates — movies in DB with matching
    // titles but no tmdb_id (manually added). Only check for TMDB movies not already matched.
    const existingTmdbIds = (movieExisting.data ?? []).map((r) => r.tmdb_id as number);
    const unmatchedTitles = movieResults
      .filter((m) => !existingTmdbIds.includes(m.id))
      .map((m) => m.title);
    let duplicateSuspects: Record<number, { id: string; title: string }> = {};
    if (unmatchedTitles.length > 0) {
      const { data: suspects } = await supabase
        .from('movies')
        .select('id, title, tmdb_id')
        .is('tmdb_id', null)
        .in('title', unmatchedTitles);
      if (suspects && suspects.length > 0) {
        const suspectMap = new Map(suspects.map((s) => [s.title.toLowerCase(), s]));
        for (const m of movieResults) {
          const match = suspectMap.get(m.title.toLowerCase());
          if (match) duplicateSuspects[m.id] = { id: match.id, title: match.title };
        }
      }
    }

    return NextResponse.json({
      movies: {
        results: movieResults,
        existingTmdbIds,
        duplicateSuspects,
      },
      actors: {
        results: personResults,
        existingTmdbPersonIds: (personExisting.data ?? []).map((r) => r.tmdb_person_id as number),
      },
    });
  } catch (err) {
    return errorResponse('Search', err);
  }
}
