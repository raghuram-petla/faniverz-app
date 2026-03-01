'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminMovie, useUpdateMovie, useDeleteMovie } from '@/hooks/useAdminMovies';
import { useMovieCast, useAdminActors, useAddCast, useRemoveCast } from '@/hooks/useAdminCast';
import {
  useMovieTheatricalRuns,
  useAddTheatricalRun,
  useRemoveTheatricalRun,
} from '@/hooks/useAdminTheatricalRuns';
import { ArrowLeft, Loader2, Trash2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { DEVICES } from '@shared/constants';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { SpotlightPreview } from '@/components/preview/SpotlightPreview';
import { MovieDetailPreview } from '@/components/preview/MovieDetailPreview';
import type { ReleaseType } from '@shared/types';

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
  const { data: theatricalRuns = [] } = useMovieTheatricalRuns(id);
  const addTheatricalRun = useAddTheatricalRun();
  const removeTheatricalRun = useRemoveTheatricalRun();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [device, setDevice] = useState(DEVICES[1]);
  const [castForm, setCastForm] = useState(EMPTY_CAST_FORM);
  const [runForm, setRunForm] = useState({ release_date: '', label: '' });
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
    backdrop_focus_x: null as number | null,
    backdrop_focus_y: null as number | null,
    spotlight_focus_x: null as number | null,
    spotlight_focus_y: null as number | null,
    detail_focus_x: null as number | null,
    detail_focus_y: null as number | null,
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
        backdrop_focus_x: movie.backdrop_focus_x ?? null,
        backdrop_focus_y: movie.backdrop_focus_y ?? null,
        spotlight_focus_x: movie.spotlight_focus_x ?? null,
        spotlight_focus_y: movie.spotlight_focus_y ?? null,
        detail_focus_x: movie.detail_focus_x ?? null,
        detail_focus_y: movie.detail_focus_y ?? null,
      });
    }
  }, [movie]);

  function updateField(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setForm((prev) => ({ ...prev, backdrop_focus_x: x, backdrop_focus_y: y }));
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
      release_type: form.release_type as 'theatrical' | 'ott' | 'upcoming' | 'ended',
      backdrop_focus_x: form.backdrop_focus_x,
      backdrop_focus_y: form.backdrop_focus_y,
      spotlight_focus_x: form.spotlight_focus_x,
      spotlight_focus_y: form.spotlight_focus_y,
      detail_focus_x: form.detail_focus_x,
      detail_focus_y: form.detail_focus_y,
    });
    router.push('/movies');
  }

  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      await deleteMovie.mutateAsync(id);
      router.push('/movies');
    }
  }

  async function handleAddTheatricalRun(e: React.FormEvent) {
    e.preventDefault();
    if (!runForm.release_date) return;
    await addTheatricalRun.mutateAsync({
      movie_id: id,
      release_date: runForm.release_date,
      label: runForm.label || null,
    });
    setRunForm({ release_date: '', label: '' });
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
    <div className={`${activeTab === 'preview' ? 'max-w-5xl' : 'max-w-2xl'} space-y-6`}>
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

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('edit')}
          className={
            activeTab === 'edit'
              ? 'bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium'
              : 'bg-white/10 text-white/60 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20'
          }
        >
          Edit
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={
            activeTab === 'preview'
              ? 'bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium'
              : 'bg-white/10 text-white/60 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20'
          }
        >
          Preview
        </button>
      </div>

      {activeTab === 'preview' ? (
        <div className="space-y-6">
          <DeviceSelector selected={device} onChange={setDevice} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spotlight Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/60">Spotlight</h3>
                {form.spotlight_focus_x != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">
                      Focus: ({Math.round(form.spotlight_focus_x * 100)}%,{' '}
                      {Math.round((form.spotlight_focus_y ?? 0) * 100)}%)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, spotlight_focus_x: null, spotlight_focus_y: null }))
                      }
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Use Default
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <DeviceFrame device={device}>
                  <SpotlightPreview
                    title={form.title || 'Movie Title'}
                    backdropUrl={form.backdrop_url}
                    releaseType={(form.release_type || 'upcoming') as ReleaseType}
                    rating={0}
                    runtime={form.runtime ? Number(form.runtime) : null}
                    certification={form.certification || null}
                    releaseDate={form.release_date || new Date().toISOString()}
                    focusX={form.spotlight_focus_x ?? form.backdrop_focus_x}
                    focusY={form.spotlight_focus_y ?? form.backdrop_focus_y}
                    onFocusClick={(x, y) =>
                      setForm((p) => ({ ...p, spotlight_focus_x: x, spotlight_focus_y: y }))
                    }
                  />
                </DeviceFrame>
              </div>
            </div>

            {/* Detail Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/60">Detail Page</h3>
                {form.detail_focus_x != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">
                      Focus: ({Math.round(form.detail_focus_x * 100)}%,{' '}
                      {Math.round((form.detail_focus_y ?? 0) * 100)}%)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, detail_focus_x: null, detail_focus_y: null }))
                      }
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Use Default
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <DeviceFrame device={device}>
                  <MovieDetailPreview
                    title={form.title || 'Movie Title'}
                    backdropUrl={form.backdrop_url}
                    posterUrl={form.poster_url}
                    releaseType={(form.release_type || 'upcoming') as ReleaseType}
                    rating={0}
                    reviewCount={0}
                    runtime={form.runtime ? Number(form.runtime) : null}
                    certification={form.certification || null}
                    releaseDate={form.release_date || new Date().toISOString()}
                    focusX={form.detail_focus_x ?? form.backdrop_focus_x}
                    focusY={form.detail_focus_y ?? form.backdrop_focus_y}
                    onFocusClick={(x, y) =>
                      setForm((p) => ({ ...p, detail_focus_x: x, detail_focus_y: y }))
                    }
                  />
                </DeviceFrame>
              </div>
            </div>
          </div>

          {/* Save button in preview mode too */}
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={updateMovie.isPending}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
          >
            {updateMovie.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      ) : (
        <>
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
                  <option value="ended">Ended (No Longer in Theaters)</option>
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
            {form.backdrop_url && (
              <div>
                <label className="block text-sm text-white/60 mb-1">
                  Backdrop Focal Point{' '}
                  <span className="text-white/30 font-normal">— click image to set</span>
                </label>
                <div
                  className="relative w-full overflow-hidden rounded-xl cursor-crosshair"
                  style={{ aspectRatio: '16/9' }}
                  onClick={handleBackdropClick}
                >
                  <img
                    src={form.backdrop_url}
                    alt="Backdrop preview"
                    className="w-full h-full object-cover pointer-events-none select-none"
                  />
                  {form.backdrop_focus_x != null && form.backdrop_focus_y != null && (
                    <div
                      className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white bg-red-500/60 pointer-events-none"
                      style={{
                        left: `${form.backdrop_focus_x * 100}%`,
                        top: `${form.backdrop_focus_y * 100}%`,
                      }}
                    />
                  )}
                </div>
                {form.backdrop_focus_x != null && form.backdrop_focus_y != null && (
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-white/40">
                      Focus: ({Math.round(form.backdrop_focus_x * 100)}%,{' '}
                      {Math.round(form.backdrop_focus_y * 100)}%)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, backdrop_focus_x: null, backdrop_focus_y: null }))
                      }
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
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
              {updateMovie.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Save Changes'
              )}
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

          {/* Theatrical Runs */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-white">Theatrical Runs</h2>
            <p className="text-sm text-white/40">
              Track original release and any re-releases. Use this to record when a movie returns to
              theaters.
            </p>

            {theatricalRuns.length > 0 && (
              <div className="space-y-2">
                {theatricalRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                  >
                    <span className="text-white font-medium flex-1">{run.release_date}</span>
                    {run.label ? (
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">
                        {run.label}
                      </span>
                    ) : (
                      <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded">
                        Original
                      </span>
                    )}
                    <button
                      onClick={() => removeTheatricalRun.mutate({ id: run.id, movieId: id })}
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                      aria-label={`Remove run ${run.release_date}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddTheatricalRun} className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/60">Add Theatrical Run</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Release Date *</label>
                  <input
                    type="date"
                    required
                    value={runForm.release_date}
                    onChange={(e) => setRunForm((p) => ({ ...p, release_date: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    Label <span className="text-white/20 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Re-release, Director's Cut"
                    value={runForm.label}
                    onChange={(e) => setRunForm((p) => ({ ...p, label: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={addTheatricalRun.isPending || !runForm.release_date}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {addTheatricalRun.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Run
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
