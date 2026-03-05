import { describe, it, expect } from 'vitest';
import { getChangedFields, formatDetails, actionStyles } from '@/components/audit/auditUtils';

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

describe('actionStyles', () => {
  it('has create, update, delete, and sync keys', () => {
    expect(Object.keys(actionStyles)).toEqual(['create', 'update', 'delete', 'sync']);
  });

  it('has correct create style', () => {
    expect(actionStyles.create).toEqual({
      bg: 'bg-green-600/20',
      text: 'text-green-400',
    });
  });

  it('has correct update style', () => {
    expect(actionStyles.update).toEqual({
      bg: 'bg-blue-600/20',
      text: 'text-blue-400',
    });
  });

  it('has correct delete style', () => {
    expect(actionStyles.delete).toEqual({
      bg: 'bg-red-600/20',
      text: 'text-red-400',
    });
  });

  it('has correct sync style', () => {
    expect(actionStyles.sync).toEqual({
      bg: 'bg-purple-600/20',
      text: 'text-purple-400',
    });
  });

  it('each entry has bg and text properties', () => {
    for (const style of Object.values(actionStyles)) {
      expect(style).toHaveProperty('bg');
      expect(style).toHaveProperty('text');
    }
  });
});
