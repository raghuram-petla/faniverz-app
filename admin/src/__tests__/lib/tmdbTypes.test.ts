import { describe, it, expect } from 'vitest';
import {
  extractKeyCrewMembers,
  extractTrailerUrl,
  extractTeluguTranslation,
  mapTmdbVideoType,
  CREW_JOB_MAP,
  TmdbCrewMember,
  TmdbVideo,
} from '@/lib/tmdbTypes';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCrew(
  overrides: Partial<TmdbCrewMember> & { id: number; job: string },
): TmdbCrewMember {
  return {
    name: 'Person',
    department: 'Directing',
    profile_path: null,
    gender: 0,
    ...overrides,
  };
}

function makeVideo(overrides: Partial<TmdbVideo> = {}): TmdbVideo {
  return {
    key: 'abc123',
    site: 'YouTube',
    type: 'Trailer',
    name: 'Official Trailer',
    published_at: '2024-01-01',
    ...overrides,
  };
}

// ── extractKeyCrewMembers ──────────────────────────────────────────────────

describe('extractKeyCrewMembers', () => {
  it('maps known jobs to enriched crew members', () => {
    const crew = [makeCrew({ id: 1, job: 'Director' })];
    const result = extractKeyCrewMembers(crew);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      roleName: 'Director',
      roleOrder: 1,
    });
  });

  it('skips unknown jobs', () => {
    const crew = [makeCrew({ id: 1, job: 'Catering' })];
    const result = extractKeyCrewMembers(crew);
    expect(result).toHaveLength(0);
  });

  it('deduplicates by id + roleOrder', () => {
    const crew = [
      makeCrew({ id: 1, job: 'Producer', name: 'A' }),
      makeCrew({ id: 1, job: 'Executive Producer', name: 'A' }),
    ];
    const result = extractKeyCrewMembers(crew);
    // Both map to roleOrder 2, same id → only first kept
    expect(result).toHaveLength(1);
    expect(result[0].roleName).toBe('Producer');
  });

  it('keeps same person with different roleOrders', () => {
    const crew = [makeCrew({ id: 1, job: 'Director' }), makeCrew({ id: 1, job: 'Screenplay' })];
    const result = extractKeyCrewMembers(crew);
    // roleOrder 1 and 6 are different → both kept
    expect(result).toHaveLength(2);
  });

  it('keeps different people with the same role', () => {
    const crew = [
      makeCrew({ id: 1, job: 'Director', name: 'A' }),
      makeCrew({ id: 2, job: 'Director', name: 'B' }),
    ];
    const result = extractKeyCrewMembers(crew);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty crew', () => {
    expect(extractKeyCrewMembers([])).toEqual([]);
  });

  it('maps Cinematography and Director of Photography to same role', () => {
    const crew = [
      makeCrew({ id: 1, job: 'Cinematography' }),
      makeCrew({ id: 2, job: 'Director of Photography' }),
    ];
    const result = extractKeyCrewMembers(crew);
    expect(result).toHaveLength(2);
    expect(result[0].roleName).toBe('Director of Photography');
    expect(result[1].roleName).toBe('Director of Photography');
  });
});

// ── extractTrailerUrl ──────────────────────────────────────────────────────

describe('extractTrailerUrl', () => {
  it('returns YouTube trailer URL', () => {
    const videos = [makeVideo({ key: 'xyz789' })];
    expect(extractTrailerUrl(videos)).toBe('https://www.youtube.com/watch?v=xyz789');
  });

  it('ignores teasers', () => {
    const videos = [makeVideo({ type: 'Teaser', key: 'tease1' })];
    expect(extractTrailerUrl(videos)).toBeNull();
  });

  it('ignores non-YouTube trailers', () => {
    const videos = [makeVideo({ site: 'Vimeo' })];
    expect(extractTrailerUrl(videos)).toBeNull();
  });

  it('returns first trailer when multiple exist', () => {
    const videos = [makeVideo({ key: 'first' }), makeVideo({ key: 'second' })];
    expect(extractTrailerUrl(videos)).toBe('https://www.youtube.com/watch?v=first');
  });

  it('returns null for empty videos array', () => {
    expect(extractTrailerUrl([])).toBeNull();
  });

  it('skips non-matching videos and finds trailer', () => {
    const videos = [
      makeVideo({ type: 'Teaser', key: 'skip' }),
      makeVideo({ type: 'Clip', key: 'skip2' }),
      makeVideo({ type: 'Trailer', key: 'found' }),
    ];
    expect(extractTrailerUrl(videos)).toBe('https://www.youtube.com/watch?v=found');
  });
});

