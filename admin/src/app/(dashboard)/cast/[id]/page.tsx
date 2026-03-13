'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminActor, useUpdateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ArrowLeft, Loader2, Trash2, Save } from 'lucide-react';
import Link from 'next/link';
import { DEVICES } from '@shared/constants';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { ActorDetailPreview } from '@/components/preview/ActorDetailPreview';
import { ActorFormFields } from '@/components/cast-edit/ActorFormFields';
import type { ActorFormState } from '@/components/cast-edit/ActorFormFields';

export default function EditActorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: actor, isLoading } = useAdminActor(id);
  const updateActor = useUpdateActor();
  const deleteActor = useDeleteActor();
  const [device, setDevice] = useState(DEVICES[1]);
  // @boundary: uploads go through /api/upload/actor-photo which stores to Supabase Storage + generates variants
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

  // @sync: populates form from server data on first load; re-runs if actor refetches
  // @nullable: all optional fields default to empty string for controlled inputs
  useEffect(() => {
    if (actor) {
      setForm({
        name: actor.name,
        photo_url: actor.photo_url ?? '',
        person_type: actor.person_type,
        birth_date: actor.birth_date ?? '',
        gender: String(actor.gender ?? 0),
        biography: actor.biography ?? '',
        place_of_birth: actor.place_of_birth ?? '',
        height_cm: actor.height_cm != null ? String(actor.height_cm) : '',
      });
    }
  }, [actor]);

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

  // @sideeffect: updates actors row in Supabase, navigates to /cast on success
  // @edge: empty strings coerced to null for all optional fields; gender/height_cm converted from string to number
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      router.push('/cast');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    }
  }

  // @sideeffect: hard-deletes actor row — cascades to movie_cast join records
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
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
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
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600/30"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      <div className="flex gap-8">
        {/* Left column — Edit form */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-4">
          <ActorFormFields
            form={form}
            uploading={uploading}
            onFieldChange={updateField}
            onPhotoUpload={handlePhotoUpload}
          />

          <button
            type="submit"
            disabled={updateActor.isPending}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-700 flex items-center justify-center gap-2"
          >
            {updateActor.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </form>

        {/* Right column — Live preview */}
        {/* @coupling: ActorDetailPreview mirrors the mobile ActorDetail screen layout for WYSIWYG editing */}
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
    </div>
  );
}
