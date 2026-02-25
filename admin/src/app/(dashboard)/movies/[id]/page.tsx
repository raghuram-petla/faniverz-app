'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminMovie, useUpdateMovie, useDeleteMovie } from '@/hooks/useAdminMovies';
import { useMovieCast, useAdminActors, useAddCast, useRemoveCast } from '@/hooks/useAdminCast';
import { ArrowLeft, Loader2, Trash2, Plus, X } from 'lucide-react';
import Link from 'next/link';

const genres = [
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Family',
  'Adventure',
  'Historical',
];

const ROLE_ORDER_OPTIONS = [
  { value: 1, label: '1 — Director' },
  { value: 2, label: '2 — Producer' },
  { value: 3, label: '3 — Music Director' },
  { value: 4, label: '4 — Director of Photography' },
  { value: 5, label: '5 — Editor' },
  { value: 6, label: '6 — Art Director' },
  { value: 7, label: '7 — Stunt Choreographer' },
  { value: 8, label: '8 — Choreographer' },
  { value: 9, label: '9 — Lyricist' },
];

const EMPTY_CAST_FORM = {
  actor_id: '',
  credit_type: 'cast' as 'cast' | 'crew',
  role_name: '',
  role_order: '',
};

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: movie, isLoading } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();
  const { data: castData = [] } = useMovieCast(id);
  const { data: actors = [] } = useAdminActors();
  const addCast = useAddCast();
  const removeCast = useRemoveCast();
  const [castForm, setCastForm] = useState(EMPTY_CAST_FORM);
  const [form, setForm] = useState({
    title: '',
    poster_url: '',
    backdrop_url: '',
    release_date: '',
    runtime: '',
    genres: [] as string[],
    certification: '' as string,
    synopsis: '',
    director: '',
    trailer_url: '',
    release_type: 'upcoming' as string,
  });

  useEffect(() => {
    if (movie) {
      setForm({
        title: movie.title,
        poster_url: movie.poster_url ?? '',
        backdrop_url: movie.backdrop_url ?? '',
        release_date: movie.release_date,
        runtime: movie.runtime?.toString() ?? '',
        genres: movie.genres ?? [],
        certification: movie.certification ?? '',
        synopsis: movie.synopsis ?? '',
        director: movie.director ?? '',
        trailer_url: movie.trailer_url ?? '',
        release_type: movie.release_type,
      });
    }
  }, [movie]);

  function updateField(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleGenre(genre: string) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateMovie.mutateAsync({
      id,
      title: form.title,
      poster_url: form.poster_url || null,
      backdrop_url: form.backdrop_url || null,
      release_date: form.release_date,
      runtime: form.runtime ? Number(form.runtime) : null,
      genres: form.genres,
      certification: (form.certification || null) as 'U' | 'UA' | 'A' | null,
      synopsis: form.synopsis || null,
      director: form.director || null,
      trailer_url: form.trailer_url || null,
      release_type: form.release_type as 'theatrical' | 'ott' | 'upcoming',
    });
    router.push('/movies');
  }

  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      await deleteMovie.mutateAsync(id);
      router.push('/movies');
    }
  }

  async function handleAddCast(e: React.FormEvent) {
    e.preventDefault();
    if (!castForm.actor_id) return;
    await addCast.mutateAsync({
      movie_id: id,
      actor_id: castForm.actor_id,
      credit_type: castForm.credit_type,
      role_name: castForm.role_name || null,
      role_order:
        castForm.credit_type === 'crew' && castForm.role_order ? Number(castForm.role_order) : null,
      display_order: castData.length,
    });
    setCastForm(EMPTY_CAST_FORM);
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/movies" className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Movie</h1>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Release Date *</label>
            <input
              type="date"
              required
              value={form.release_date}
              onChange={(e) => updateField('release_date', e.target.value)}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Release Type *</label>
            <select
              value={form.release_type}
              onChange={(e) => updateField('release_type', e.target.value)}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="upcoming">Upcoming</option>
              <option value="theatrical">Theatrical</option>
              <option value="ott">OTT</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Runtime (min)</label>
            <input
              type="number"
              value={form.runtime}
              onChange={(e) => updateField('runtime', e.target.value)}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Certification</label>
            <select
              value={form.certification}
              onChange={(e) => updateField('certification', e.target.value)}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="">None</option>
              <option value="U">U</option>
              <option value="UA">UA</option>
              <option value="A">A</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Director</label>
          <input
            type="text"
            value={form.director}
            onChange={(e) => updateField('director', e.target.value)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Poster URL</label>
          <input
            type="url"
            value={form.poster_url}
            onChange={(e) => updateField('poster_url', e.target.value)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Backdrop URL</label>
          <input
            type="url"
            value={form.backdrop_url}
            onChange={(e) => updateField('backdrop_url', e.target.value)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Trailer URL</label>
          <input
            type="url"
            value={form.trailer_url}
            onChange={(e) => updateField('trailer_url', e.target.value)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Synopsis</label>
          <textarea
            rows={4}
            value={form.synopsis}
            onChange={(e) => updateField('synopsis', e.target.value)}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">Genres</label>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.genres.includes(genre) ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={updateMovie.isPending}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
        >
          {updateMovie.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
        </button>
      </form>

      {/* Cast & Crew Management */}
      <div className="space-y-4 mt-8">
        <h2 className="text-lg font-bold text-white">Cast &amp; Crew</h2>

        {/* Current entries */}
        {castData.length > 0 && (
          <div className="space-y-2">
            {castData.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
              >
                <span className="text-xs font-bold uppercase text-white/40 w-10">
                  {entry.credit_type === 'cast' ? 'Cast' : 'Crew'}
                </span>
                <span className="text-white font-medium flex-1">
                  {entry.actor?.name ?? entry.actor_id}
                </span>
                {entry.role_name && (
                  <span className="text-white/60 text-sm">{entry.role_name}</span>
                )}
                {entry.actor?.tier_rank != null && (
                  <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded">
                    Tier {entry.actor.tier_rank}
                  </span>
                )}
                {entry.role_order != null && (
                  <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
                    #{entry.role_order}
                  </span>
                )}
                <button
                  onClick={() => removeCast.mutate({ id: entry.id, movieId: id })}
                  className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                  aria-label={`Remove ${entry.actor?.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add entry form */}
        <form onSubmit={handleAddCast} className="bg-white/5 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white/60">Add Cast / Crew</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Type</label>
              <select
                value={castForm.credit_type}
                onChange={(e) =>
                  setCastForm((p) => ({
                    ...p,
                    credit_type: e.target.value as 'cast' | 'crew',
                    role_order: '',
                  }))
                }
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="cast">Cast (Actor)</option>
                <option value="crew">Crew (Technician)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Person *</label>
              <select
                required
                value={castForm.actor_id}
                onChange={(e) => setCastForm((p) => ({ ...p, actor_id: e.target.value }))}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="">Select person…</option>
                {actors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">
                {castForm.credit_type === 'cast' ? 'Character Name' : 'Role Title'}
              </label>
              <input
                type="text"
                placeholder={castForm.credit_type === 'cast' ? 'e.g. Arjun' : 'e.g. Director'}
                value={castForm.role_name}
                onChange={(e) => setCastForm((p) => ({ ...p, role_name: e.target.value }))}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            {castForm.credit_type === 'crew' && (
              <div>
                <label className="block text-xs text-white/40 mb-1">Role Order</label>
                <select
                  value={castForm.role_order}
                  onChange={(e) => setCastForm((p) => ({ ...p, role_order: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Select role…</option>
                  {ROLE_ORDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={addCast.isPending || !castForm.actor_id}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {addCast.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Entry
          </button>
        </form>
      </div>
    </div>
  );
}
