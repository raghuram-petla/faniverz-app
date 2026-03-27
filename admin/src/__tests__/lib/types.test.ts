import { describe, it, expect } from 'vitest';
import { AUDIT_ENTITY_TYPES, ADMIN_ROLE_LABELS } from '@/lib/types';

describe('types runtime constants', () => {
  describe('AUDIT_ENTITY_TYPES', () => {
    it('is a non-empty array of strings', () => {
      expect(Array.isArray(AUDIT_ENTITY_TYPES)).toBe(true);
      expect(AUDIT_ENTITY_TYPES.length).toBeGreaterThan(0);
      for (const t of AUDIT_ENTITY_TYPES) {
        expect(typeof t).toBe('string');
      }
    });

    it('contains expected core tables', () => {
      expect(AUDIT_ENTITY_TYPES).toContain('movies');
      expect(AUDIT_ENTITY_TYPES).toContain('actors');
      expect(AUDIT_ENTITY_TYPES).toContain('platforms');
    });

    it('all entries are PostgreSQL table names', () => {
      for (const t of AUDIT_ENTITY_TYPES) {
        expect(typeof t).toBe('string');
        expect(t.length).toBeGreaterThan(0);
        // Table names use snake_case
        expect(t).toMatch(/^[a-z_]+$/);
      }
    });
  });

  describe('ADMIN_ROLE_LABELS', () => {
    it('maps all role ids to display labels', () => {
      expect(ADMIN_ROLE_LABELS.root).toBe('Root');
      expect(ADMIN_ROLE_LABELS.super_admin).toBe('Super Admin');
      expect(ADMIN_ROLE_LABELS.admin).toBe('Faniverz Admin');
      expect(ADMIN_ROLE_LABELS.production_house_admin).toBe('Production Admin');
      expect(ADMIN_ROLE_LABELS.viewer).toBe('Viewer');
    });

    it('has 5 roles defined', () => {
      expect(Object.keys(ADMIN_ROLE_LABELS)).toHaveLength(5);
    });
  });
});
