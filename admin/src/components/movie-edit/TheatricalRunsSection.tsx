'use client';
import { useState } from 'react';
import { Plus, X, Square } from 'lucide-react';
import { FormInput } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { validateTheatricalRun } from '@/lib/movie-validation';

interface TheatricalRun {
  id: string;
  movie_id: string;
  release_date: string;
  end_date: string | null;
  label: string | null;
  created_at: string;
}

export type PendingRun = {
  // @contract: stable UUID for removal — prevents index-shift bugs when removing pending items
  // @sync: replaces 'pending-run-N' index-based IDs (migrated same as cast/video)
  _id: string;
  release_date: string;
  label: string | null;
};

// @contract displays existing theatrical runs and an inline form to add new ones
interface Props {
  // @assumes visibleRuns merges persisted DB rows and pending (unsaved) runs
  visibleRuns: TheatricalRun[];
  onAdd: (run: PendingRun) => void;
  // @boundary isPending flag tells parent whether to remove from DB or just from pending state
  onRemove: (id: string, isPending: boolean) => void;
  // @sideeffect queues an active run to have its end_date set on save
  onEndRun?: (id: string, endDate: string) => void;
  // @contract set of run IDs already queued for ending (to show pending state in UI)
  pendingEndRunIds?: Set<string>;
  // @sync: Set of stable _id UUIDs for pending (unsaved) runs — replaces startsWith('pending-run-N')
  pendingIds: Set<string>;
  showAddForm: boolean;
  onCloseAddForm: () => void;
}

export function TheatricalRunsSection({
  visibleRuns,
  onAdd,
  onRemove,
  onEndRun,
  pendingEndRunIds,
  pendingIds,
  showAddForm,
  onCloseAddForm,
}: Props) {
  const [runForm, setRunForm] = useState({ release_date: '', label: '' });
  const [runError, setRunError] = useState('');

  // @edge empty release_date silently bails — submit button is also disabled for it
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!runForm.release_date) return;

    const existingDates = visibleRuns.map((r) => r.release_date);
    const errors = validateTheatricalRun(runForm.release_date, existingDates);
    if (errors.length > 0) {
      setRunError(errors[0].message);
      return;
    }

    setRunError('');
    // @nullable label — empty string coerced to null for DB storage
    // @sync: assign stable UUID _id so pending runs survive out-of-order removal without index-shift
    onAdd({
      _id: crypto.randomUUID(),
      release_date: runForm.release_date,
      label: runForm.label || null,
    });
    setRunForm({ release_date: '', label: '' });
    onCloseAddForm();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-subtle">
        Track original release and any re-releases. Use this to record when a movie returns to
        theaters.
      </p>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-surface-elevated rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Release Date"
              required
              variant="compact"
              type="date"
              value={runForm.release_date}
              onValueChange={(v) => setRunForm((p) => ({ ...p, release_date: v }))}
            />
            <FormInput
              label="Label"
              variant="compact"
              type="text"
              placeholder="e.g. Re-release, Director's Cut"
              value={runForm.label}
              onValueChange={(v) => setRunForm((p) => ({ ...p, label: v }))}
            />
          </div>
          {runError && <p className="text-xs text-status-red">{runError}</p>}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!runForm.release_date}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Run
            </Button>
            <button
              type="button"
              onClick={() => {
                onCloseAddForm();
                setRunForm({ release_date: '', label: '' });
                setRunError('');
              }}
              className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Run list — below add form */}
      {visibleRuns.length > 0 && (
        <div className="space-y-2">
          {visibleRuns.map((run) => (
            <div
              key={run.id}
              className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <span className="text-on-surface font-medium">{run.release_date}</span>
                <span className="text-on-surface-muted mx-1.5">→</span>
                {run.end_date ? (
                  <span className="text-on-surface font-medium">{run.end_date}</span>
                ) : pendingEndRunIds?.has(run.id) ? (
                  <span className="text-xs bg-amber-500/20 text-status-amber px-2 py-0.5 rounded">
                    Ending (unsaved)
                  </span>
                ) : (
                  <span className="text-xs bg-green-600/20 text-status-green px-2 py-0.5 rounded">
                    Now
                  </span>
                )}
              </div>
              {run.label ? (
                <span className="text-xs bg-blue-600/20 text-status-blue px-2 py-0.5 rounded shrink-0">
                  {run.label}
                </span>
              ) : (
                <span className="text-xs bg-input text-on-surface-subtle px-2 py-0.5 rounded shrink-0">
                  Original
                </span>
              )}
              {!run.end_date &&
                !pendingIds.has(run.id) &&
                !pendingEndRunIds?.has(run.id) &&
                onEndRun && (
                  <Button
                    variant="icon"
                    size="sm"
                    onClick={() => onEndRun(run.id, new Date().toISOString().slice(0, 10))}
                    aria-label={`End run ${run.release_date}`}
                    title="End theatrical run"
                  >
                    <Square className="w-3.5 h-3.5 text-status-amber" />
                  </Button>
                )}
              <Button
                variant="icon"
                size="sm"
                onClick={() => onRemove(run.id, pendingIds.has(run.id))}
                aria-label={`Remove run ${run.release_date}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
