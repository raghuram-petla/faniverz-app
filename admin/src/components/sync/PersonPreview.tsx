import { Users, Loader2, RefreshCw, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { LookupResult } from '@/hooks/useSync';

export interface PersonPreviewProps {
  result: LookupResult & { type: 'person' };
  isPending: boolean;
  onRefresh: () => void;
  /** @nullable provided when person is not in DB — imports actor directly from TMDB */
  onImport?: () => void;
  /** @nullable close/dismiss handler */
  onClose?: () => void;
}

/** @contract shows TMDB person details; refresh if in DB, import if not
 *  @boundary onRefresh and onImport are mutually exclusive — only one renders based on existsInDb */
export function PersonPreview({
  result,
  isPending,
  onRefresh,
  onImport,
  onClose,
}: PersonPreviewProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-on-surface-muted hover:text-on-surface transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <div className="flex gap-5">
        {result.data.photoUrl ? (
          <img
            src={result.data.photoUrl}
            alt={result.data.name}
            className="w-24 h-32 object-cover rounded-lg shrink-0"
          />
        ) : (
          <div className="w-24 h-32 bg-surface-muted rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-8 h-8 text-on-surface-disabled" />
          </div>
        )}
        <div className="space-y-2 min-w-0">
          <h3 className="text-lg font-semibold text-on-surface">{result.data.name}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-on-surface-subtle">Birthday:</span>{' '}
              <span className="text-on-surface">{result.data.birthday || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-subtle">Born in:</span>{' '}
              <span className="text-on-surface">{result.data.placeOfBirth || '—'}</span>
            </div>
          </div>
          {result.data.biography && (
            <p className="text-sm text-on-surface-muted line-clamp-3">{result.data.biography}</p>
          )}
          <div className="flex items-center gap-3 pt-2">
            {result.existsInDb ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-status-green">
                  <CheckCircle className="w-4 h-4" /> In database
                </span>
                <button
                  onClick={onRefresh}
                  disabled={isPending}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Refresh from TMDB
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-status-yellow">
                  <AlertCircle className="w-4 h-4" /> Not in database
                </span>
                {onImport && (
                  <button
                    onClick={onImport}
                    disabled={isPending}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Import Actor
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
