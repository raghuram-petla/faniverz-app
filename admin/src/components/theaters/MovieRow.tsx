import Link from 'next/link';
import { Film, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@shared/imageUrl';
import { ToggleSwitch } from './ToggleSwitch';
import type { Movie } from '@/lib/types';

// @contract Row for "Currently In Theaters" section — toggle to remove from theaters
export interface MovieRowProps {
  movie: Movie;
  isOn: boolean;
  onToggle: () => void;
}

export function MovieRow({ movie, isOn, onToggle }: MovieRowProps) {
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
          <span className="font-medium text-on-surface truncate max-w-[200px] inline-block">
            {movie.title}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-muted">
        {movie.release_date ? formatDate(movie.release_date) : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          <ToggleSwitch on={isOn} onChange={onToggle} />
          <Link
            href={`/movies/${movie.id}`}
            className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
