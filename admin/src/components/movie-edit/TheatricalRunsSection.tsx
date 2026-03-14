'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormInput } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';

interface TheatricalRun {
  id: string;
  movie_id: string;
  release_date: string;
  end_date: string | null;
  label: string | null;
  created_at: string;
}

export type PendingRun = {
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
}

export function TheatricalRunsSection({ visibleRuns, onAdd, onRemove }: Props) {
  const [runForm, setRunForm] = useState({ release_date: '', label: '' });

  // @edge empty release_date silently bails — submit button is also disabled for it
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!runForm.release_date) return;
    // @nullable label — empty string coerced to null for DB storage
    onAdd({ release_date: runForm.release_date, label: runForm.label || null });
    setRunForm({ release_date: '', label: '' });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-subtle">
        Track original release and any re-releases. Use this to record when a movie returns to
        theaters.
      </p>

      {visibleRuns.length > 0 && (
        <div className="space-y-2">
          {visibleRuns.map((run) => (
            <div
              key={run.id}
              className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
            >
              {/* @contract Date range: release_date → end_date (or "Now" if still active) */}
              <div className="flex-1 min-w-0">
                <span className="text-on-surface font-medium">{run.release_date}</span>
                <span className="text-on-surface-muted mx-1.5">→</span>
                {run.end_date ? (
                  <span className="text-on-surface font-medium">{run.end_date}</span>
                ) : (
                  <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                    Now
                  </span>
                )}
              </div>
              {run.label ? (
                <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded shrink-0">
                  {run.label}
                </span>
              ) : (
                <span className="text-xs bg-input text-on-surface-subtle px-2 py-0.5 rounded shrink-0">
                  Original
                </span>
              )}
              <Button
                variant="icon"
                size="sm"
                // @invariant pending runs use 'pending-run-' prefix to distinguish from DB rows
                onClick={() => onRemove(run.id, run.id.startsWith('pending-run-'))}
                aria-label={`Remove run ${run.release_date}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-elevated rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-on-surface-muted">Add Theatrical Run</p>
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
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!runForm.release_date}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Run
        </Button>
      </form>
    </div>
  );
}
