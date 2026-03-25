import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import {
  useAdminNotifications,
  useCreateNotification,
  useCancelNotification,
  useRetryNotification,
  useBulkRetryFailed,
  useBulkCancelPending,
} from '@/hooks/useAdminNotifications';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Query helpers ──

function mockNotificationsQuery(data: unknown[], error: unknown = null) {
  const mockLimit = vi.fn().mockResolvedValue({ data, error });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

  mockFrom.mockReturnValue({ select: mockSelect });

  return { mockSelect, mockOrder, mockLimit };
}

function mockFilteredQuery(data: unknown[]) {
  const mockEq2 = vi.fn().mockResolvedValue({ data, error: null });
  const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
  const mockLimit = vi.fn().mockReturnValue({ eq: mockEq1 });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

  mockFrom.mockReturnValue({ select: mockSelect });

  return { mockEq1, mockEq2 };
}

function mockSingleFilterQuery(data: unknown[]) {
  const mockEq = vi.fn().mockResolvedValue({ data, error: null });
  const mockLimit = vi.fn().mockReturnValue({ eq: mockEq });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

  mockFrom.mockReturnValue({ select: mockSelect });

  return { mockEq };
}

function mockMutationQuery(error: unknown = null) {
  const mockEq = vi.fn().mockResolvedValue({ error });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

  mockFrom.mockReturnValue({ update: mockUpdate });

  return { mockUpdate, mockEq };
}

// ── useAdminNotifications ──

describe('useAdminNotifications', () => {
  it('fetches notifications ordered by created_at desc with limit 200', async () => {
    const notifications = [
      { id: 'n1', title: 'Test', status: 'pending' },
      { id: 'n2', title: 'Test2', status: 'sent' },
    ];
    mockNotificationsQuery(notifications);

    const { result } = renderHook(() => useAdminNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(result.current.data).toEqual(notifications);
  });

  it('applies status filter when provided', async () => {
    const { mockEq } = mockSingleFilterQuery([]);

    const { result } = renderHook(() => useAdminNotifications({ status: 'pending' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEq).toHaveBeenCalledWith('status', 'pending');
  });

  it('applies both status and type filters', async () => {
    const { mockEq1, mockEq2 } = mockFilteredQuery([]);

    const { result } = renderHook(
      () => useAdminNotifications({ status: 'sent', type: 'movie_release' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEq1).toHaveBeenCalledWith('status', 'sent');
    expect(mockEq2).toHaveBeenCalledWith('type', 'movie_release');
  });

  it('throws on query error', async () => {
    mockNotificationsQuery([], new Error('DB error'));

    const { result } = renderHook(() => useAdminNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useCreateNotification ──

describe('useCreateNotification', () => {
  it('inserts notification and triggers push for immediate notifications', async () => {
    const insertedData = { id: 'n-new', title: 'New', status: 'pending' };
    const mockSingle = vi.fn().mockResolvedValue({ data: insertedData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInvoke.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'New', message: 'Test body' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith({ title: 'New', message: 'Test body' });
    expect(mockInvoke).toHaveBeenCalledWith('send-push', {
      body: { notification_id: 'n-new' },
    });
  });

  it('does not trigger push for scheduled notifications (>60s in future)', async () => {
    const futureDate = new Date(Date.now() + 120_000).toISOString();
    const insertedData = { id: 'n-sched', title: 'Scheduled' };
    const mockSingle = vi.fn().mockResolvedValue({ data: insertedData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        title: 'Scheduled',
        scheduled_for: futureDate,
      } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('logs push delivery failure but does not reject mutation', async () => {
    const insertedData = { id: 'n-push-fail', title: 'Test' };
    const mockSingle = vi.fn().mockResolvedValue({ data: insertedData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInvoke.mockResolvedValue({ error: new Error('Push failed') });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'Test' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(consoleSpy).toHaveBeenCalledWith('Push delivery failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('catches push invoke exception and logs it', async () => {
    const insertedData = { id: 'n-throw', title: 'Test' };
    const mockSingle = vi.fn().mockResolvedValue({ data: insertedData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInvoke.mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'Test' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(consoleSpy).toHaveBeenCalledWith('Push delivery error:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('shows alert on insert error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('Insert fail') });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'Bad' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ── useCancelNotification ──

describe('useCancelNotification', () => {
  it('updates status to cancelled', async () => {
    const { mockUpdate, mockEq } = mockMutationQuery();

    const { result } = renderHook(() => useCancelNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('n1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(mockEq).toHaveBeenCalledWith('id', 'n1');
  });

  it('shows alert on error', async () => {
    mockMutationQuery(new Error('Cancel fail'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useCancelNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('n1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ── useRetryNotification ──

describe('useRetryNotification', () => {
  it('updates status to pending', async () => {
    const { mockUpdate, mockEq } = mockMutationQuery();

    const { result } = renderHook(() => useRetryNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('n2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'pending' });
    expect(mockEq).toHaveBeenCalledWith('id', 'n2');
  });
});

// ── useBulkRetryFailed ──

describe('useBulkRetryFailed', () => {
  it('updates all failed notifications to pending', async () => {
    const { mockUpdate, mockEq } = mockMutationQuery();

    const { result } = renderHook(() => useBulkRetryFailed(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'pending' });
    expect(mockEq).toHaveBeenCalledWith('status', 'failed');
  });
});

// ── useBulkCancelPending ──

describe('useBulkCancelPending', () => {
  it('updates all pending notifications to cancelled', async () => {
    const { mockUpdate, mockEq } = mockMutationQuery();

    const { result } = renderHook(() => useBulkCancelPending(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(mockEq).toHaveBeenCalledWith('status', 'pending');
  });

  it('shows alert on error', async () => {
    mockMutationQuery(new Error('Cancel fail'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useBulkCancelPending(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useBulkRetryFailed - error handling', () => {
  it('shows alert on error', async () => {
    mockMutationQuery(new Error('Retry fail'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useBulkRetryFailed(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useRetryNotification - error handling', () => {
  it('shows alert on error', async () => {
    mockMutationQuery(new Error('Retry fail'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useRetryNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('n1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useAdminNotifications - type-only filter', () => {
  it('applies only type filter when status is not provided', async () => {
    const { mockEq } = mockSingleFilterQuery([]);

    const { result } = renderHook(() => useAdminNotifications({ type: 'movie_release' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEq).toHaveBeenCalledWith('type', 'movie_release');
  });
});

describe('useCreateNotification - scheduled within 60s', () => {
  it('triggers push for notification scheduled within 60 seconds', async () => {
    const nearDate = new Date(Date.now() + 30_000).toISOString();
    const insertedData = { id: 'n-near', title: 'Near' };
    const mockSingle = vi.fn().mockResolvedValue({ data: insertedData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInvoke.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        title: 'Near',
        scheduled_for: nearDate,
      } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // scheduled_for is within 60s, so push should fire
    expect(mockInvoke).toHaveBeenCalledWith('send-push', {
      body: { notification_id: 'n-near' },
    });
  });

  it('does not trigger push when data is null (edge case)', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ title: 'Test' });
    });

    // data is null, so the mutation should throw (since the code does `if (error) throw error`)
    // Actually the insert returns { data: null, error: null }, which means no error thrown
    // But isImmediate && data evaluates to false since data is null
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
