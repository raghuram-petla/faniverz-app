import { describe, it, expect } from 'vitest';
import {
  extractKeyCrewMembers,
  extractTeluguTranslation,
  extractIndiaCertification,
  mapTmdbVideoType,
  TmdbCrewMember,
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

// ── extractIndiaCertification ────────────────────────────────────────────────

describe('extractIndiaCertification', () => {
  function makeReleaseDates(releases: { type: number; certification: string }[], country = 'IN') {
    return {
      results: [
        {
          iso_3166_1: country,
          release_dates: releases.map((r) => ({ ...r, release_date: '2024-01-01' })),
        },
      ],
    };
  }

  it('returns U for U certification', () => {
    const rd = makeReleaseDates([{ type: 3, certification: 'U' }]);
    expect(extractIndiaCertification(rd)).toBe('U');
  });

  it('returns UA for U/A certification (TMDB format)', () => {
    const rd = makeReleaseDates([{ type: 3, certification: 'U/A' }]);
    expect(extractIndiaCertification(rd)).toBe('UA');
  });

  it('returns UA for UA certification', () => {
    const rd = makeReleaseDates([{ type: 3, certification: 'UA' }]);
    expect(extractIndiaCertification(rd)).toBe('UA');
  });

  it('returns A for A certification', () => {
    const rd = makeReleaseDates([{ type: 3, certification: 'A' }]);
    expect(extractIndiaCertification(rd)).toBe('A');
  });

  it('returns null for unknown certification', () => {
    const rd = makeReleaseDates([{ type: 3, certification: 'R' }]);
    expect(extractIndiaCertification(rd)).toBeNull();
  });

  it('returns null when no IN country exists', () => {
    const rd = makeReleaseDates([{ type: 3, certification: 'PG-13' }], 'US');
    expect(extractIndiaCertification(rd)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(extractIndiaCertification(undefined)).toBeNull();
  });

  it('returns null when results is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(extractIndiaCertification({} as any)).toBeNull();
  });

  it('returns null when no certification is present', () => {
    const rd = makeReleaseDates([{ type: 3, certification: '' }]);
    expect(extractIndiaCertification(rd)).toBeNull();
  });

  it('prefers theatrical release (type 3) over others', () => {
    const rd = {
      results: [
        {
          iso_3166_1: 'IN',
          release_dates: [
            { type: 4, certification: 'A', release_date: '2024-01-01' },
            { type: 3, certification: 'U', release_date: '2024-01-01' },
          ],
        },
      ],
    };
    expect(extractIndiaCertification(rd)).toBe('U');
  });

  it('falls back to any release with certification when no type 3', () => {
    const rd = {
      results: [
        {
          iso_3166_1: 'IN',
          release_dates: [
            { type: 1, certification: '', release_date: '2024-01-01' },
            { type: 4, certification: 'UA', release_date: '2024-01-01' },
          ],
        },
      ],
    };
    expect(extractIndiaCertification(rd)).toBe('UA');
  });

  it('trims whitespace from certification', () => {
    const rd = makeReleaseDates([{ type: 3, certification: ' U ' }]);
    expect(extractIndiaCertification(rd)).toBe('U');
  });
});
