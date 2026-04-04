'use client';

import { Loader2, Search, ScanLine, ScanEye } from 'lucide-react';
import type { SummaryEntry, ScanEntity } from '@/hooks/useValidationTypes';

export interface ValidationsSummaryProps {
  summary: SummaryEntry[] | undefined;
  isLoading: boolean;
  onScan: (entity: ScanEntity) => void;
  onDeepScan: (entity: ScanEntity) => void;
  onScanAll: () => void;
  isScanning: boolean;
  activeScanEntity: ScanEntity | null;
}

// @coupling: entity→label mapping must stay in sync with summary API SCAN_CONFIGS in /api/validations/summary
// @coupling: ENTITY_MAP must stay in sync with /api/validations/scan endpoint's accepted entity values
const ENTITY_LABELS: Record<string, string> = {
  'movies:poster_url': 'Movie Posters',
  'movies:backdrop_url': 'Movie Backdrops',
  'movie_images:image_url': 'Image Gallery',
  'actors:photo_url': 'Actor Photos',
  'platforms:logo_url': 'Platform Logos',
  'production_houses:logo_url': 'Production House Logos',
  'profiles:avatar_url': 'User Avatars',
};

// @coupling: maps summary entity+field to ScanEntity for the scan API
const ENTITY_MAP: Record<string, ScanEntity> = {
  'movies:poster_url': 'movies',
  'movies:backdrop_url': 'movies',
  'movie_images:image_url': 'movie_images',
  'actors:photo_url': 'actors',
  'platforms:logo_url': 'platforms',
  'production_houses:logo_url': 'production_houses',
  'profiles:avatar_url': 'profiles',
};

// @contract: renders a grid of summary cards with scan actions
export function ValidationsSummary({
  summary,
  isLoading,
  onScan,
  onDeepScan,
  onScanAll,
  isScanning,
  activeScanEntity,
}: ValidationsSummaryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-on-surface-muted" />
      </div>
    );
  }

  if (!summary) return null;

  // @edge: deduplicate movies entity (poster_url + backdrop_url map to same ScanEntity)
  const scannedEntities = new Set<ScanEntity>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface">Image Summary</h2>
        <button
          onClick={onScanAll}
          disabled={isScanning}
          className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ScanLine className="w-4 h-4" />
          )}
          Scan All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {summary.map((entry) => {
          const key = `${entry.entity}:${entry.field}`;
          const label = ENTITY_LABELS[key] ?? key;
          const scanEntity = ENTITY_MAP[key];
          const isDuplicate = scannedEntities.has(scanEntity);
          if (scanEntity) scannedEntities.add(scanEntity);

          return (
            <div key={key} className="bg-surface-card rounded-lg border border-outline p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-on-surface">{label}</h3>
                {scanEntity && !isDuplicate && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onScan(scanEntity)}
                      disabled={isScanning}
                      className="text-xs px-2 py-1 rounded bg-surface-elevated text-on-surface-muted hover:text-on-surface disabled:opacity-50 flex items-center gap-1"
                      title="Quick scan (DB only)"
                    >
                      {isScanning && activeScanEntity === scanEntity ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      Scan
                    </button>
                    <button
                      onClick={() => onDeepScan(scanEntity)}
                      disabled={isScanning}
                      className="text-xs px-2 py-1 rounded bg-surface-elevated text-on-surface-muted hover:text-on-surface disabled:opacity-50 flex items-center gap-1"
                      title="Deep scan (checks R2 variants)"
                    >
                      <ScanEye className="w-3 h-3" />
                      Deep
                    </button>
                  </div>
                )}
              </div>

              <div className="text-2xl font-bold text-on-surface mb-2">{entry.total}</div>

              <div className="flex gap-3 text-xs">
                <StatBadge label="Local" count={entry.local} color="green" />
                <StatBadge label="External" count={entry.external} color="amber" />
                <StatBadge label="Null" count={entry.nullCount} color="zinc" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StatBadgeProps {
  label: string;
  count: number;
  color: 'green' | 'amber' | 'zinc';
}

const COLOR_MAP: Record<string, string> = {
  green: 'text-green-400',
  amber: 'text-amber-400',
  zinc: 'text-zinc-400',
};

function StatBadge({ label, count, color }: StatBadgeProps) {
  if (count === 0) return null;
  return (
    <span className={COLOR_MAP[color]}>
      {count} {label}
    </span>
  );
}
