/** TMDB API response types and helper mappings. Pure types + small pure functions. */

// ── Core movie/person types ─────────────────────────────────────────────────

export interface TmdbDiscoverMovie {
  id: number;
  title: string;
  release_date: string; // "YYYY-MM-DD"
  poster_path: string | null;
  original_language: string; // ISO 639-1 code (e.g. "te", "hi", "en")
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
  gender: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  gender: number;
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  name: string;
  published_at: string;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbSpokenLanguage {
  iso_639_1: string;
  english_name: string;
  name: string;
}

export interface TmdbCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  original_language: string;
  genres: TmdbGenre[];
  poster_path: string | null;
  backdrop_path: string | null;
  tagline: string;
  status: string;
  vote_average: number;
  vote_count: number;
  budget: number;
  revenue: number;
  popularity: number;
  production_companies: TmdbProductionCompany[];
  spoken_languages: TmdbSpokenLanguage[];
  belongs_to_collection: TmdbCollection | null;
  credits: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
  videos: {
    results: TmdbVideo[];
  };
}

export interface TmdbPerson {
  id: number;
  name: string;
  birthday: string | null;
  profile_path: string | null;
  biography: string | null;
  place_of_birth: string | null;
  gender: number;
  imdb_id: string | null;
  also_known_as: string[];
  deathday: string | null;
  known_for_department: string | null;
  external_ids?: { imdb_id: string | null; instagram_id: string | null; twitter_id: string | null };
}

export interface TmdbSearchPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
}

// ── Images endpoint types ───────────────────────────────────────────────────

export interface TmdbImage {
  file_path: string;
  width: number;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
}

export interface TmdbImagesResponse {
  posters: TmdbImage[];
  backdrops: TmdbImage[];
  logos: TmdbImage[];
}

// ── Watch providers types ───────────────────────────────────────────────────

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

/** @contract Full TMDB watch providers response — keyed by ISO 3166-1 country code */
export interface TmdbCountryProviders {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
}

export interface TmdbWatchProvidersResponse {
  results: Record<string, TmdbCountryProviders>;
}

// ── Keywords types ──────────────────────────────────────────────────────────

export interface TmdbKeyword {
  id: number;
  name: string;
}

// ── Extended movie detail (with optional append_to_response fields) ─────────

export interface TmdbTranslation {
  iso_639_1: string;
  data: { title: string; overview: string };
}

export interface TmdbExternalIds {
  imdb_id: string | null;
}

export interface TmdbRegionReleaseDate {
  certification: string;
  type: number; // 1=Premiere, 2=Theatrical (limited), 3=Theatrical, 4=Digital, 5=Physical, 6=TV
  release_date: string;
}

export interface TmdbReleaseDatesResult {
  iso_3166_1: string;
  release_dates: TmdbRegionReleaseDate[];
}

export interface TmdbMovieDetailExtended extends TmdbMovieDetail {
  external_ids?: TmdbExternalIds;
  translations?: { translations: TmdbTranslation[] };
  keywords?: { keywords: TmdbKeyword[] };
  release_dates?: { results: TmdbReleaseDatesResult[] };
}

// ── Enriched crew member (after mapping through CREW_JOB_MAP) ───────────────

export interface EnrichedCrewMember extends TmdbCrewMember {
  roleName: string;
  roleOrder: number;
}

// ── Crew role mapping ─────────────────────────────────────────────────────────

