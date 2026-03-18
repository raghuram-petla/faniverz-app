import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSyncLog, completeSyncLog } from '@/lib/sync-log';

function createMockSupabase() {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  const mockEq = vi.fn();
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
  });

  return {
    supabase: { from: mockFrom } as unknown as SupabaseClient,
    mocks: { mockFrom, mockInsert, mockSelect, mockSingle, mockUpdate, mockEq },
  };
}

describe('createSyncLog', () => {
  let supabase: SupabaseClient;
  let mocks: ReturnType<typeof createMockSupabase>['mocks'];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    const created = createMockSupabase();
    supabase = created.supabase;
    mocks = created.mocks;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls from with sync_logs table', async () => {
    mocks.mockSingle.mockResolvedValue({ data: { id: 'log-1' }, error: null });

    await createSyncLog(supabase, 'test-function');

    expect(mocks.mockFrom).toHaveBeenCalledWith('sync_logs');
  });

  it('inserts with correct params', async () => {
    mocks.mockSingle.mockResolvedValue({ data: { id: 'log-1' }, error: null });

    await createSyncLog(supabase, 'discover-sync');

    expect(mocks.mockInsert).toHaveBeenCalledWith({
      function_name: 'discover-sync',
      status: 'running',
      started_at: '2024-06-15T12:00:00.000Z',
    });
  });

  it('selects id and returns single', async () => {
    mocks.mockSingle.mockResolvedValue({ data: { id: 'log-1' }, error: null });

    await createSyncLog(supabase, 'test-function');

    expect(mocks.mockSelect).toHaveBeenCalledWith('id');
  });

  it('returns the log id', async () => {
    mocks.mockSingle.mockResolvedValue({ data: { id: 'abc-123' }, error: null });

    const result = await createSyncLog(supabase, 'test-function');

    expect(result).toBe('abc-123');
  });

  it('throws on supabase error', async () => {
    mocks.mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    });

    await expect(createSyncLog(supabase, 'test-function')).rejects.toThrow(
      'Failed to create sync log: Insert failed',
    );
  });
});

describe('completeSyncLog', () => {
  let supabase: SupabaseClient;
  let mocks: ReturnType<typeof createMockSupabase>['mocks'];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T13:00:00.000Z'));
    const created = createMockSupabase();
    supabase = created.supabase;
    mocks = created.mocks;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls from with sync_logs table', async () => {
    mocks.mockEq.mockResolvedValue({ error: null });

    await completeSyncLog(supabase, 'log-1', { status: 'success' });

    expect(mocks.mockFrom).toHaveBeenCalledWith('sync_logs');
  });

  it('updates with correct params for success', async () => {
    mocks.mockEq.mockResolvedValue({ error: null });

    await completeSyncLog(supabase, 'log-1', {
      status: 'success',
      moviesAdded: 5,
      moviesUpdated: 3,
      details: ['Pushpa 2', 'Devara'],
    });

    expect(mocks.mockUpdate).toHaveBeenCalledWith({
      status: 'success',
      movies_added: 5,
      movies_updated: 3,
      errors: [],
      details: ['Pushpa 2', 'Devara'],
      completed_at: '2024-06-15T13:00:00.000Z',
    });
  });

  it('updates with correct params for failure with errors', async () => {
    mocks.mockEq.mockResolvedValue({ error: null });

    const errors = [{ tmdbId: 123, message: 'Not found' }];
    await completeSyncLog(supabase, 'log-1', {
      status: 'failed',
      errors,
    });

    expect(mocks.mockUpdate).toHaveBeenCalledWith({
      status: 'failed',
      movies_added: 0,
      movies_updated: 0,
      errors,
      details: [],
      completed_at: '2024-06-15T13:00:00.000Z',
    });
  });

  it('defaults moviesAdded and moviesUpdated to 0', async () => {
    mocks.mockEq.mockResolvedValue({ error: null });

    await completeSyncLog(supabase, 'log-1', { status: 'success' });

    expect(mocks.mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        movies_added: 0,
        movies_updated: 0,
      }),
    );
  });

  it('defaults errors to empty array when not provided', async () => {
    mocks.mockEq.mockResolvedValue({ error: null });

    await completeSyncLog(supabase, 'log-1', { status: 'success' });

    expect(mocks.mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [], details: [] }),
    );
  });

  it('defaults errors to empty array when errors array is empty', async () => {
    mocks.mockEq.mockResolvedValue({ error: null });

    await completeSyncLog(supabase, 'log-1', { status: 'success', errors: [] });

    expect(mocks.mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [], details: [] }),
    );
  });

  it('filters by sync log id', async () => {
    mocks.mockEq.mockResolvedValue({ error: null });

    await completeSyncLog(supabase, 'log-xyz', { status: 'success' });

    expect(mocks.mockEq).toHaveBeenCalledWith('id', 'log-xyz');
  });
});
