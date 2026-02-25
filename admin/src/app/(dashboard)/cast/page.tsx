'use client';
import { useState } from 'react';
import { useAdminActors, useCreateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { Plus, Trash2, Search, Loader2, Users } from 'lucide-react';

const TIER_RANK_OPTIONS = [
  { value: 1, label: '1 — A-list superstar' },
  { value: 2, label: '2 — Top star' },
  { value: 3, label: '3 — Popular star' },
  { value: 4, label: '4 — Character / supporting' },
  { value: 5, label: '5 — Newcomer' },
];

const EMPTY_FORM = {
  name: '',
  photo_url: '',
  birth_date: '',
  person_type: 'actor' as 'actor' | 'technician',
  tier_rank: '' as '' | number,
};

export default function CastPage() {
  const { data: actors = [], isLoading } = useAdminActors();
  const createActor = useCreateActor();
  const deleteActor = useDeleteActor();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = actors.filter(
    (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleAdd() {
    if (!form.name.trim()) return;
    await createActor.mutateAsync({
      name: form.name,
      photo_url: form.photo_url || null,
      birth_date: form.birth_date || null,
      person_type: form.person_type,
      tier_rank:
        form.person_type === 'actor' && form.tier_rank !== '' ? Number(form.tier_rank) : null,
    });
    setForm(EMPTY_FORM);
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Cast / Actors</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" /> Add Actor
        </button>
      </div>

      {showAdd && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
            />
            <input
              type="url"
              placeholder="Photo URL (optional)"
              value={form.photo_url}
              onChange={(e) => setForm((p) => ({ ...p, photo_url: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Person Type</label>
              <select
                value={form.person_type}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    person_type: e.target.value as 'actor' | 'technician',
                    tier_rank: '',
                  }))
                }
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
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
                onChange={(e) => setForm((p) => ({ ...p, birth_date: e.target.value }))}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
          {form.person_type === 'actor' && (
            <div>
              <label className="block text-xs text-white/40 mb-1">Industry Tier</label>
              <select
                value={form.tier_rank}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    tier_rank: e.target.value ? Number(e.target.value) : '',
                  }))
                }
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="">Select tier…</option>
                {TIER_RANK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={createActor.isPending}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {createActor.isPending ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setForm(EMPTY_FORM);
              }}
              className="text-white/60 px-4 py-2 rounded-lg text-sm hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search actors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((actor) => (
            <div
              key={actor.id}
              className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                {actor.photo_url ? (
                  <img src={actor.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-white/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{actor.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/40 capitalize">{actor.person_type}</span>
                  {actor.tier_rank != null && (
                    <span className="text-xs bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded">
                      Tier {actor.tier_rank}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete this actor?')) deleteActor.mutate(actor.id);
                }}
                className="p-2 rounded-lg text-white/40 hover:text-red-500 hover:bg-red-600/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-white/40 col-span-full text-center py-10">No actors found</p>
          )}
        </div>
      )}
    </div>
  );
}
