'use client';

import { useForm } from 'react-hook-form';

interface MovieFormData {
  title: string;
  title_te: string;
  overview: string;
  overview_te: string;
  release_date: string;
  runtime: number;
  genres: string;
  certification: string;
  release_type: string;
  status: string;
  trailer_youtube_key: string;
  is_featured: boolean;
}

interface MovieFormProps {
  movie?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending?: boolean;
}

export default function MovieForm({ movie, onSubmit, isPending }: MovieFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MovieFormData>({
    defaultValues: {
      title: (movie?.title as string) ?? '',
      title_te: (movie?.title_te as string) ?? '',
      overview: (movie?.overview as string) ?? '',
      overview_te: (movie?.overview_te as string) ?? '',
      release_date: (movie?.release_date as string) ?? '',
      runtime: (movie?.runtime as number) ?? 0,
      genres: Array.isArray(movie?.genres) ? (movie.genres as string[]).join(', ') : '',
      certification: (movie?.certification as string) ?? '',
      release_type: (movie?.release_type as string) ?? 'theatrical',
      status: (movie?.status as string) ?? 'upcoming',
      trailer_youtube_key: (movie?.trailer_youtube_key as string) ?? '',
      is_featured: (movie?.is_featured as boolean) ?? false,
    },
  });

  const onFormSubmit = (data: MovieFormData) => {
    onSubmit({
      ...data,
      genres: data.genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
      runtime: Number(data.runtime),
    });
  };

  return (
    <form
      data-testid="movie-form"
      onSubmit={handleSubmit(onFormSubmit)}
      className="max-w-2xl space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Title *</label>
        <input
          {...register('title', { required: 'Title is required' })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Telugu Title</label>
        <input
          {...register('title_te')}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Overview</label>
        <textarea
          {...register('overview')}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Telugu Overview</label>
        <textarea
          {...register('overview_te')}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Release Date</label>
          <input
            type="date"
            {...register('release_date')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Runtime (min)</label>
          <input
            type="number"
            {...register('runtime')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Genres (comma-separated)</label>
        <input
          {...register('genres')}
          placeholder="Action, Drama, Comedy"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Certification</label>
          <input
            {...register('certification')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Release Type</label>
          <select
            {...register('release_type')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="theatrical">Theatrical</option>
            <option value="ott_original">OTT Original</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            {...register('status')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="upcoming">Upcoming</option>
            <option value="released">Released</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">YouTube Trailer Key</label>
        <input
          {...register('trailer_youtube_key')}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('is_featured')} id="is_featured" />
        <label htmlFor="is_featured" className="text-sm text-gray-700">
          Featured Movie
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : movie ? 'Update Movie' : 'Create Movie'}
      </button>
    </form>
  );
}
