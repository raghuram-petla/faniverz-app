import { describe, it, expect } from 'vitest';
import {
  getChangedFields,
  formatDetails,
  actionStyles,
  getEntityDisplayName,
  canRevert,
  getRevertDescription,
} from '@/components/audit/auditUtils';
import { AUDIT_ENTITY_TYPES } from '@/lib/types';

describe('getChangedFields', () => {
  it('returns changed fields when old and new differ', () => {
    const details = {
      old: { title: 'Old Title', year: 2024 },
      new: { title: 'New Title', year: 2024 },
    };
    const result = getChangedFields(details);
    expect(result).toEqual({
      title: { from: 'Old Title', to: 'New Title' },
    });
  });

  it('returns multiple changed fields', () => {
    const details = {
      old: { title: 'Old', year: 2024, rating: 5 },
      new: { title: 'New', year: 2025, rating: 5 },
    };
    const result = getChangedFields(details);
    expect(result).toEqual({
      title: { from: 'Old', to: 'New' },
      year: { from: 2024, to: 2025 },
    });
  });

  it('returns null when no fields changed', () => {
    const details = {
      old: { title: 'Same', year: 2024 },
      new: { title: 'Same', year: 2024 },
    };
    expect(getChangedFields(details)).toBeNull();
  });

  it('returns null when old is missing', () => {
    const details = { new: { title: 'New' } };
    expect(getChangedFields(details)).toBeNull();
  });

  it('returns null when new is missing', () => {
    const details = { old: { title: 'Old' } };
    expect(getChangedFields(details)).toBeNull();
  });

  it('returns null when both old and new are missing', () => {
    expect(getChangedFields({})).toBeNull();
  });

  it('detects changes in nested objects via JSON comparison', () => {
    const details = {
      old: { meta: { tags: ['a', 'b'] } },
      new: { meta: { tags: ['a', 'c'] } },
    };
    const result = getChangedFields(details);
    expect(result).toEqual({
      meta: { from: { tags: ['a', 'b'] }, to: { tags: ['a', 'c'] } },
    });
  });

  it('detects added fields in new that are undefined in old', () => {
    const details = {
      old: { title: 'Same' },
      new: { title: 'Same', year: 2025 },
    };
    const result = getChangedFields(details);
    expect(result).toEqual({
      year: { from: undefined, to: 2025 },
    });
  });
});

describe('formatDetails', () => {
  it('returns diff JSON for update action with changes', () => {
    const details = {
      old: { title: 'Old' },
      new: { title: 'New' },
    };
    const result = formatDetails('update', details);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({
      title: { from: 'Old', to: 'New' },
    });
  });

  it('returns full details JSON for update with no changes', () => {
    const details = {
      old: { title: 'Same' },
      new: { title: 'Same' },
    };
    const result = formatDetails('update', details);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(details);
  });

  it('returns new data JSON for create action', () => {
    const details = {
      new: { title: 'Created Movie', year: 2025 },
    };
    const result = formatDetails('create', details);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ title: 'Created Movie', year: 2025 });
  });

  it('returns old data JSON for delete action', () => {
    const details = {
      old: { title: 'Deleted Movie', year: 2024 },
    };
    const result = formatDetails('delete', details);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ title: 'Deleted Movie', year: 2024 });
  });

  it('returns full details as fallback for unknown action', () => {
    const details = { some: 'data', other: 123 };
    const result = formatDetails('unknown', details);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(details);
  });

  it('returns full details for create without new field', () => {
    const details = { title: 'Something' };
    const result = formatDetails('create', details);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(details);
  });

  it('returns full details for delete without old field', () => {
    const details = { title: 'Something' };
    const result = formatDetails('delete', details);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(details);
  });

  it('formats output with 2-space indentation', () => {
    const details = { new: { title: 'Test' } };
    const result = formatDetails('create', details);
    expect(result).toBe(JSON.stringify({ title: 'Test' }, null, 2));
  });
});

