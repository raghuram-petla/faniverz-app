'use client';
import { useState } from 'react';
import { Film, Plus, X } from 'lucide-react';
import type { OTTPlatform, MoviePlatform } from '@/lib/types';

type PendingPlatform = {
  platform_id: string;
  available_from: string | null;
  _platform?: OTTPlatform;
};

interface Props {
  visiblePlatforms: (Pick<MoviePlatform, 'movie_id' | 'platform_id' | 'available_from'> & {
    platform?: OTTPlatform;
  })[];
  allPlatforms: OTTPlatform[];
  onAdd: (platform: PendingPlatform) => void;
  onRemove: (platformId: string, isPending: boolean) => void;
  pendingPlatformAdds: PendingPlatform[];
}

export function PlatformsSection({
  visiblePlatforms,
  allPlatforms,
  onAdd,
  onRemove,
  pendingPlatformAdds,
}: Props) {
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');

  return (
    <div className="space-y-4">
      {visiblePlatforms.length > 0 && (
        <div className="space-y-2">
          {visiblePlatforms.map((mp) => (
            <div
              key={mp.platform_id}
              className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: mp.platform?.color || '#333' }}
              >
                {mp.platform?.logo ? (
                  <img src={mp.platform.logo} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <Film className="w-5 h-5 text-on-surface-muted" />
                )}
              </div>
              <div className="flex-1">
                <span className="text-on-surface font-medium">
                  {mp.platform?.name ?? mp.platform_id}
                </span>
                {mp.available_from && (
                  <span className="text-on-surface-subtle text-sm ml-2">
                    from {mp.available_from}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  const isPending = pendingPlatformAdds.some(
                    (p) => p.platform_id === mp.platform_id,
                  );
                  onRemove(mp.platform_id, isPending);
                }}
                className="p-1 rounded hover:bg-input text-on-surface-subtle hover:text-red-400"
                aria-label={`Remove ${mp.platform?.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-elevated rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-on-surface-muted">Add OTT Platform</p>
        <div className="flex gap-3">
          <select
            value={selectedPlatformId}
            onChange={(e) => setSelectedPlatformId(e.target.value)}
            className="flex-1 bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">Select platform…</option>
            {allPlatforms
              .filter((p) => !visiblePlatforms.some((mp) => mp.platform_id === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <input
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            placeholder="Available from"
            className="bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
          />
          <button
            type="button"
            disabled={!selectedPlatformId}
            onClick={() => {
              const platform = allPlatforms.find((p) => p.id === selectedPlatformId);
              onAdd({
                platform_id: selectedPlatformId,
                available_from: availableFrom || null,
                _platform: platform,
              });
              setSelectedPlatformId('');
              setAvailableFrom('');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-on-surface text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
