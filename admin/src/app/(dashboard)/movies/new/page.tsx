'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateMovie } from '@/hooks/useAdminMovies';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
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

export default function NewMoviePage() {
  const router = useRouter();
  const createMovie = useCreateMovie();
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);
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
    in_theaters: false,
  });

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

  async function handleImageUpload(
    file: File,
    endpoint: string,
    field: 'poster_url' | 'backdrop_url',
    setUploading: (v: boolean) => void,
  ) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setForm((prev) => ({ ...prev, [field]: data.url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMovie.mutateAsync({
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
        in_theaters: form.in_theaters,
      });
      router.push('/movies');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Failed to create movie: ${msg}`);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/movies" className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Movie</h1>
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
            <label className="block text-sm text-white/60 mb-1">Currently In Theaters</label>
            <label className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.in_theaters}
                onChange={(e) => setForm((prev) => ({ ...prev, in_theaters: e.target.checked }))}
                className="w-5 h-5 rounded accent-red-600"
              />
              <span className="text-white text-sm">
                {form.in_theaters ? 'Yes — In Theaters' : 'No'}
              </span>
            </label>
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
          <label className="block text-sm text-white/60 mb-1">Poster</label>
          <input
            ref={posterInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                handleImageUpload(
                  file,
                  '/api/upload/movie-poster',
                  'poster_url',
                  setUploadingPoster,
                );
              e.target.value = '';
            }}
          />
          {form.poster_url ? (
            <div className="flex items-center gap-4">
              <img
                src={form.poster_url}
                alt="Poster preview"
                className="w-20 h-28 rounded-lg object-cover border border-white/10"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={uploadingPoster}
                  onClick={() => posterInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-1.5 bg-white/10 rounded-lg disabled:opacity-50"
                >
                  {uploadingPoster ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => updateField('poster_url', '')}
                  className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploadingPoster}
              onClick={() => posterInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-white/10 rounded-xl px-4 py-3 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50"
            >
              {uploadingPoster ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadingPoster ? 'Uploading...' : 'Upload Poster'}
            </button>
          )}
          {form.poster_url && (
            <p className="mt-2 text-xs text-white/20 truncate">{form.poster_url}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Backdrop</label>
          <input
            ref={backdropInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                handleImageUpload(
                  file,
                  '/api/upload/movie-backdrop',
                  'backdrop_url',
                  setUploadingBackdrop,
                );
              e.target.value = '';
            }}
          />
          {form.backdrop_url ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <img
                  src={form.backdrop_url}
                  alt="Backdrop preview"
                  className="w-40 h-[90px] rounded-lg object-cover border border-white/10"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={uploadingBackdrop}
                    onClick={() => backdropInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-1.5 bg-white/10 rounded-lg disabled:opacity-50"
                  >
                    {uploadingBackdrop ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('backdrop_url', '')}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/20 truncate">{form.backdrop_url}</p>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploadingBackdrop}
              onClick={() => backdropInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-white/10 rounded-xl px-4 py-3 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50"
            >
              {uploadingBackdrop ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadingBackdrop ? 'Uploading...' : 'Upload Backdrop'}
            </button>
          )}
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
          disabled={createMovie.isPending}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
        >
          {createMovie.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Movie'}
        </button>
      </form>
    </div>
  );
}
