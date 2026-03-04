'use client';
import { useState, useRef } from 'react';
import { Film, Plus, Star, Upload, Loader2 } from 'lucide-react';
import type { MoviePoster } from '@/lib/types';

const EMPTY_POSTER_FORM = {
  title: '',
  description: '',
  poster_date: '',
  is_main: false,
};

type PendingPoster = {
  image_url: string;
  title: string;
  description: string | null;
  poster_date: string | null;
  is_main: boolean;
  display_order: number;
};

interface Props {
  visiblePosters: (
    | MoviePoster
    | (PendingPoster & { id: string; movie_id: string; created_at: string })
  )[];
  posterUrl: string;
  onAdd: (poster: PendingPoster) => void;
  onRemove: (id: string, isPending: boolean) => void;
  onSetMain: (id: string) => void;
}

export function PostersSection({ visiblePosters, posterUrl, onAdd, onRemove, onSetMain }: Props) {
  const [posterForm, setPosterForm] = useState(EMPTY_POSTER_FORM);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload/movie-poster', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      onAdd({
        image_url: data.url,
        title: posterForm.title || 'Poster',
        description: posterForm.description || null,
        poster_date: posterForm.poster_date || null,
        is_main: posterForm.is_main,
        display_order: visiblePosters.length,
      });
      setPosterForm(EMPTY_POSTER_FORM);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Film className="w-5 h-5" /> Poster Gallery
      </h2>

      {/* Backward compat: import poster_url to gallery */}
      {posterUrl && visiblePosters.length === 0 && (
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400 font-medium">
              This movie has a poster but no gallery entries.
            </p>
            <p className="text-xs text-white/40 mt-1">Import it as the main poster?</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onAdd({
                image_url: posterUrl,
                title: 'Official Poster',
                description: null,
                poster_date: null,
                is_main: true,
                display_order: 0,
              });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shrink-0"
          >
            <Plus className="w-4 h-4" /> Import
          </button>
        </div>
      )}

      {visiblePosters.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {visiblePosters.map((poster) => (
            <div key={poster.id} className="relative group bg-white/5 rounded-xl overflow-hidden">
              <img
                src={poster.image_url}
                alt={poster.title}
                className="w-full aspect-[2/3] object-cover"
              />
              {poster.is_main && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold">
                  <Star className="w-3 h-3" /> Main
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <p className="text-white text-xs font-medium px-2 text-center truncate w-full">
                  {poster.title}
                </p>
                {!poster.is_main && (
                  <button
                    onClick={() => onSetMain(poster.id)}
                    className="text-xs bg-yellow-500 text-black px-3 py-1 rounded font-semibold hover:bg-yellow-400"
                  >
                    Set as Main
                  </button>
                )}
                <button
                  onClick={() => onRemove(poster.id, poster.id.startsWith('pending-poster-'))}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded font-semibold hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white/5 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white/60">Add Poster</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Title *</label>
            <input
              type="text"
              placeholder="e.g. First Look, Hero Birthday Poster"
              value={posterForm.title}
              onChange={(e) => setPosterForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Date</label>
            <input
              type="date"
              value={posterForm.poster_date}
              onChange={(e) => setPosterForm((p) => ({ ...p, poster_date: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={posterForm.is_main}
            onChange={(e) => setPosterForm((p) => ({ ...p, is_main: e.target.checked }))}
            className="w-4 h-4 rounded accent-red-600"
          />
          <span className="text-sm text-white/60">Set as main poster</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploading || !posterForm.title}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? 'Uploading...' : 'Upload & Add Poster'}
        </button>
      </div>
    </div>
  );
}
