import Link from 'next/link';
import { Film, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@shared/imageUrl';
import type { MovieTheatricalRun } from '@/lib/types';

// @contract Informational table of upcoming re-releases — no toggles, just data
export interface RereleasesSectionProps {
  rereleases: (MovieTheatricalRun & {
    movies: { id: string; title: string; poster_url: string | null; in_theaters: boolean };
  })[];
  daysUntil: (dateStr: string) => string;
}

export function RereleasesSection({ rereleases, daysUntil }: RereleasesSectionProps) {
  if (rereleases.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-on-surface mb-3">
        Upcoming Re-releases
        <span className="ml-2 text-sm font-normal text-on-surface-muted">
          ({rereleases.length})
        </span>
      </h2>
      <div className="bg-surface-card border border-outline rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline">
              <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                Movie
              </th>
              <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                Date
              </th>
              <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                Label
              </th>
              <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                Countdown
              </th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-subtle">
            {rereleases.map((run) => (
              <tr key={run.id} className="hover:bg-surface-elevated">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {run.movies.poster_url ? (
                      <img
                        src={
                          getImageUrl(run.movies.poster_url, 'sm', 'POSTERS') ??
                          run.movies.poster_url
                        }
                        alt=""
                        className="w-10 h-14 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded bg-input flex items-center justify-center">
                        <Film className="w-4 h-4 text-on-surface-subtle" />
                      </div>
                    )}
                    <span className="font-medium text-on-surface truncate max-w-[200px] inline-block">
                      {run.movies.title}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-muted">
                  {formatDate(run.release_date)}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-purple-600/20 text-status-purple px-2 py-0.5 rounded font-medium">
                    {run.label ?? 'Re-release'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-status-blue">
                  {daysUntil(run.release_date)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/movies/${run.movies.id}`}
                    className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input inline-flex"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
