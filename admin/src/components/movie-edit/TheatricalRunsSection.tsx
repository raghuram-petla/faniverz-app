'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface TheatricalRun {
  id: string;
  movie_id: string;
  release_date: string;
  label: string | null;
  created_at: string;
}

export type PendingRun = {
  release_date: string;
  label: string | null;
};

interface Props {
  visibleRuns: TheatricalRun[];
  onAdd: (run: PendingRun) => void;
  onRemove: (id: string, isPending: boolean) => void;
}

export function TheatricalRunsSection({ visibleRuns, onAdd, onRemove }: Props) {
  const [runForm, setRunForm] = useState({ release_date: '', label: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!runForm.release_date) return;
    onAdd({ release_date: runForm.release_date, label: runForm.label || null });
    setRunForm({ release_date: '', label: '' });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/40">
        Track original release and any re-releases. Use this to record when a movie returns to
        theaters.
      </p>

      {visibleRuns.length > 0 && (
        <div className="space-y-2">
          {visibleRuns.map((run) => (
            <div key={run.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="text-white font-medium flex-1">{run.release_date}</span>
              {run.label ? (
                <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">
                  {run.label}
                </span>
              ) : (
                <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded">
                  Original
                </span>
              )}
              <button
                onClick={() => onRemove(run.id, run.id.startsWith('pending-run-'))}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                aria-label={`Remove run ${run.release_date}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/5 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white/60">Add Theatrical Run</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Release Date *</label>
            <input
              type="date"
              required
              value={runForm.release_date}
              onChange={(e) => setRunForm((p) => ({ ...p, release_date: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">
              Label <span className="text-white/20 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Re-release, Director's Cut"
              value={runForm.label}
              onChange={(e) => setRunForm((p) => ({ ...p, label: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!runForm.release_date}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Run
        </button>
      </form>
    </div>
  );
}
