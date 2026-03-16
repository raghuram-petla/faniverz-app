import Link from 'next/link';
import { Film, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@shared/imageUrl';
import type { Movie } from '@/lib/types';

// @contract Informational row for upcoming movies — no toggle, shows countdown + premiere
export interface UpcomingRowProps {
  movie: Movie;
  countdown: string;
}

export function UpcomingRow({ movie, countdown }: UpcomingRowProps) {
  return (
    <tr className="hover:bg-surface-elevated">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {movie.poster_url ? (
            <img
              src={getImageUrl(movie.poster_url, 'sm', 'POSTERS') ?? movie.poster_url}
              alt=""
              className="w-10 h-14 rounded object-cover"
            />
          ) : (
            <div className="w-10 h-14 rounded bg-input flex items-center justify-center">
              <Film className="w-4 h-4 text-on-surface-subtle" />
            </div>
          )}
          <div className="min-w-0">
            <span className="font-medium text-on-surface truncate max-w-[200px] inline-block">
              {movie.title}
            </span>
            {movie.premiere_date && (
              <p className="text-xs text-status-amber">
                Premiere: {formatDate(movie.premiere_date)}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-muted">
        {movie.release_date ? formatDate(movie.release_date) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-status-blue">{countdown}</td>
      <td className="px-4 py-3">
        <Link
          href={`/movies/${movie.id}`}
          className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input inline-flex"
        >
          <Edit className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  );
}
