'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminActor, useUpdateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { ArrowLeft, Loader2, Trash2, Save } from 'lucide-react';
import Link from 'next/link';
import { DEVICES } from '@shared/constants';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { ActorDetailPreview } from '@/components/preview/ActorDetailPreview';

export default function EditActorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: actor, isLoading } = useAdminActor(id);
  const updateActor = useUpdateActor();
  const deleteActor = useDeleteActor();
  const [device, setDevice] = useState(DEVICES[1]);

  const [form, setForm] = useState({
    name: '',
    photo_url: '',
    person_type: 'actor' as 'actor' | 'technician',
    birth_date: '',
    gender: '0',
    biography: '',
    place_of_birth: '',
    height_cm: '',
  });

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
  }

  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      await deleteActor.mutateAsync(id);
      router.push('/cast');
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
          <Link href="/cast" className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Actor</h1>
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
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Photo URL</label>
              <input
                type="text"
                value={form.photo_url}
                onChange={(e) => updateField('photo_url', e.target.value)}
                className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
              />
              {form.photo_url && (
                <div className="mt-2">
                  <img
                    src={form.photo_url}
                    alt="Photo preview"
                    className="w-20 h-20 rounded-full object-cover border border-white/10"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1">Person Type</label>
                <select
                  value={form.person_type}
                  onChange={(e) => updateField('person_type', e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
                >
                  <option value="actor">Actor</option>
                  <option value="technician">Technician</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => updateField('birth_date', e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
                >
                  <option value="0">Not set</option>
                  <option value="1">Female</option>
                  <option value="2">Male</option>
                  <option value="3">Non-binary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={form.height_cm}
                  onChange={(e) => updateField('height_cm', e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Place of Birth</label>
              <input
                type="text"
                value={form.place_of_birth}
                onChange={(e) => updateField('place_of_birth', e.target.value)}
                className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Biography</label>
              <textarea
                rows={4}
                value={form.biography}
                onChange={(e) => updateField('biography', e.target.value)}
                className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm resize-none"
              />
            </div>
          </div>

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
