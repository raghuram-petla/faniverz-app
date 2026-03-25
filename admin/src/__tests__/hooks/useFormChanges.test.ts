import { renderHook } from '@testing-library/react';
import { useFormChanges } from '@/hooks/useFormChanges';
import type { FieldConfig } from '@/hooks/useFormChanges';

const textFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'bio', label: 'Biography', type: 'text' },
];

describe('useFormChanges', () => {
  it('returns no changes when values are identical', () => {
    const values = { name: 'Alice', bio: 'Hello' };
    const { result } = renderHook(() => useFormChanges(textFields, values, values));
    expect(result.current.changes).toEqual([]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.changeCount).toBe(0);
  });

  it('returns no changes when initialValues is null', () => {
    const { result } = renderHook(() =>
      useFormChanges(textFields, null, { name: 'Alice', bio: '' }),
    );
    expect(result.current.changes).toEqual([]);
    expect(result.current.isDirty).toBe(false);
  });

  it('detects text field changes', () => {
    const initial = { name: 'Alice', bio: 'Old bio' };
    const current = { name: 'Bob', bio: 'Old bio' };
    const { result } = renderHook(() => useFormChanges(textFields, initial, current));
    expect(result.current.changeCount).toBe(1);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.changes[0]).toMatchObject({
      key: 'name',
      label: 'Name',
      oldDisplay: 'Alice',
      newDisplay: 'Bob',
    });
  });

  it('formats empty text as "(empty)"', () => {
    const initial = { name: 'Alice', bio: '' };
    const current = { name: '', bio: '' };
    const { result } = renderHook(() => useFormChanges(textFields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('Alice');
    expect(result.current.changes[0].newDisplay).toBe('(empty)');
  });

  it('detects boolean field changes and formats as Yes/No', () => {
    const fields: FieldConfig[] = [{ key: 'active', label: 'Active', type: 'boolean' }];
    const initial = { active: true };
    const current = { active: false };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('Yes');
    expect(result.current.changes[0].newDisplay).toBe('No');
  });

  it('detects date field changes and formats dates', () => {
    const fields: FieldConfig[] = [{ key: 'dob', label: 'Date of Birth', type: 'date' }];
    const initial = { dob: '2000-01-15' };
    const current = { dob: '2001-06-20' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toContain('2000');
    expect(result.current.changes[0].newDisplay).toContain('2001');
  });

  it('detects select field changes and uses options map', () => {
    const fields: FieldConfig[] = [
      { key: 'gender', label: 'Gender', type: 'select', options: { '1': 'Female', '2': 'Male' } },
    ];
    const initial = { gender: '1' };
    const current = { gender: '2' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('Female');
    expect(result.current.changes[0].newDisplay).toBe('Male');
  });

  it('detects image field changes and truncates URL', () => {
    const fields: FieldConfig[] = [{ key: 'photo', label: 'Photo', type: 'image' }];
    const initial = { photo: 'https://storage.example.com/actors/old-photo.jpg' };
    const current = { photo: 'https://storage.example.com/actors/new-photo.jpg' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('old-photo.jpg');
    expect(result.current.changes[0].newDisplay).toBe('new-photo.jpg');
  });

  it('detects number field changes', () => {
    const fields: FieldConfig[] = [{ key: 'height', label: 'Height', type: 'number' }];
    const initial = { height: '170' };
    const current = { height: '175' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('170');
    expect(result.current.changes[0].newDisplay).toBe('175');
  });

  it('detects multiple changes at once', () => {
    const initial = { name: 'Alice', bio: 'Old' };
    const current = { name: 'Bob', bio: 'New' };
    const { result } = renderHook(() => useFormChanges(textFields, initial, current));
    expect(result.current.changeCount).toBe(2);
  });

  it('handles null/undefined old values as empty', () => {
    const fields: FieldConfig[] = [{ key: 'photo', label: 'Photo', type: 'image' }];
    const initial = { photo: null };
    const current = { photo: 'https://example.com/photo.jpg' };
    const { result } = renderHook(() =>
      useFormChanges(fields, initial as Record<string, unknown>, current),
    );
    expect(result.current.changes[0].oldDisplay).toBe('(empty)');
  });

  it('formats boolean string "true" as Yes', () => {
    const fields: FieldConfig[] = [{ key: 'active', label: 'Active', type: 'boolean' }];
    const initial = { active: 'true' };
    const current = { active: 'false' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('Yes');
    expect(result.current.changes[0].newDisplay).toBe('No');
  });

  it('truncates long image filenames to 30 chars', () => {
    const fields: FieldConfig[] = [{ key: 'photo', label: 'Photo', type: 'image' }];
    const longName = 'a-very-long-filename-that-exceeds-thirty-characters.jpg';
    const initial = { photo: `https://cdn.example.com/${longName}` };
    const current = { photo: 'https://cdn.example.com/short.jpg' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe(`${longName.slice(0, 27)}...`);
    expect(result.current.changes[0].newDisplay).toBe('short.jpg');
  });

  it('handles invalid date value by returning the raw string', () => {
    const fields: FieldConfig[] = [{ key: 'dob', label: 'Date', type: 'date' }];
    const initial = { dob: 'not-a-date' };
    const current = { dob: '2024-01-01' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('not-a-date');
  });

  it('formats select field without matching option as raw value', () => {
    const fields: FieldConfig[] = [
      { key: 'status', label: 'Status', type: 'select', options: { active: 'Active' } },
    ];
    const initial = { status: 'unknown' };
    const current = { status: 'active' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('unknown');
    expect(result.current.changes[0].newDisplay).toBe('Active');
  });

  it('treats null and undefined as equal (both become empty string)', () => {
    const fields: FieldConfig[] = [{ key: 'name', label: 'Name', type: 'text' }];
    const initial = { name: null };
    const current = { name: undefined };
    const { result } = renderHook(() =>
      useFormChanges(
        fields,
        initial as Record<string, unknown>,
        current as Record<string, unknown>,
      ),
    );
    expect(result.current.isDirty).toBe(false);
  });

  it('formats select without options prop as raw value', () => {
    const fields: FieldConfig[] = [{ key: 'x', label: 'X', type: 'select' }];
    const initial = { x: 'a' };
    const current = { x: 'b' };
    const { result } = renderHook(() => useFormChanges(fields, initial, current));
    expect(result.current.changes[0].oldDisplay).toBe('a');
    expect(result.current.changes[0].newDisplay).toBe('b');
  });
});
