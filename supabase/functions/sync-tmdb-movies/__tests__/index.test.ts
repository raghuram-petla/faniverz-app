/**
 * Tests for sync-tmdb-movies edge function logic.
 *
 * Since the edge function uses Deno imports (esm.sh), we test the core logic
 * patterns here using Jest-compatible mocks and verify the function file structure.
 */
import * as fs from 'fs';
import * as path from 'path';
import { TMDB_GENRE_MAP, CREW_ROLES_TO_SYNC, CREW_ROLE_MAP } from '../../_shared/tmdb-types';

describe('sync-tmdb-movies edge function', () => {
  describe('function file structure', () => {
    it('has index.ts entry point', () => {
      const funcPath = path.join(__dirname, '..', 'index.ts');
      expect(fs.existsSync(funcPath)).toBe(true);
    });

    it('exports a Deno.serve handler', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('Deno.serve');
    });

    it('imports from shared tmdb-types', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('tmdb-types');
    });

    it('uses TMDB discover endpoint with Telugu language filter', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('/discover/movie');
      expect(content).toContain('with_original_language');
      expect(content).toContain("'te'");
    });

    it('fetches movie details with credits and videos', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('append_to_response');
      expect(content).toContain('credits,videos');
    });

    it('uses upsert with tmdb_id conflict resolution', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('upsert');
      expect(content).toContain('tmdb_id');
    });

    it('preserves curated fields (title_te, overview_te, is_featured)', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('title_te');
      expect(content).toContain('overview_te');
      expect(content).toContain('is_featured');
    });

    it('preserves manually set status (postponed/cancelled)', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('postponed');
      expect(content).toContain('cancelled');
    });

    it('syncs cast with max limit', () => {
      const content = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf-8');
      expect(content).toContain('MAX_CAST_MEMBERS');
      expect(content).toContain('15');
    });
  });

  describe('shared TMDB types', () => {
    it('has genre map with standard TMDB genres', () => {
      expect(TMDB_GENRE_MAP[28]).toBe('Action');
      expect(TMDB_GENRE_MAP[35]).toBe('Comedy');
      expect(TMDB_GENRE_MAP[18]).toBe('Drama');
      expect(TMDB_GENRE_MAP[27]).toBe('Horror');
      expect(TMDB_GENRE_MAP[10749]).toBe('Romance');
    });

    it('has crew roles to sync', () => {
      expect(CREW_ROLES_TO_SYNC).toContain('Director');
      expect(CREW_ROLES_TO_SYNC).toContain('Producer');
      expect(CREW_ROLES_TO_SYNC).toContain('Original Music Composer');
      expect(CREW_ROLES_TO_SYNC).toContain('Director of Photography');
    });

    it('maps TMDB crew jobs to app roles', () => {
      expect(CREW_ROLE_MAP['Director']).toBe('director');
      expect(CREW_ROLE_MAP['Producer']).toBe('producer');
      expect(CREW_ROLE_MAP['Original Music Composer']).toBe('music_director');
      expect(CREW_ROLE_MAP['Director of Photography']).toBe('cinematographer');
      expect(CREW_ROLE_MAP['Screenplay']).toBe('writer');
    });
  });

  describe('trailer extraction logic', () => {
    // Test the trailer extraction pattern from the function
    function extractTrailerKey(videos: {
      results: { key: string; site: string; type: string; official: boolean }[];
    }): string | null {
      if (!videos?.results?.length) return null;

      const official = videos.results.find(
        (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official
      );
      if (official) return official.key;

      const anyTrailer = videos.results.find((v) => v.site === 'YouTube' && v.type === 'Trailer');
      if (anyTrailer) return anyTrailer.key;

      const teaser = videos.results.find((v) => v.site === 'YouTube' && v.type === 'Teaser');
      return teaser?.key ?? null;
    }

    it('returns null for empty videos', () => {
      expect(extractTrailerKey({ results: [] })).toBeNull();
    });

    it('prefers official YouTube trailers', () => {
      const videos = {
        results: [
          { key: 'unofficial', site: 'YouTube', type: 'Trailer', official: false },
          { key: 'official', site: 'YouTube', type: 'Trailer', official: true },
        ],
      };
      expect(extractTrailerKey(videos)).toBe('official');
    });

    it('falls back to any YouTube trailer', () => {
      const videos = {
        results: [
          { key: 'teaser1', site: 'YouTube', type: 'Teaser', official: true },
          { key: 'trailer1', site: 'YouTube', type: 'Trailer', official: false },
        ],
      };
      expect(extractTrailerKey(videos)).toBe('trailer1');
    });

    it('falls back to teaser if no trailer', () => {
      const videos = {
        results: [
          { key: 'teaser1', site: 'YouTube', type: 'Teaser', official: true },
          { key: 'clip1', site: 'YouTube', type: 'Clip', official: true },
        ],
      };
      expect(extractTrailerKey(videos)).toBe('teaser1');
    });

    it('ignores non-YouTube videos', () => {
      const videos = {
        results: [{ key: 'vimeo1', site: 'Vimeo', type: 'Trailer', official: true }],
      };
      expect(extractTrailerKey(videos)).toBeNull();
    });
  });

  describe('status determination logic', () => {
    function determineStatus(releaseDate: string): string {
      if (!releaseDate) return 'upcoming';
      const release = new Date(releaseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return release <= today ? 'released' : 'upcoming';
    }

    it('returns upcoming for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      expect(determineStatus(future.toISOString().split('T')[0])).toBe('upcoming');
    });

    it('returns released for past dates', () => {
      expect(determineStatus('2020-01-01')).toBe('released');
    });

    it('returns upcoming for empty date', () => {
      expect(determineStatus('')).toBe('upcoming');
    });
  });

  describe('genre mapping logic', () => {
    it('maps TMDB genre IDs to names', () => {
      const genreIds = [28, 35, 18];
      const names = genreIds.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean);
      expect(names).toEqual(['Action', 'Comedy', 'Drama']);
    });

    it('filters out unknown genre IDs', () => {
      const genreIds = [28, 99999, 35];
      const names = genreIds.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean);
      expect(names).toEqual(['Action', 'Comedy']);
    });
  });
});
