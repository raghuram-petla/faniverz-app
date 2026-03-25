'use client';

// @contract Read-only display of TMDB-synced metadata fields
// @assumes These fields are auto-populated by the TMDB sync job; admin cannot edit them here
export interface TmdbMetadataProps {
  tmdbStatus: string | null;
  tmdbVoteAverage: number | null;
  tmdbVoteCount: number | null;
  budget: number | null;
  revenue: number | null;
  collectionName: string | null;
  spokenLanguages: string[] | null;
  tmdbLastSyncedAt: string | null;
}

/** @boundary Formats a number as USD currency string */
function formatCurrency(value: number | null): string {
  if (value === null || value === 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/** @boundary Formats a TMDB status string into a colored badge */
function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-on-surface-muted">—</span>;

  const colorMap: Record<string, string> = {
    Released: 'bg-green-600/20 text-green-400',
    'Post Production': 'bg-yellow-600/20 text-yellow-400',
    'In Production': 'bg-blue-600/20 text-blue-400',
    Planned: 'bg-purple-600/20 text-purple-400',
    Rumored: 'bg-zinc-600/20 text-zinc-400',
    Canceled: 'bg-red-600/20 text-red-400',
  };

  const color = colorMap[status] ?? 'bg-zinc-600/20 text-zinc-400';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-sm text-on-surface-muted w-36 shrink-0">{label}</span>
      <span className="text-sm text-on-surface">{children}</span>
    </div>
  );
}

export function TmdbMetadataSection({
  tmdbStatus,
  tmdbVoteAverage,
  tmdbVoteCount,
  budget,
  revenue,
  collectionName,
  spokenLanguages,
  tmdbLastSyncedAt,
}: TmdbMetadataProps) {
  // @edge: use explicit null/length checks — 0 is a valid value for budget/revenue,
  // and empty array [] is truthy but has no data to display
  const hasAnyData =
    tmdbStatus ||
    tmdbVoteAverage !== null ||
    budget !== null ||
    revenue !== null ||
    collectionName ||
    /* v8 ignore start */
    (spokenLanguages && spokenLanguages.length > 0);
  /* v8 ignore stop */

  if (!hasAnyData) {
    return (
      <p className="text-sm text-on-surface-muted italic">
        No TMDB metadata available. Link a TMDB ID and run sync to populate.
      </p>
    );
  }

  return (
    <div className="divide-y divide-outline-subtle">
      <MetadataRow label="TMDB Status">
        <StatusBadge status={tmdbStatus} />
      </MetadataRow>

      <MetadataRow label="TMDB Rating">
        {tmdbVoteAverage !== null ? (
          <>
            <span className="font-semibold">{tmdbVoteAverage.toFixed(1)}</span>
            <span className="text-on-surface-muted">/10</span>
            {tmdbVoteCount !== null && (
              <span className="text-on-surface-muted ml-1">
                ({tmdbVoteCount.toLocaleString()} votes)
              </span>
            )}
          </>
        ) : (
          '—'
        )}
      </MetadataRow>

      <MetadataRow label="Budget">{formatCurrency(budget)}</MetadataRow>

      <MetadataRow label="Revenue">{formatCurrency(revenue)}</MetadataRow>

      <MetadataRow label="Collection">
        {collectionName ?? <span className="text-on-surface-muted">—</span>}
      </MetadataRow>

      <MetadataRow label="Spoken Languages">
        {spokenLanguages && spokenLanguages.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {spokenLanguages.map((lang, idx) => (
              <span
                key={`${lang}-${idx}`}
                className="inline-block px-2 py-0.5 rounded bg-surface-elevated text-xs"
              >
                {lang}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-on-surface-muted">—</span>
        )}
      </MetadataRow>

      {tmdbLastSyncedAt && (
        <MetadataRow label="Last Synced">{new Date(tmdbLastSyncedAt).toLocaleString()}</MetadataRow>
      )}
    </div>
  );
}