describe('getEntityDisplayName', () => {
  it('returns title for movies from new', () => {
    expect(getEntityDisplayName('movies', { new: { title: 'Pushpa 2' } })).toBe('Pushpa 2');
  });

  it('returns name for actors from new', () => {
    expect(getEntityDisplayName('actors', { new: { name: 'Allu Arjun' } })).toBe('Allu Arjun');
  });

  it('returns name for platforms', () => {
    expect(getEntityDisplayName('platforms', { new: { name: 'Netflix' } })).toBe('Netflix');
  });

  it('returns name for production_houses', () => {
    expect(getEntityDisplayName('production_houses', { new: { name: 'Mythri' } })).toBe('Mythri');
  });

  it('returns role_name for movie_cast', () => {
    expect(getEntityDisplayName('movie_cast', { new: { role_name: 'Pushpa Raj' } })).toBe(
      'Pushpa Raj',
    );
  });

  it('returns title for notifications', () => {
    expect(getEntityDisplayName('notifications', { new: { title: 'New Release' } })).toBe(
      'New Release',
    );
  });

  it('returns title for surprise_content', () => {
    expect(getEntityDisplayName('surprise_content', { new: { title: 'BTS Video' } })).toBe(
      'BTS Video',
    );
  });

  it('returns title for movie_images', () => {
    expect(getEntityDisplayName('movie_images', { new: { title: 'First Look' } })).toBe(
      'First Look',
    );
  });

  it('returns image_type for movie_images when no title', () => {
    expect(getEntityDisplayName('movie_images', { new: { image_type: 'backdrop' } })).toBe(
      'backdrop',
    );
  });

  it('returns null for movie_theatrical_runs (resolved by DB view)', () => {
    expect(
      getEntityDisplayName('movie_theatrical_runs', { new: { movie_id: 'some-uuid' } }),
    ).toBeNull();
  });

  it('falls back to old when new is missing (delete)', () => {
    expect(getEntityDisplayName('movies', { old: { title: 'Deleted Movie' } })).toBe(
      'Deleted Movie',
    );
  });

  it('returns null when no details entity found', () => {
    expect(getEntityDisplayName('movies', {})).toBeNull();
  });

  it('returns null when name field is missing from entity', () => {
    expect(getEntityDisplayName('movies', { new: { year: 2025 } })).toBeNull();
  });

  it('tries title then name for unknown entity types', () => {
    expect(getEntityDisplayName('unknown_type', { new: { title: 'Test' } })).toBe('Test');
    expect(getEntityDisplayName('unknown_type', { new: { name: 'Test' } })).toBe('Test');
  });
});

describe('actionStyles', () => {
  it('has create, update, delete, and sync keys', () => {
    expect(Object.keys(actionStyles)).toEqual(['create', 'update', 'delete', 'sync']);
  });

  it('has correct create style', () => {
    expect(actionStyles.create).toEqual({
      bg: 'bg-green-600/20',
      text: 'text-status-green',
    });
  });

  it('has correct update style', () => {
    expect(actionStyles.update).toEqual({
      bg: 'bg-blue-600/20',
      text: 'text-status-blue',
    });
  });

  it('has correct delete style', () => {
    expect(actionStyles.delete).toEqual({
      bg: 'bg-red-600/20',
      text: 'text-status-red',
    });
  });

  it('has correct sync style', () => {
    expect(actionStyles.sync).toEqual({
      bg: 'bg-purple-600/20',
      text: 'text-status-purple',
    });
  });

  it('each entry has bg and text properties', () => {
    for (const style of Object.values(actionStyles)) {
      expect(style).toHaveProperty('bg');
      expect(style).toHaveProperty('text');
    }
  });
});

describe('canRevert', () => {
  it('returns true for update with old data', () => {
    expect(canRevert('update', { old: { title: 'X' }, new: { title: 'Y' } })).toBe(true);
  });

  it('returns true for create with new data', () => {
    expect(canRevert('create', { new: { title: 'X' } })).toBe(true);
  });

  it('returns true for delete with old data', () => {
    expect(canRevert('delete', { old: { title: 'X' } })).toBe(true);
  });

  it('returns false for sync action', () => {
    expect(canRevert('sync', { old: {}, new: {} })).toBe(false);
  });

  it('returns false for update without old data', () => {
    expect(canRevert('update', { new: { title: 'X' } })).toBe(false);
  });

  it('returns false for delete without old data', () => {
    expect(canRevert('delete', { new: { title: 'X' } })).toBe(false);
  });

  it('returns false for create without new data', () => {
    expect(canRevert('create', { old: { title: 'X' } })).toBe(false);
  });
});

describe('getRevertDescription', () => {
  it('returns correct description for update', () => {
    expect(getRevertDescription('update')).toBe('Restore previous values');
  });

  it('returns correct description for create', () => {
    expect(getRevertDescription('create')).toBe('Delete this entity');
  });

  it('returns correct description for delete', () => {
    expect(getRevertDescription('delete')).toBe('Re-create this entity');
  });

  it('returns fallback for unknown action', () => {
    expect(getRevertDescription('sync')).toBe('Revert this change');
  });
});

