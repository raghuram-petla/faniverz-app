'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminActor, useUpdateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useFormChanges } from '@/hooks/useFormChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { DEVICES } from '@shared/constants';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { ActorDetailPreview } from '@/components/preview/ActorDetailPreview';
import { ActorFormFields } from '@/components/cast-edit/ActorFormFields';
import { usePermissions } from '@/hooks/usePermissions';
import type { ActorFormState } from '@/components/cast-edit/ActorFormFields';
import type { FieldConfig } from '@/hooks/useFormChanges';

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'photo_url', label: 'Photo', type: 'image' },
  {
    key: 'person_type',
    label: 'Type',
    type: 'select',
    options: { actor: 'Actor', technician: 'Technician' },
  },
  { key: 'birth_date', label: 'Date of Birth', type: 'date' },
  {
    key: 'gender',
    label: 'Gender',
    type: 'select',
    options: { '0': 'Not set', '1': 'Female', '2': 'Male', '3': 'Non-binary' },
  },
  { key: 'biography', label: 'Biography', type: 'text' },
  { key: 'place_of_birth', label: 'Place of Birth', type: 'text' },
  { key: 'height_cm', label: 'Height (cm)', type: 'number' },
];

export default function EditActorPage() {
  const { isReadOnly } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: actor, isLoading } = useAdminActor(id);
  const updateActor = useUpdateActor();
  const deleteActor = useDeleteActor();
  const [device, setDevice] = useState(DEVICES[1]);
  const { upload, uploading } = useImageUpload('/api/upload/actor-photo');

  const [form, setForm] = useState<ActorFormState>({
    name: '',
    photo_url: '',
    person_type: 'actor',
    birth_date: '',
    gender: '0',
    biography: '',
    place_of_birth: '',
    height_cm: '',
  });

  const initialFormRef = useRef<ActorFormState | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  useEffect(() => {
    if (actor) {
      const loaded: ActorFormState = {
        name: actor.name,
        photo_url: actor.photo_url ?? '',
        person_type: actor.person_type,
        birth_date: actor.birth_date ?? '',
        gender: String(actor.gender ?? 0),
        biography: actor.biography ?? '',
        place_of_birth: actor.place_of_birth ?? '',
        height_cm: actor.height_cm != null ? String(actor.height_cm) : '',
      };
      setForm(loaded);
      initialFormRef.current = loaded;
    }
  }, [actor]);

  const { changes, isDirty, changeCount } = useFormChanges(
    FIELD_CONFIG,
    initialFormRef.current,
    form,
  );

  useUnsavedChangesWarning(isDirty);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePhotoUpload(file: File) {
    try {
      const url = await upload(file);
      updateField('photo_url', url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      await updateActor.mutateAsync({
        id,
        name: form.name,
        photo_url: form.photo_url || null,
        person_type: form.person_type,
        birth_date: form.birth_date || null,
        gender: Number(form.gender),
        biography: form.biography || null,
        place_of_birth: form.place_of_birth || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
      });
      initialFormRef.current = { ...form };
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('idle');
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    }
  }

  const handleDiscard = useCallback(() => {
    if (initialFormRef.current) setForm(initialFormRef.current);
  }, []);

  const handleRevertField = useCallback((key: string) => {
    if (!initialFormRef.current) return;
    setForm((prev) => ({ ...prev, [key]: initialFormRef.current![key as keyof ActorFormState] }));
  }, []);

  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        await deleteActor.mutateAsync(id);
        router.push('/cast');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        alert(`Delete failed: ${msg}`);
      }
    }
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-status-red animate-spin" />
      </div>
    );

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cast" className="p-2 rounded-lg bg-input hover:bg-input-active">
            <ArrowLeft className="w-4 h-4 text-on-surface" />
          </Link>
          <h1 className="text-2xl font-bold text-on-surface">Edit Actor</h1>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-600/20 text-status-red px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600/30"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      <div className={`flex gap-8${isReadOnly ? ' pointer-events-none opacity-70' : ''}`}>
        <div className="flex-1 min-w-0 space-y-4">
          <ActorFormFields
            form={form}
            uploading={uploading}
            onFieldChange={updateField}
            onPhotoUpload={handlePhotoUpload}
          />
        </div>

        <div className="w-[340px] shrink-0 sticky top-6 self-start space-y-4">
          <DeviceSelector selected={device} onChange={setDevice} />
          <div className="flex justify-center">
            <DeviceFrame device={device}>
              <ActorDetailPreview
                name={form.name}
                photoUrl={form.photo_url}
                personType={form.person_type}
                gender={Number(form.gender)}
                birthDate={form.birth_date}
                placeOfBirth={form.place_of_birth}
                heightCm={form.height_cm ? Number(form.height_cm) : null}
                biography={form.biography}
              />
            </DeviceFrame>
          </div>
        </div>
      </div>

      <FormChangesDock
        changes={changes}
        changeCount={changeCount}
        saveStatus={saveStatus}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onRevertField={handleRevertField}
      />
    </div>
  );
}
