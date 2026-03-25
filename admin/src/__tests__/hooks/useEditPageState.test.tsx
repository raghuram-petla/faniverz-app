import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useEditPageState,
  type EditPageConfig,
  type EditPageHooks,
} from '@/hooks/useEditPageState';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

interface TestForm {
  name: string;
  description: string;
}

const FIELD_CONFIG = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'description', label: 'Description', type: 'text' as const },
];

const INITIAL_FORM: TestForm = { name: '', description: '' };

const defaultConfig: EditPageConfig<TestForm> = {
  id: 'test-id',
  fieldConfig: FIELD_CONFIG,
  initialForm: INITIAL_FORM,
  dataToForm: (data: unknown) => {
    const d = data as { name: string; description: string };
    return { name: d.name ?? '', description: d.description ?? '' };
  },
  formToPayload: (form, id) => ({ id, ...form }),
  deleteRoute: '/items',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEditPageState', () => {
  it('returns initial form state when no data loaded', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: undefined, isLoading: true },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    expect(result.current.form).toEqual(INITIAL_FORM);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('hydrates form from server data on first load', () => {
    const serverData = { name: 'Test Item', description: 'A description' };
    const hooks: EditPageHooks = {
      dataResult: { data: serverData, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    expect(result.current.form).toEqual({
      name: 'Test Item',
      description: 'A description',
    });
  });

  it('updateField updates a single field', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.updateField('name', 'Updated Name');
    });

    expect(result.current.form.name).toBe('Updated Name');
  });

  it('handleDiscard resets form to initial values', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Original', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.updateField('name', 'Changed');
    });
    expect(result.current.form.name).toBe('Changed');

    act(() => {
      result.current.handleDiscard();
    });
    expect(result.current.form.name).toBe('Original');
  });

  it('handleRevertField reverts a single field', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Original', description: 'Original Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.updateField('name', 'Changed');
      result.current.updateField('description', 'Changed Desc');
    });

    act(() => {
      result.current.handleRevertField('name');
    });

    expect(result.current.form.name).toBe('Original');
    expect(result.current.form.description).toBe('Changed Desc');
  });

  it('handleSave calls mutateAsync with transformed payload', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'test-id',
      name: 'Test',
      description: 'Desc',
    });
    expect(result.current.saveStatus).toBe('success');
  });

  it('handleSave shows error on failure', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Save error'));
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(alertSpy).toHaveBeenCalledWith('Save failed: Save error');
    expect(result.current.saveStatus).toBe('idle');
  });

  it('handleDelete is a no-op when no deleteMutation provided', async () => {
    const hooks: EditPageHooks = {
      dataResult: { data: undefined, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    expect(result.current.handleDelete).toBeInstanceOf(Function);
    // Should not throw when called without a delete mutation
    await act(async () => {
      await result.current.handleDelete();
    });
  });

  it('handleDelete calls deleteMutation and navigates on confirm', async () => {
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
      deleteMutation: { mutateAsync: deleteMutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleDelete!();
    });

    expect(deleteMutateAsync).toHaveBeenCalledWith('test-id');
    expect(mockPush).toHaveBeenCalledWith('/items');
  });

  it('handleDelete does nothing when confirm returns false', async () => {
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
      deleteMutation: { mutateAsync: deleteMutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(deleteMutateAsync).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handleDelete shows alert when deleteMutation throws', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const deleteMutateAsync = vi.fn().mockRejectedValue(new Error('Delete failed'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
      deleteMutation: { mutateAsync: deleteMutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(alertSpy).toHaveBeenCalledWith('Delete failed: Delete failed');
    alertSpy.mockRestore();
  });

  it('handleDelete shows JSON error message for non-Error exceptions', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const deleteMutateAsync = vi.fn().mockRejectedValue({ code: 42 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
      deleteMutation: { mutateAsync: deleteMutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('42'));
    alertSpy.mockRestore();
  });

  it('handleSave shows JSON error message for non-Error exceptions', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const mutateAsync = vi.fn().mockRejectedValue('string error');
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('string error'));
    alertSpy.mockRestore();
  });

  it('handleRevertField does nothing when initialFormRef is null', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: undefined, isLoading: true },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleRevertField('name');
    });
    // Should not throw — just no-op
    expect(result.current.form.name).toBe('');
  });

  it('handleDiscard does nothing when initialFormRef is null', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: undefined, isLoading: true },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleDiscard();
    });
    expect(result.current.form).toEqual(INITIAL_FORM);
  });

  it('uses custom deleteMessage when provided', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const config = { ...defaultConfig, deleteMessage: 'Custom delete message?' };
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
      deleteMutation: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
    };

    const { result } = renderHook(() => useEditPageState(config, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(confirmSpy).toHaveBeenCalledWith('Custom delete message?');
    confirmSpy.mockRestore();
  });

  it('resets isFirstLoadRef when id changes', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Initial', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result, rerender } = renderHook(
      (props: { config: EditPageConfig<TestForm>; hooks: EditPageHooks }) =>
        useEditPageState(props.config, props.hooks),
      {
        wrapper: createWrapper(),
        initialProps: { config: defaultConfig, hooks },
      },
    );

    expect(result.current.form.name).toBe('Initial');

    // User edits
    act(() => {
      result.current.updateField('name', 'User Edit');
    });

    // Change ID — simulates navigating to a different entity
    const newConfig = { ...defaultConfig, id: 'new-id' };
    const newHooks: EditPageHooks = {
      dataResult: { data: { name: 'New Entity', description: 'New Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };
    rerender({ config: newConfig, hooks: newHooks });

    // Form should be re-hydrated since id changed (isFirstLoad reset)
    expect(result.current.form.name).toBe('New Entity');
  });

  it('saveStatus resets to idle after 3 seconds on success', async () => {
    vi.useFakeTimers();
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Test', description: 'Desc' }, isLoading: false },
      updateMutation: { mutateAsync },
    };

    const { result } = renderHook(() => useEditPageState(defaultConfig, hooks), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.saveStatus).toBe('success');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.saveStatus).toBe('idle');

    vi.useRealTimers();
  });

  it('does not overwrite form on background refetch (isFirstLoadRef guard)', () => {
    const hooks: EditPageHooks = {
      dataResult: { data: { name: 'Initial', description: 'Initial Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };

    const { result, rerender } = renderHook(
      (props: { hooks: EditPageHooks }) => useEditPageState(defaultConfig, props.hooks),
      { wrapper: createWrapper(), initialProps: { hooks } },
    );

    // First load hydrates
    expect(result.current.form.name).toBe('Initial');

    // User edits
    act(() => {
      result.current.updateField('name', 'User Edit');
    });
    expect(result.current.form.name).toBe('User Edit');

    // Background refetch with new data — should NOT overwrite user edit
    const refreshedHooks: EditPageHooks = {
      dataResult: { data: { name: 'Refreshed', description: 'Refreshed Desc' }, isLoading: false },
      updateMutation: { mutateAsync: vi.fn() },
    };
    rerender({ hooks: refreshedHooks });
    expect(result.current.form.name).toBe('User Edit');
  });
});
