'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminMovieDetail, useUpdateMovie } from '@/hooks/useAdminMovies';
import MovieForm from '@/components/forms/MovieForm';

export default function MovieEditPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = Number(params.id);
  const { data: movie, isLoading } = useAdminMovieDetail(movieId);
  const updateMovie = useUpdateMovie();

  const handleSubmit = (data: Record<string, unknown>) => {
    updateMovie.mutate({ id: movieId, updates: data }, { onSuccess: () => router.push('/movies') });
  };

  if (isLoading) return <p>Loading...</p>;
  if (!movie) return <p>Movie not found</p>;

  return (
    <div data-testid="movie-edit-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Movie</h1>
      <MovieForm movie={movie} onSubmit={handleSubmit} isPending={updateMovie.isPending} />
    </div>
  );
}
