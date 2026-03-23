'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdminActor, useUpdateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { DEVICES } from '@shared/constants';
import type { Actor } from '@/lib/types';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { ActorDetailPreview } from '@/components/preview/ActorDetailPreview';
import { ActorFormFields } from '@/components/cast-edit/ActorFormFields';
import { usePermissions } from '@/hooks/usePermissions';
import { useEditPageState } from '@/hooks/useEditPageState';
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
  { key: 'tmdb_person_id', label: 'TMDB Person ID', type: 'number' },
];

const INITIAL_FORM: ActorFormState = {
  name: '',
  photo_url: '',
  person_type: 'actor',
  birth_date: '',
  gender: '0',
  biography: '',
  place_of_birth: '',
  height_cm: '',
  tmdb_person_id: '',
};

// @contract All string form fields coerced: empty string -> null for DB storage.
// @edge gender is stored as integer (0=not set, 1=female, 2=male, 3=non-binary) but
// form state holds it as a string for <select> compatibility.
function formToPayload(form: ActorFormState, id: string) {
  return {
    id,
    name: form.name,
    photo_url: form.photo_url || null,
    person_type: form.person_type,
    birth_date: form.birth_date || null,
    gender: Number(form.gender),
    biography: form.biography || null,
    place_of_birth: form.place_of_birth || null,
    height_cm: form.height_cm.trim() ? Number(form.height_cm) : null,
    tmdb_person_id: form.tmdb_person_id.trim() ? Number(form.tmdb_person_id) : null,
  };
}

function dataToForm(data: unknown): ActorFormState {
  const actor = data as Actor;
  return {
    name: actor.name,
    photo_url: actor.photo_url ?? '',
    person_type: actor.person_type,
    birth_date: actor.birth_date ?? '',
    gender: String(actor.gender ?? 0),
    biography: actor.biography ?? '',
    place_of_birth: actor.place_of_birth ?? '',
    height_cm: actor.height_cm != null ? String(actor.height_cm) : '',
    tmdb_person_id: actor.tmdb_person_id != null ? String(actor.tmdb_person_id) : '',
  };
}

export default function EditActorPage() {
  const { isReadOnly } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const dataResult = useAdminActor(id);
  const updateMutation = useUpdateActor();
  const deleteMutation = useDeleteActor();
  const [device, setDevice] = useState(DEVICES[1]);
  const { upload, uploading } = useImageUpload('/api/upload/actor-photo');

  const {
    form,
    updateField,
    saveStatus,
    changes,
    changeCount,
    isLoading,
    handleSave,
    handleDiscard,
    handleRevertField,
    handleDelete,
  } = useEditPageState<ActorFormState>(
    {
      id,
      fieldConfig: FIELD_CONFIG,
      initialForm: INITIAL_FORM,
      dataToForm,
      formToPayload,
      deleteRoute: '/cast',
    },
    { dataResult, updateMutation, deleteMutation },
  );

  async function handlePhotoUpload(file: File) {
    try {
      const url = await upload(file);
      updateField('photo_url', url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
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
            onFieldChange={(field, value) => updateField(field as keyof ActorFormState, value)}
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
