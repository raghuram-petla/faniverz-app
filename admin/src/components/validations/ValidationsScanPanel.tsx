'use client';

import { Loader2, Wrench } from 'lucide-react';
import { ValidationRow } from './ValidationRow';
import type { ScanResult, ScanProgress, FixProgress } from '@/hooks/useValidationTypes';
import { itemKey, hasIssue } from '@/hooks/useValidations';
import { useCallback } from 'react';

export interface ValidationsScanPanelProps {
  results: ScanResult[];
  /** Total unfiltered result count — used to keep filter tabs visible when a filter yields 0 */
  totalResultCount: number;
  selectedItems: Set<string>;
  onToggle: (key: string) => void;
  onSelectAllIssues: () => void;
  onDeselectAll: () => void;
  onFix: () => void;
  onFixSingle: (item: ScanResult) => void;
  fixProgress: FixProgress | null;
  scanProgress: ScanProgress | null;
  isReadOnly: boolean;
  activeFilter: 'all' | 'external' | 'missing' | 'ok';
  onFilterChange: (filter: 'all' | 'external' | 'missing' | 'ok') => void;
}

const FILTERS: { key: 'all' | 'external' | 'missing' | 'ok'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'external', label: 'External' },
  { key: 'missing', label: 'Missing Variants' },
  { key: 'ok', label: 'OK' },
];

// @contract: renders scan results table with filters, selection, and bulk fix
export function ValidationsScanPanel({
  results,
  totalResultCount,
  selectedItems,
  onToggle,
  onSelectAllIssues,
  onDeselectAll,
  onFix,
  onFixSingle,
  fixProgress,
  scanProgress,
  isReadOnly,
  activeFilter,
  onFilterChange,
}: ValidationsScanPanelProps) {
  const issueCount = results.filter(hasIssue).length;

  const handleToggle = useCallback((item: ScanResult) => onToggle(itemKey(item)), [onToggle]);

  // @edge: show initial empty state only when no scan has been run yet
  if (totalResultCount === 0 && !scanProgress?.isScanning) {
    return (
      <div className="bg-surface-card rounded-lg border border-outline p-8 text-center">
        <p className="text-on-surface-muted">
          {scanProgress
            ? 'No results found.'
            : 'Select an entity above and click "Scan" to check images.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-lg border border-outline">
      {/* Progress bars */}
      {scanProgress?.isScanning && (
        <ProgressBar label="Scanning" current={scanProgress.scanned} total={scanProgress.total} />
      )}
      {fixProgress?.isFixing && (
        <ProgressBar
          label="Fixing"
          current={fixProgress.fixed + fixProgress.failed}
          total={fixProgress.total}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-outline">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                activeFilter === f.key
                  ? 'bg-red-600 text-white'
                  : 'bg-surface-elevated text-on-surface-muted hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {issueCount > 0 && (
            <>
              <button
                onClick={selectedItems.size > 0 ? onDeselectAll : onSelectAllIssues}
                className="text-xs text-on-surface-muted hover:text-on-surface"
              >
                {selectedItems.size > 0 ? 'Deselect all' : `Select all issues (${issueCount})`}
              </button>
              {!isReadOnly && selectedItems.size > 0 && (
                <button
                  onClick={onFix}
                  disabled={fixProgress?.isFixing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {/* v8 ignore start */}
                  {fixProgress?.isFixing ? (
                    /* v8 ignore stop */
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wrench className="w-3 h-3" />
                  )}
                  Fix Selected ({selectedItems.size})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Fix results summary */}
      {fixProgress && !fixProgress.isFixing && (
        <div className="px-4 py-2 border-b border-outline text-xs">
          <span className="text-green-400">{fixProgress.fixed} fixed</span>
          {fixProgress.failed > 0 && (
            <span className="text-red-400 ml-3">{fixProgress.failed} failed</span>
          )}
        </div>
      )}

      {/* Table or empty filter message */}
      {results.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-on-surface-muted text-sm">
            No results match the &quot;{FILTERS.find((f) => f.key === activeFilter)?.label}&quot;
            filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline text-xs text-on-surface-muted uppercase">
                <th className="px-3 py-2 w-8" />
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Orig</th>
                <th className="px-3 py-2">SM</th>
                <th className="px-3 py-2">MD</th>
                <th className="px-3 py-2">LG</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <ValidationRow
                  key={itemKey(item)}
                  item={item}
                  isSelected={selectedItems.has(itemKey(item))}
                  onToggle={() => handleToggle(item)}
                  isReadOnly={isReadOnly}
                  onFixSingle={onFixSingle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scanProgress?.isScanning && (
        <div className="p-4 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-on-surface-muted inline-block" />
        </div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
}

function ProgressBar({ label, current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="px-4 py-2 border-b border-outline">
      <div className="flex items-center justify-between text-xs text-on-surface-muted mb-1">
        <span>{label}...</span>
        <span>
          {current} / {total} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-surface-elevated rounded-full h-1.5">
        <div
          className="bg-red-600 h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
