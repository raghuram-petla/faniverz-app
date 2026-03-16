'use client';
import { useState } from 'react';
import { Film, Plus, X, ExternalLink } from 'lucide-react';
import type { OTTPlatform, MoviePlatform } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';
import { colors } from '@shared/colors';
import { INPUT_CLASSES } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';

type PendingPlatform = {
  platform_id: string;
  // @nullable null means "available now" (no specific date)
  available_from: string | null;
  // @nullable streaming_url — direct link to the movie on this OTT platform
  streaming_url: string | null;
  // @coupling _platform carries display data; stripped before DB save
  _platform?: OTTPlatform;
};

interface Props {
  visiblePlatforms: (Pick<MoviePlatform, 'movie_id' | 'platform_id' | 'available_from'> & {
    streaming_url?: string | null;
    platform?: OTTPlatform;
  })[];
  allPlatforms: OTTPlatform[];
  onAdd: (platform: PendingPlatform) => void;
  onRemove: (platformId: string, isPending: boolean) => void;
  pendingPlatformAdds: PendingPlatform[];
  showAddForm: boolean;
  onCloseAddForm: () => void;
}

export function PlatformsSection({
  visiblePlatforms,
  allPlatforms,
  onAdd,
  onRemove,
  pendingPlatformAdds,
  showAddForm,
  onCloseAddForm,
}: Props) {
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');

  return (
    <div className="space-y-4">
      {showAddForm && (
        <div className="bg-surface-elevated rounded-xl p-4 space-y-3">
          <div className="flex gap-3">
            <select
              value={selectedPlatformId}
              onChange={(e) => setSelectedPlatformId(e.target.value)}
              className={`flex-[3] min-w-0 ${INPUT_CLASSES.compact}`}
            >
              <option value="">Select platform…</option>
              {/* @invariant already-added platforms are excluded from the dropdown */}
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
              className={`flex-[2] min-w-0 ${INPUT_CLASSES.compact}`}
            />
          </div>
          <input
            type="url"
            value={streamingUrl}
            onChange={(e) => setStreamingUrl(e.target.value)}
            placeholder="Streaming URL (e.g. https://aha.video/movie/...)"
            className={`w-full ${INPUT_CLASSES.compact}`}
          />
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!selectedPlatformId}
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              const platform = allPlatforms.find((p) => p.id === selectedPlatformId);
              onAdd({
                platform_id: selectedPlatformId,
                available_from: availableFrom || null,
                streaming_url: streamingUrl || null,
                _platform: platform,
              });
              setSelectedPlatformId('');
              setAvailableFrom('');
              setStreamingUrl('');
              onCloseAddForm();
            }}
          >
            Add
          </Button>
          <button
            type="button"
            onClick={() => {
              onCloseAddForm();
              setSelectedPlatformId('');
              setAvailableFrom('');
              setStreamingUrl('');
            }}
            className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Platform list — below add form */}
      {visiblePlatforms.length > 0 && (
        <div className="space-y-2">
          {visiblePlatforms.map((mp) => (
            <div
              key={mp.platform_id}
              className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: mp.platform?.color || colors.zinc900 }}
              >
                {mp.platform?.logo_url ? (
                  <img
                    src={
                      getImageUrl(mp.platform.logo_url, 'sm', 'PLATFORMS') ?? mp.platform.logo_url
                    }
                    alt=""
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <Film className="w-5 h-5 text-on-surface-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-on-surface font-medium">
                  {mp.platform?.name ?? mp.platform_id}
                </span>
                {mp.available_from && (
                  <span className="text-on-surface-subtle text-sm ml-2">
                    from {mp.available_from}
                  </span>
                )}
                {mp.streaming_url && (
                  <a
                    href={mp.streaming_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-status-blue hover:underline mt-0.5 truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{mp.streaming_url}</span>
                  </a>
                )}
              </div>
              <Button
                variant="icon"
                size="sm"
                onClick={() => {
                  const isPending = pendingPlatformAdds.some(
                    (p) => p.platform_id === mp.platform_id,
                  );
                  onRemove(mp.platform_id, isPending);
                }}
                aria-label={`Remove ${mp.platform?.name}`}
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
