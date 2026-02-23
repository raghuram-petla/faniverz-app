'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminMovies } from '@/hooks/useAdminMovies';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { useCreateOttRelease } from '@/hooks/useAdminOtt';
import { Tv, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewOttReleasePage() {
  const router = useRouter();
  const { data: movies, isLoading: moviesLoading } = useAdminMovies();
  const { data: platforms, isLoading: platformsLoading } = useAdminPlatforms();
  const createRelease = useCreateOttRelease();

  const [movieId, setMovieId] = useState('');
  const [platformId, setPlatformId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieId || !platformId) return;
    createRelease.mutate(
      { movie_id: movieId, platform_id: platformId },
      { onSuccess: () => router.push('/ott') },
    );
  };

  const isLoading = moviesLoading || platformsLoading;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/ott" className="p-2 text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Tv className="w-5 h-5 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Add OTT Release</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-6"
        >
          <div className="space-y-2">
            <label htmlFor="movie" className="block text-sm font-medium text-white/60">
              Movie
            </label>
            <select
              id="movie"
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="">Select a movie...</option>
              {movies?.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title} ({new Date(movie.release_date).getFullYear()})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="platform" className="block text-sm font-medium text-white/60">
              Platform
            </label>
            <select
              id="platform"
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="">Select a platform...</option>
              {platforms?.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>

          {createRelease.isError && (
            <p className="text-red-400 text-sm">
              {createRelease.error instanceof Error
                ? createRelease.error.message
                : 'Failed to create release'}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createRelease.isPending || !movieId || !platformId}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createRelease.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Release
            </button>
            <Link
              href="/ott"
              className="px-6 py-2.5 text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