// @coupling: these job titles must match TMDB's exact English strings — TMDB does not
// localize crew.job values even for non-English movies. Syncing a Telugu movie still
// returns "Director", "Producer", etc. in English.
// @edge: roles sharing the same roleOrder (e.g. Producer/Executive Producer) are deduped
// in extractKeyCrewMembers by `${id}-${roleOrder}`.
export const CREW_JOB_MAP: Record<string, { roleName: string; roleOrder: number }> = {
  Director: { roleName: 'Director', roleOrder: 1 },
  Producer: { roleName: 'Producer', roleOrder: 2 },
  'Executive Producer': { roleName: 'Producer', roleOrder: 2 },
  'Original Music Composer': { roleName: 'Music Director', roleOrder: 3 },
  'Director of Photography': { roleName: 'Director of Photography', roleOrder: 4 },
  Cinematography: { roleName: 'Director of Photography', roleOrder: 4 },
  Editor: { roleName: 'Editor', roleOrder: 5 },
  Screenplay: { roleName: 'Writer', roleOrder: 6 },
  Writer: { roleName: 'Writer', roleOrder: 6 },
  'Art Direction': { roleName: 'Art Director', roleOrder: 7 },
  'Production Design': { roleName: 'Art Director', roleOrder: 7 },
  Choreographer: { roleName: 'Choreographer', roleOrder: 8 },
  'Stunt Coordinator': { roleName: 'Stunt Director', roleOrder: 9 },
  'Costume Design': { roleName: 'Costume Designer', roleOrder: 10 },
  Casting: { roleName: 'Casting Director', roleOrder: 11 },
};

// ── Pure helper functions ───────────────────────────────────────────────────

/** Returns deduplicated crew for all mapped roles. */
export function extractKeyCrewMembers(crew: TmdbCrewMember[]): EnrichedCrewMember[] {
  const seen = new Set<string>();
  const result: EnrichedCrewMember[] = [];

  for (const member of crew) {
    const mapping = CREW_JOB_MAP[member.job];
    if (!mapping) continue;
    const key = `${member.id}-${mapping.roleOrder}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...member, ...mapping });
  }
  return result;
}

// @edge: returns the FIRST video with type='Trailer' and site='YouTube'. If TMDB
// has multiple trailers, only the first is stored. Teasers are ignored.
export function extractTrailerUrl(videos: TmdbVideo[]): string | null {
  const trailer = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

/** @nullable: returns nulls if no Telugu translation exists. */
export function extractTeluguTranslation(translations?: { translations: TmdbTranslation[] }): {
  titleTe: string | null;
  synopsisTe: string | null;
} {
  if (!translations?.translations) return { titleTe: null, synopsisTe: null };
  const te = translations.translations.find((t) => t.iso_639_1 === 'te');
  if (!te) return { titleTe: null, synopsisTe: null };
  return {
    titleTe: te.data.title || null,
    synopsisTe: te.data.overview || null,
  };
}

/** Map TMDB video type strings to our video_type enum. */
export function mapTmdbVideoType(tmdbType: string): string {
  const map: Record<string, string> = {
    Trailer: 'trailer',
    Teaser: 'teaser',
    Clip: 'other',
    'Behind the Scenes': 'bts',
    Featurette: 'making',
    Bloopers: 'other',
  };
  return map[tmdbType] ?? 'other';
}

/** Extract India CBFC certification from TMDB release_dates.
 * @edge: maps "U/A" → "UA" to match our DB constraint. */
export function extractIndiaCertification(
  releaseDates?: TmdbMovieDetailExtended['release_dates'],
): 'U' | 'UA' | 'A' | null {
  if (!releaseDates?.results) return null;
  const india = releaseDates.results.find((r) => r.iso_3166_1 === 'IN');
  if (!india) return null;

  // Prefer theatrical release (type 3), then any release with a certification
  const theatrical = india.release_dates.find((rd) => rd.type === 3 && rd.certification);
  const cert =
    theatrical?.certification || india.release_dates.find((rd) => rd.certification)?.certification;
  if (!cert) return null;

  // @edge: TMDB uses "U/A" for UA certification; normalize
  const CERT_MAP: Record<string, 'U' | 'UA' | 'A'> = {
    U: 'U',
    'U/A': 'UA',
    UA: 'UA',
    A: 'A',
  };
  return CERT_MAP[cert.trim()] ?? null;
}
