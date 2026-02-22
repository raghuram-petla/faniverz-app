'use client';

import { useRouter } from 'next/navigation';
import { useCreateMovie } from '@/hooks/useAdminMovies';
import MovieForm from '@/components/forms/MovieForm';

export default function NewMoviePage() {
  const router = useRouter();
  const createMovie = useCreateMovie();

  const handleSubmit = (data: Record<string, unknown>) => {
    createMovie.mutate(data, { onSuccess: () => router.push('/movies') });
  };

  return (
    <div data-testid="movie-new-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Movie</h1>
      <MovieForm onSubmit={handleSubmit} isPending={createMovie.isPending} />
    </div>
  );
}
