'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminMovie, useUpdateMovie, useDeleteMovie } from '@/hooks/useAdminMovies';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
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

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: movie, isLoading } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();
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
    </div>
  );
}
