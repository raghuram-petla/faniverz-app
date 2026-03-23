import { unwrapList, unwrapOne } from '../supabaseQuery';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

describe('unwrapList', () => {
  it('returns data array on success', () => {
    const result = {
      data: [{ id: '1' }, { id: '2' }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as PostgrestResponse<{ id: string }>;

    expect(unwrapList(result)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns empty array when data is null', () => {
    const result = {
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as unknown as PostgrestResponse<{ id: string }>;

    expect(unwrapList(result)).toEqual([]);
  });

  it('throws on error', () => {
    const result = {
      data: null,
      error: { message: 'Something failed', details: '', hint: '', code: '42000' },
      count: null,
      status: 500,
      statusText: 'Error',
    } as PostgrestResponse<{ id: string }>;

    expect(() => unwrapList(result)).toThrow();
  });
});

describe('unwrapOne', () => {
  it('returns data on success', () => {
    const result = {
      data: { id: '1', name: 'Test' },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as PostgrestSingleResponse<{ id: string; name: string }>;

    expect(unwrapOne(result)).toEqual({ id: '1', name: 'Test' });
  });

  it('returns null when data is null', () => {
    const result = {
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as PostgrestSingleResponse<{ id: string }>;

    expect(unwrapOne(result)).toBeNull();
  });

  it('throws on error', () => {
    const result = {
      data: null,
      error: { message: 'Not found', details: '', hint: '', code: '42000' },
      count: null,
      status: 404,
      statusText: 'Not Found',
    } as PostgrestSingleResponse<{ id: string }>;

    expect(() => unwrapOne(result)).toThrow();
  });
});
