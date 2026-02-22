'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminCastDetail, useUpdateCast } from '@/hooks/useAdminCast';

export default function CastEditPage() {
  const params = useParams();
  const router = useRouter();
  const tmdbPersonId = Number(params.id);
  const { data: castEntries, isLoading } = useAdminCastDetail(tmdbPersonId);
  const updateCast = useUpdateCast();
  const [nameTe, setNameTe] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (!initialized && castEntries && castEntries.length > 0) {
    setNameTe((castEntries[0].name_te as string) ?? '');
    setInitialized(true);
  }

  const handleSave = () => {
    updateCast.mutate(
      { tmdbPersonId, updates: { name_te: nameTe } },
      { onSuccess: () => router.push('/cast') }
    );
  };

  if (isLoading) return <p>Loading...</p>;
  if (!castEntries || castEntries.length === 0) return <p>Cast member not found</p>;

  const person = castEntries[0];

  return (
    <div data-testid="cast-edit-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Cast Member</h1>

      <div className="max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name (TMDB)</label>
          <p className="mt-1 text-sm text-gray-900">{person.name as string}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Telugu Name</label>
          <input
            value={nameTe}
            onChange={(e) => setNameTe(e.target.value)}
            placeholder="Enter Telugu name"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Associated Movies</label>
          <div className="space-y-2">
            {castEntries.map((entry: Record<string, unknown>) => {
              const movie = entry.movies as Record<string, unknown> | null;
              return (
                <div
                  key={entry.id as number}
                  className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm"
                >
                  <span>{movie?.title as string}</span>
                  <span className="text-gray-500">
                    {entry.role as string} — {entry.character as string}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={updateCast.isPending}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {updateCast.isPending ? 'Saving...' : 'Save Telugu Name'}
          </button>
          <button
            onClick={() => router.push('/cast')}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
