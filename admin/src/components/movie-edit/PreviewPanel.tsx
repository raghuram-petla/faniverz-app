'use client';
import { useState } from 'react';
import { DEVICES } from '@shared/constants';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { SpotlightPreview } from '@/components/preview/SpotlightPreview';
import { MovieDetailPreview } from '@/components/preview/MovieDetailPreview';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { MovieForm } from '@/hooks/useMovieEditState';

interface PreviewPanelProps {
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
}

export function PreviewPanel({ form, setForm }: PreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<'spotlight' | 'detail'>('spotlight');
  const [device, setDevice] = useState(DEVICES[1]);

  const focusX =
    previewMode === 'spotlight'
      ? (form.spotlight_focus_x ?? form.backdrop_focus_x)
      : (form.detail_focus_x ?? form.backdrop_focus_x);
  const focusY =
    previewMode === 'spotlight'
      ? (form.spotlight_focus_y ?? form.backdrop_focus_y)
      : (form.detail_focus_y ?? form.backdrop_focus_y);
  const contextFocusX = previewMode === 'spotlight' ? form.spotlight_focus_x : form.detail_focus_x;

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
        {previewMode === 'spotlight' ? (
          <SpotlightPreview
            title={form.title || 'Movie Title'}
            backdropUrl={form.backdrop_url}
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
            focusX={focusX}
            focusY={focusY}
            onFocusClick={(x, y) =>
              setForm((p) => ({ ...p, spotlight_focus_x: x, spotlight_focus_y: y }))
            }
          />
        ) : (
          <MovieDetailPreview
            title={form.title || 'Movie Title'}
            backdropUrl={form.backdrop_url}
            posterUrl={form.poster_url}
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
            focusX={focusX}
            focusY={focusY}
            onFocusClick={(x, y) =>
              setForm((p) => ({ ...p, detail_focus_x: x, detail_focus_y: y }))
            }
          />
        )}
      </DeviceFrame>

      {contextFocusX != null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-subtle">
            Focus: ({Math.round(contextFocusX * 100)}%,{' '}
            {Math.round(
              ((previewMode === 'spotlight' ? form.spotlight_focus_y : form.detail_focus_y) ?? 0) *
                100,
            )}
            %)
          </span>
          <button
            type="button"
            onClick={() =>
              previewMode === 'spotlight'
                ? setForm((p) => ({
                    ...p,
                    spotlight_focus_x: null,
                    spotlight_focus_y: null,
                  }))
                : setForm((p) => ({ ...p, detail_focus_x: null, detail_focus_y: null }))
            }
            className="text-xs text-red-400 hover:text-red-300"
          >
            Use Default
          </button>
        </div>
      )}
    </div>
  );
}
