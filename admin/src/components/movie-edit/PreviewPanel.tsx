'use client';
import { useState } from 'react';
import { DEVICES } from '@shared/constants';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { SpotlightPreview } from '@/components/preview/SpotlightPreview';
import { MovieDetailPreview } from '@/components/preview/MovieDetailPreview';
import { deriveMovieStatus } from '@shared/movieStatus';
import { getImageUrl } from '@shared/imageUrl';
import type { MovieForm } from '@/hooks/useMovieEditState';

// SVG placeholders — visible against the black preview background.
// Use manually-encoded data URIs (# → %23) to avoid double-encoding.
const PLACEHOLDER_BACKDROP =
  'data:image/svg+xml,' +
  '%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22%3E' +
  '%3Crect width=%22800%22 height=%22450%22 fill=%22%233f3f46%22/%3E' +
  '%3Crect x=%22376%22 y=%22185%22 width=%2248%22 height=%2256%22 rx=%224%22 stroke=%22%23a1a1aa%22 stroke-width=%222%22 fill=%22none%22/%3E' +
  '%3Ccircle cx=%22390%22 cy=%22201%22 r=%224%22 fill=%22%23a1a1aa%22/%3E' +
  '%3Cpath d=%22M382 229l10-14 8 10 6-6 12 16H382z%22 fill=%22%23a1a1aa%22/%3E' +
  '%3Ctext x=%22400%22 y=%22270%22 text-anchor=%22middle%22 fill=%22%23a1a1aa%22 font-family=%22sans-serif%22 font-size=%2214%22%3EUpload a backdrop image%3C/text%3E' +
  '%3C/svg%3E';
const PLACEHOLDER_POSTER =
  'data:image/svg+xml,' +
  '%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E' +
  '%3Crect width=%22200%22 height=%22300%22 fill=%22%233f3f46%22/%3E' +
  '%3Crect x=%2276%22 y=%22110%22 width=%2248%22 height=%2256%22 rx=%224%22 stroke=%22%23a1a1aa%22 stroke-width=%222%22 fill=%22none%22/%3E' +
  '%3Ccircle cx=%2290%22 cy=%22126%22 r=%224%22 fill=%22%23a1a1aa%22/%3E' +
  '%3Cpath d=%22M82 154l10-14 8 10 6-6 12 16H82z%22 fill=%22%23a1a1aa%22/%3E' +
  '%3Ctext x=%22100%22 y=%22195%22 text-anchor=%22middle%22 fill=%22%23a1a1aa%22 font-family=%22sans-serif%22 font-size=%2212%22%3ENo Poster%3C/text%3E' +
  '%3C/svg%3E';

// @coupling MovieForm from useMovieEditState — reads all visual fields for live preview
interface PreviewPanelProps {
  form: MovieForm;
  /** @contract R2 bucket for poster URL — varies when a backdrop image is set as main poster */
  posterBucket?: 'POSTERS' | 'BACKDROPS';
  /** @contract R2 bucket for backdrop URL — varies when a poster image is set as main backdrop */
  backdropBucket?: 'POSTERS' | 'BACKDROPS';
}

export function PreviewPanel({
  form,
  posterBucket = 'POSTERS',
  backdropBucket = 'BACKDROPS',
}: PreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<'spotlight' | 'detail'>('detail');
  // @assumes DEVICES[1] is a reasonable default device (iPhone-sized)
  const [device, setDevice] = useState(DEVICES[1]);

  // @sync sticky positioning at top-[100px] must stay below SectionNav's sticky header
  return (
    <div className="w-[340px] shrink-0 sticky top-[100px] self-start space-y-3">
      <DeviceSelector selected={device} onChange={setDevice} />

      {/* Spotlight / Detail toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setPreviewMode('spotlight')}
          className={
            previewMode === 'spotlight'
              ? 'bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium'
              : 'bg-input text-on-surface-muted px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-input-active'
          }
        >
          Spotlight
        </button>
        <button
          onClick={() => setPreviewMode('detail')}
          className={
            previewMode === 'detail'
              ? 'bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium'
              : 'bg-input text-on-surface-muted px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-input-active'
          }
        >
          Detail
        </button>
      </div>

      <DeviceFrame device={device} maxWidth={340}>
        {/* @nullable all form fields fall back to placeholder values for preview */}
        {previewMode === 'spotlight' ? (
          <SpotlightPreview
            title={form.title || 'Movie Title'}
            backdropUrl={
              (getImageUrl(form.backdrop_url, 'original', backdropBucket) ?? form.backdrop_url) ||
              PLACEHOLDER_BACKDROP
            }
            movieStatus={deriveMovieStatus(
              {
                release_date: form.release_date || null,
                in_theaters: form.in_theaters,
              },
              0,
            )}
            rating={0}
            runtime={form.runtime ? Number(form.runtime) : null}
            certification={form.certification || null}
            releaseDate={form.release_date || null}
            focusX={form.backdrop_focus_x}
            focusY={form.backdrop_focus_y}
          />
        ) : (
          <MovieDetailPreview
            title={form.title || 'Movie Title'}
            backdropUrl={
              (getImageUrl(form.backdrop_url, 'original', backdropBucket) ?? form.backdrop_url) ||
              PLACEHOLDER_BACKDROP
            }
            posterUrl={
              (getImageUrl(form.poster_url, 'sm', posterBucket) ?? form.poster_url) ||
              PLACEHOLDER_POSTER
            }
            movieStatus={deriveMovieStatus(
              {
                release_date: form.release_date || null,
                in_theaters: form.in_theaters,
              },
              0,
            )}
            rating={0}
            reviewCount={0}
            runtime={form.runtime ? Number(form.runtime) : null}
            certification={form.certification || null}
            releaseDate={form.release_date || null}
            focusX={form.backdrop_focus_x}
            focusY={form.backdrop_focus_y}
            posterFocusX={form.poster_focus_x}
            posterFocusY={form.poster_focus_y}
          />
        )}
      </DeviceFrame>
    </div>
  );
}