describe('getEntityDisplayName - additional edge cases', () => {
  it('returns null for movie_platforms (resolved by DB view)', () => {
    expect(getEntityDisplayName('movie_platforms', { new: { platform_id: 'p1' } })).toBeNull();
  });

  it('returns null for movie_platform_availability (resolved by DB view)', () => {
    expect(
      getEntityDisplayName('movie_platform_availability', { new: { platform_id: 'p1' } }),
    ).toBeNull();
  });

  it('returns null for movie_production_houses (resolved by DB view)', () => {
    expect(
      getEntityDisplayName('movie_production_houses', { new: { production_house_id: 'ph1' } }),
    ).toBeNull();
  });

  it('returns null for user_languages (resolved by DB view)', () => {
    expect(getEntityDisplayName('user_languages', { new: { language_id: 'l1' } })).toBeNull();
  });

  it('returns null for unknown entity without title or name', () => {
    expect(getEntityDisplayName('something_else', { new: { foo: 'bar' } })).toBeNull();
  });

  it('returns null for movie_images with neither title nor image_type', () => {
    expect(getEntityDisplayName('movie_images', { new: { display_order: 0 } })).toBeNull();
  });

  it('returns title for news_feed', () => {
    expect(getEntityDisplayName('news_feed', { new: { title: 'Breaking News' } })).toBe(
      'Breaking News',
    );
  });

  it('returns name for countries', () => {
    expect(getEntityDisplayName('countries', { new: { name: 'India' } })).toBe('India');
  });

  it('returns name for languages', () => {
    expect(getEntityDisplayName('languages', { new: { name: 'Telugu' } })).toBe('Telugu');
  });

  it('returns name for admin_roles', () => {
    expect(getEntityDisplayName('admin_roles', { new: { name: 'super_admin' } })).toBe(
      'super_admin',
    );
  });

  it('returns null for admin_user_roles (resolved by DB view)', () => {
    expect(
      getEntityDisplayName('admin_user_roles', {
        new: { user_id: '12345678-abcd-efgh-ijkl-mnopqrstuvwx' },
      }),
    ).toBeNull();
  });

  it('returns null for admin_ph_assignments (resolved by DB view)', () => {
    expect(
      getEntityDisplayName('admin_ph_assignments', {
        new: { user_id: 'abcdefgh-1234-5678-9012-ijklmnopqrst' },
      }),
    ).toBeNull();
  });

  it('returns email for admin_invitations', () => {
    expect(
      getEntityDisplayName('admin_invitations', { new: { email: 'admin@faniverz.com' } }),
    ).toBe('admin@faniverz.com');
  });

  it('returns image_type for movie_backdrops', () => {
    expect(getEntityDisplayName('movie_backdrops', { new: { image_type: 'backdrop' } })).toBe(
      'backdrop',
    );
  });

  it('returns keyword_name for movie_keywords', () => {
    expect(getEntityDisplayName('movie_keywords', { new: { keyword_name: 'action' } })).toBe(
      'action',
    );
  });

  it('returns title for movie_posters', () => {
    expect(getEntityDisplayName('movie_posters', { new: { title: 'First Look' } })).toBe(
      'First Look',
    );
  });

  it('returns title for movie_videos', () => {
    expect(getEntityDisplayName('movie_videos', { new: { title: 'Trailer' } })).toBe('Trailer');
  });
});

describe('getEntityDisplayName - null field branch coverage', () => {
  it('returns null for actors without name field', () => {
    expect(getEntityDisplayName('actors', { new: { id: 'abc' } })).toBeNull();
  });

  it('returns null for platforms without name field', () => {
    expect(getEntityDisplayName('platforms', { new: { id: 'p1' } })).toBeNull();
  });

  it('returns null for production_houses without name field', () => {
    expect(getEntityDisplayName('production_houses', { new: { id: 'ph1' } })).toBeNull();
  });

  it('returns null for countries without name field', () => {
    expect(getEntityDisplayName('countries', { new: { code: 'IN' } })).toBeNull();
  });

  it('returns null for languages without name field', () => {
    expect(getEntityDisplayName('languages', { new: { code: 'te' } })).toBeNull();
  });

  it('returns null for admin_roles without name field', () => {
    expect(getEntityDisplayName('admin_roles', { new: { id: 'role-1' } })).toBeNull();
  });

  it('returns null for admin_user_roles (always resolved by DB view)', () => {
    expect(getEntityDisplayName('admin_user_roles', { new: { role: 'admin' } })).toBeNull();
  });

  it('returns null for admin_ph_assignments (always resolved by DB view)', () => {
    expect(getEntityDisplayName('admin_ph_assignments', { new: { ph_id: 'ph-1' } })).toBeNull();
  });

  it('returns null for admin_invitations without email', () => {
    expect(getEntityDisplayName('admin_invitations', { new: { role: 'admin' } })).toBeNull();
  });

  it('returns null for movie_cast without role_name', () => {
    expect(getEntityDisplayName('movie_cast', { new: { actor_id: 'a1' } })).toBeNull();
  });

  it('returns null for movie_backdrops without image_type', () => {
    expect(getEntityDisplayName('movie_backdrops', { new: { display_order: 0 } })).toBeNull();
  });

  it('returns null for movie_keywords without keyword_name', () => {
    expect(getEntityDisplayName('movie_keywords', { new: { movie_id: 'm1' } })).toBeNull();
  });

  it('returns null for movie_posters without title', () => {
    expect(getEntityDisplayName('movie_posters', { new: { display_order: 0 } })).toBeNull();
  });

  it('returns null for movie_videos without title', () => {
    expect(getEntityDisplayName('movie_videos', { new: { youtube_id: 'abc' } })).toBeNull();
  });
});

