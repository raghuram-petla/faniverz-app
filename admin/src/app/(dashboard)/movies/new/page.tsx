'use client';
import { useRouter } from 'next/navigation';
import { useCreateMovie } from '@/hooks/useAdminMovies';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { NewMovieForm } from '@/components/movie-edit/NewMovieForm';
import type { NewMovieFormState } from '@/components/movie-edit/NewMovieForm';

export default function NewMoviePage() {
  const router = useRouter();
  const createMovie = useCreateMovie();

  async function handleCreate(data: NewMovieFormState) {
    try {
      await createMovie.mutateAsync({
        title: data.title,
        poster_url: data.poster_url || null,
        backdrop_url: data.backdrop_url || null,
        release_date: data.release_date,
        runtime: data.runtime ? Number(data.runtime) : null,
        genres: data.genres,
        certification: (data.certification || null) as 'U' | 'UA' | 'A' | null,
        synopsis: data.synopsis || null,
        director: data.director || null,
        trailer_url: data.trailer_url || null,
        in_theaters: data.in_theaters,
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

      <NewMovieForm isPending={createMovie.isPending} onSubmit={handleCreate} />
    </div>
  );
}
