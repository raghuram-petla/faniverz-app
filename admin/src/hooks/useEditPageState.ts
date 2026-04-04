import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';
import { useFormChanges, type FieldConfig, type FieldChange } from './useFormChanges';

/**
 * @contract Encapsulates admin edit page boilerplate: form state, dirty tracking,
 * save/discard/delete handlers, and unsaved changes warning.
 * @assumes dataHook returns { data, isLoading } matching TanStack Query shape.
 */
interface EditPageConfig<TForm extends object> {
  /** The entity ID from route params */
  id: string;
  /** Field configuration for change tracking */
  fieldConfig: FieldConfig[];
  /** Initial empty form state */
  initialForm: TForm;
  /** Function to transform server data into form state */
  dataToForm: (data: unknown) => TForm;
  /** Function to transform form state into mutation payload */
  formToPayload: (form: TForm, id: string) => unknown;
  /** Route to navigate to after delete (e.g., '/cast') */
  deleteRoute: string;
  /** Delete confirmation message */
  deleteMessage?: string;
}

interface EditPageHooks {
  /** The data fetching hook result */
  dataResult: { data: unknown; isLoading: boolean; isError?: boolean; error?: unknown };
  /** The update mutation result */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMutation: { mutateAsync: (payload: any) => Promise<any> };
  /** The delete mutation result (optional) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteMutation?: { mutateAsync: (id: any) => Promise<any> };
}

interface EditPageStateReturn<TForm extends object> {
  form: TForm;
  setForm: React.Dispatch<React.SetStateAction<TForm>>;
  updateField: (key: keyof TForm, value: TForm[keyof TForm]) => void;
  saveStatus: 'idle' | 'saving' | 'success';
  isDirty: boolean;
  changes: FieldChange[];
  changeCount: number;
  isLoading: boolean;
  isError: boolean;
  loadError: unknown;
  handleSave: () => Promise<void>;
  handleDiscard: () => void;
  handleRevertField: (key: string) => void;
  handleDelete: () => Promise<void>;
}

/**
 * @contract Generic hook for admin edit pages. Manages form state, dirty tracking,
 * save/discard/delete, and unsaved changes warning.
 * @sideeffect Hydrates form from server data on first load; on refetches updates only initialFormRef.
 * @edge isFirstLoadRef prevents background refetches from overwriting unsaved edits.
 */
export function useEditPageState<TForm extends object>(
  config: EditPageConfig<TForm>,
  hooks: EditPageHooks,
): EditPageStateReturn<TForm> {
  const { id, fieldConfig, initialForm, dataToForm, formToPayload, deleteRoute, deleteMessage } =
    config;
  const { dataResult, updateMutation, deleteMutation } = hooks;
  const router = useRouter();

  const [form, setForm] = useState<TForm>(initialForm);
  const initialFormRef = useRef<TForm | null>(null);
  const isFirstLoadRef = useRef(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // @edge Ref avoids unstable useMutation return in useCallback deps
  const updateMutationRef = useRef(updateMutation);
  updateMutationRef.current = updateMutation;
  const deleteMutationRef = useRef(deleteMutation);
  deleteMutationRef.current = deleteMutation;

  // @edge Reset first-load flag when id changes (navigating between entities)
  useEffect(() => {
    isFirstLoadRef.current = true;
  }, [id]);

  // @sideeffect Hydrates form on first load; on refetches updates only initialFormRef
  useEffect(() => {
    if (dataResult.data) {
      const loaded = dataToForm(dataResult.data);
      if (isFirstLoadRef.current) {
        setForm(loaded);
        isFirstLoadRef.current = false;
      }
      initialFormRef.current = loaded;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataResult.data]);

  const { changes, isDirty, changeCount } = useFormChanges(
    fieldConfig,
    initialFormRef.current,
    form,
  );

  useUnsavedChangesWarning(isDirty);

  const updateField = useCallback((key: keyof TForm, value: TForm[keyof TForm]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // @sideeffect Clears save-success timer on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // @contract All string form fields coerced via formToPayload by the caller
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await updateMutationRef.current.mutateAsync(formToPayload(form, id));
      initialFormRef.current = { ...form };
      setSaveStatus('success');
      /* v8 ignore start */
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      /* v8 ignore stop */

      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('idle');
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    }
  }, [form, formToPayload, id]);

  const handleDiscard = useCallback(() => {
    if (initialFormRef.current) setForm(initialFormRef.current);
  }, []);

  const handleRevertField = useCallback((key: string) => {
    const initial = initialFormRef.current;
    if (!initial) return;
    setForm((prev) => ({ ...prev, [key]: initial[key as keyof TForm] }));
  }, []);

  const handleDelete = useCallback(async () => {
    const mut = deleteMutationRef.current;
    if (!mut) return;
    const msg = deleteMessage ?? 'Are you sure? This cannot be undone.';
    if (confirm(msg)) {
      try {
        await mut.mutateAsync(id);
        router.push(deleteRoute);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        alert(`Delete failed: ${errMsg}`);
      }
    }
  }, [id, deleteMessage, deleteRoute, router]);

  return {
    form,
    setForm,
    updateField,
    saveStatus,
    isDirty,
    changes,
    changeCount,
    isLoading: dataResult.isLoading,
    isError: dataResult.isError ?? false,
    loadError: dataResult.error,
    handleSave,
    handleDiscard,
    handleRevertField,
    handleDelete,
  };
}