// ── GUARDRAIL: Ensures every AUDIT_ENTITY_TYPES entry is explicitly handled ──
// If this test fails, a new entity type was added to AUDIT_ENTITY_TYPES without
// a corresponding case in getEntityDisplayName. This prevents future UUID display bugs.
describe('getEntityDisplayName - coverage guardrail', () => {
  // These entity types return null because the DB view resolves their names via JOINs
  const DB_VIEW_RESOLVED: ReadonlySet<string> = new Set([
    'admin_user_roles',
    'admin_ph_assignments',
    'movie_theatrical_runs',
    'movie_platforms',
    'movie_platform_availability',
    'movie_production_houses',
    'user_languages',
  ]);

  // Map each entity type to a sample detail object with the expected name field
  const ENTITY_SAMPLE_DETAILS: Record<string, Record<string, unknown>> = {
    movies: { new: { title: 'Test Movie' } },
    notifications: { new: { title: 'Test Notification' } },
    surprise_content: { new: { title: 'Test Content' } },
    news_feed: { new: { title: 'Test News' } },
    actors: { new: { name: 'Test Actor' } },
    platforms: { new: { name: 'Test Platform' } },
    production_houses: { new: { name: 'Test PH' } },
    countries: { new: { name: 'Test Country' } },
    languages: { new: { name: 'Test Language' } },
    admin_roles: { new: { name: 'test_role' } },
    admin_user_roles: { new: { user_id: '12345678-abcd' } }, // DB-view-resolved
    admin_ph_assignments: { new: { user_id: '12345678-abcd' } }, // DB-view-resolved
    admin_invitations: { new: { email: 'test@test.com' } },
    movie_cast: { new: { role_name: 'Test Role' } },
    movie_images: { new: { title: 'Test Image' } },
    movie_backdrops: { new: { image_type: 'backdrop' } },
    movie_posters: { new: { title: 'Test Poster' } },
    movie_videos: { new: { title: 'Test Video' } },
    movie_keywords: { new: { keyword_name: 'test' } },
    // DB-view-resolved types — these return null from getEntityDisplayName
    movie_theatrical_runs: { new: { movie_id: 'uuid' } },
    movie_platforms: { new: { platform_id: 'p1' } },
    movie_platform_availability: { new: { platform_id: 'p1' } },
    movie_production_houses: { new: { production_house_id: 'uuid' } },
    user_languages: { new: { language_id: 'uuid' } },
  };

  it('every AUDIT_ENTITY_TYPES entry has a sample in ENTITY_SAMPLE_DETAILS', () => {
    const missing = AUDIT_ENTITY_TYPES.filter((et) => !(et in ENTITY_SAMPLE_DETAILS));
    expect(missing).toEqual([]);
  });

  for (const entityType of AUDIT_ENTITY_TYPES) {
    if (DB_VIEW_RESOLVED.has(entityType)) {
      it(`${entityType} returns null (resolved by DB view)`, () => {
        const details = ENTITY_SAMPLE_DETAILS[entityType];
        expect(getEntityDisplayName(entityType, details)).toBeNull();
      });
    } else {
      it(`${entityType} returns a non-null display name`, () => {
        const details = ENTITY_SAMPLE_DETAILS[entityType];
        const result = getEntityDisplayName(entityType, details);
        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
        expect(result!.length).toBeGreaterThan(0);
      });
    }
  }
});

describe('canRevert - additional edge cases', () => {
  it('returns true for an unknown action with data (defaults to true)', () => {
    expect(canRevert('unknown_action', { old: { x: 1 } })).toBe(true);
  });

  it('returns false for update with empty details', () => {
    expect(canRevert('update', {})).toBe(false);
  });
});