// ── extractTeluguTranslation ───────────────────────────────────────────────

describe('extractTeluguTranslation', () => {
  it('extracts Telugu title and synopsis', () => {
    const translations = {
      translations: [
        { iso_639_1: 'en', data: { title: 'English Title', overview: 'English overview' } },
        { iso_639_1: 'te', data: { title: 'తెలుగు టైటిల్', overview: 'తెలుగు సినాప్సిస్' } },
      ],
    };
    const result = extractTeluguTranslation(translations);
    expect(result.titleTe).toBe('తెలుగు టైటిల్');
    expect(result.synopsisTe).toBe('తెలుగు సినాప్సిస్');
  });

  it('returns nulls when Telugu not found', () => {
    const translations = {
      translations: [{ iso_639_1: 'en', data: { title: 'English', overview: 'Overview' } }],
    };
    expect(extractTeluguTranslation(translations)).toEqual({
      titleTe: null,
      synopsisTe: null,
    });
  });

  it('returns nulls for undefined input', () => {
    expect(extractTeluguTranslation(undefined)).toEqual({
      titleTe: null,
      synopsisTe: null,
    });
  });

  it('returns nulls when translations array is missing', () => {
    expect(extractTeluguTranslation({} as { translations: never[] })).toEqual({
      titleTe: null,
      synopsisTe: null,
    });
  });

  it('returns null for empty title/overview strings', () => {
    const translations = {
      translations: [{ iso_639_1: 'te', data: { title: '', overview: '' } }],
    };
    const result = extractTeluguTranslation(translations);
    expect(result.titleTe).toBeNull();
    expect(result.synopsisTe).toBeNull();
  });
});

// ── mapTmdbVideoType ───────────────────────────────────────────────────────

describe('mapTmdbVideoType', () => {
  it('maps Trailer to trailer', () => {
    expect(mapTmdbVideoType('Trailer')).toBe('trailer');
  });

  it('maps Teaser to teaser', () => {
    expect(mapTmdbVideoType('Teaser')).toBe('teaser');
  });

  it('maps Clip to other', () => {
    expect(mapTmdbVideoType('Clip')).toBe('other');
  });

  it('maps Behind the Scenes to bts', () => {
    expect(mapTmdbVideoType('Behind the Scenes')).toBe('bts');
  });

  it('maps Featurette to making', () => {
    expect(mapTmdbVideoType('Featurette')).toBe('making');
  });

  it('maps Bloopers to other', () => {
    expect(mapTmdbVideoType('Bloopers')).toBe('other');
  });

  it('returns other for unknown types', () => {
    expect(mapTmdbVideoType('Interview')).toBe('other');
    expect(mapTmdbVideoType('')).toBe('other');
  });
});

// ── CREW_JOB_MAP ───────────────────────────────────────────────────────────

describe('CREW_JOB_MAP', () => {
  it('contains all expected job titles', () => {
    const expectedJobs = [
      'Director',
      'Producer',
      'Executive Producer',
      'Original Music Composer',
      'Director of Photography',
      'Cinematography',
      'Editor',
      'Screenplay',
      'Writer',
      'Art Direction',
      'Production Design',
      'Choreographer',
      'Stunt Coordinator',
      'Costume Design',
      'Casting',
    ];
    for (const job of expectedJobs) {
      expect(CREW_JOB_MAP).toHaveProperty(job);
    }
  });

  it('has roleOrder values for ordering', () => {
    for (const mapping of Object.values(CREW_JOB_MAP)) {
      expect(mapping.roleOrder).toBeGreaterThan(0);
      expect(typeof mapping.roleName).toBe('string');
    }
  });

  it('Director has roleOrder 1 (highest priority)', () => {
    expect(CREW_JOB_MAP['Director'].roleOrder).toBe(1);
  });
});
