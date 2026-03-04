'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminMovie, useUpdateMovie, useDeleteMovie } from '@/hooks/useAdminMovies';
import {
  useMovieCast,
  useAdminActors,
  useAddCast,
  useRemoveCast,
  useUpdateCastOrder,
} from '@/hooks/useAdminCast';
import {
  useMovieTheatricalRuns,
  useAddTheatricalRun,
  useRemoveTheatricalRun,
} from '@/hooks/useAdminTheatricalRuns';
import { useMovieVideos, useAddVideo, useRemoveVideo } from '@/hooks/useAdminVideos';
import {
  useMoviePosters,
  useAddPoster,
  useRemovePoster,
  useSetMainPoster,
} from '@/hooks/useAdminPosters';
import {
  useMovieProductionHouses,
  useAddMovieProductionHouse,
  useRemoveMovieProductionHouse,
} from '@/hooks/useMovieProductionHouses';
import { useAdminProductionHouses } from '@/hooks/useAdminProductionHouses';
import {
  useMoviePlatforms,
  useAddMoviePlatform,
  useRemoveMoviePlatform,
} from '@/hooks/useAdminOtt';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { ArrowLeft, Check, Loader2, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { DEVICES } from '@shared/constants';
import type { VideoType } from '@/lib/types';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { SpotlightPreview } from '@/components/preview/SpotlightPreview';
import { MovieDetailPreview } from '@/components/preview/MovieDetailPreview';
import { deriveMovieStatus } from '@shared/movieStatus';
import {
  VideosSection,
  PostersSection,
  PlatformsSection,
  ProductionHousesSection,
  CastSection,
  TheatricalRunsSection,
  type PendingCastAdd,
  type PendingRun,
} from '@/components/movie-edit';

const genres = [
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Family',
  'Adventure',
  'Historical',
];

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: movie, isLoading } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();
  const { data: castData = [] } = useMovieCast(id);
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const { data: actorsData } = useAdminActors(castSearchQuery);
  const actors = actorsData?.pages.flat() ?? [];
  const addCast = useAddCast();
  const removeCast = useRemoveCast();
  const updateCastOrder = useUpdateCastOrder();
  const { data: theatricalRuns = [] } = useMovieTheatricalRuns(id);
  const addTheatricalRun = useAddTheatricalRun();
  const removeTheatricalRun = useRemoveTheatricalRun();
  const { data: videosData = [] } = useMovieVideos(id);
  const addVideo = useAddVideo();
  const removeVideo = useRemoveVideo();
  const { data: postersData = [] } = useMoviePosters(id);
  const addPoster = useAddPoster();
  const removePoster = useRemovePoster();
  const setMainPoster = useSetMainPoster();
  const { data: movieProductionHouses = [] } = useMovieProductionHouses(id);
  const addMovieProductionHouse = useAddMovieProductionHouse();
  const removeMovieProductionHouse = useRemoveMovieProductionHouse();
  const { data: allProductionHousesData } = useAdminProductionHouses();
  const allProductionHouses = allProductionHousesData?.pages.flat() ?? [];
  const { data: moviePlatforms = [] } = useMoviePlatforms(id);
  const { data: allPlatforms = [] } = useAdminPlatforms();
  const addMoviePlatform = useAddMoviePlatform();
  const removeMoviePlatform = useRemoveMoviePlatform();

  // Preview state
  const [previewMode, setPreviewMode] = useState<'spotlight' | 'detail'>('spotlight');
  const [device, setDevice] = useState(DEVICES[1]);

  // Upload state
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    poster_url: '',
    backdrop_url: '',
    release_date: '',
    runtime: '',
    genres: [] as string[],
    certification: '' as string,
    synopsis: '',
    director: '',
    trailer_url: '',
    in_theaters: false,
    backdrop_focus_x: null as number | null,
    backdrop_focus_y: null as number | null,
    spotlight_focus_x: null as number | null,
    spotlight_focus_y: null as number | null,
    detail_focus_x: null as number | null,
    detail_focus_y: null as number | null,
  });

  // ─── Pending changes (deferred to Save) ───
  const [pendingCastAdds, setPendingCastAdds] = useState<PendingCastAdd[]>([]);
  const [pendingCastRemoveIds, setPendingCastRemoveIds] = useState<Set<string>>(new Set());
  const [localCastOrder, setLocalCastOrder] = useState<string[] | null>(null);

  const [pendingVideoAdds, setPendingVideoAdds] = useState<
    {
      youtube_id: string;
      title: string;
      video_type: VideoType;
      description: string | null;
      video_date: string | null;
      duration: string | null;
      display_order: number;
    }[]
  >([]);
  const [pendingVideoRemoveIds, setPendingVideoRemoveIds] = useState<Set<string>>(new Set());

  const [pendingPosterAdds, setPendingPosterAdds] = useState<
    {
      image_url: string;
      title: string;
      description: string | null;
      poster_date: string | null;
      is_main: boolean;
      display_order: number;
    }[]
  >([]);
  const [pendingPosterRemoveIds, setPendingPosterRemoveIds] = useState<Set<string>>(new Set());
  const [pendingMainPosterId, setPendingMainPosterId] = useState<string | null>(null);

  const [pendingPlatformAdds, setPendingPlatformAdds] = useState<
    {
      platform_id: string;
      available_from: string | null;
      _platform?: import('@shared/types').OTTPlatform;
    }[]
  >([]);
  const [pendingPlatformRemoveIds, setPendingPlatformRemoveIds] = useState<Set<string>>(new Set());

  const [pendingPHAdds, setPendingPHAdds] = useState<
    { production_house_id: string; _ph?: import('@shared/types').ProductionHouse }[]
  >([]);
  const [pendingPHRemoveIds, setPendingPHRemoveIds] = useState<Set<string>>(new Set());

  const [pendingRunAdds, setPendingRunAdds] = useState<PendingRun[]>([]);
  const [pendingRunRemoveIds, setPendingRunRemoveIds] = useState<Set<string>>(new Set());

  // ─── Derived visible lists ───
  const visibleCast = useMemo(() => {
    const serverFiltered = castData.filter((c) => !pendingCastRemoveIds.has(c.id));
    const allItems = [
      ...serverFiltered,
      ...pendingCastAdds.map((p, i) => ({
        id: `pending-cast-${i}`,
        movie_id: id,
        actor_id: p.actor_id,
        credit_type: p.credit_type,
        role_name: p.role_name,
        role_order: p.role_order,
        display_order: p.display_order,
        actor: p._actor,
        created_at: '',
      })),
    ] as import('@/lib/types').MovieCast[];
    if (!localCastOrder) return allItems;
    const orderMap = new Map(localCastOrder.map((cid, idx) => [cid, idx]));
    return [...allItems].sort(
      (a, b) => (orderMap.get(a.id) ?? a.display_order) - (orderMap.get(b.id) ?? b.display_order),
    );
  }, [castData, pendingCastAdds, pendingCastRemoveIds, localCastOrder, id]);

  const visibleVideos = useMemo(
    () => [
      ...videosData.filter((v) => !pendingVideoRemoveIds.has(v.id)),
      ...pendingVideoAdds.map((v, i) => ({
        ...v,
        id: `pending-video-${i}`,
        movie_id: id,
        created_at: '',
      })),
    ],
    [videosData, pendingVideoAdds, pendingVideoRemoveIds, id],
  );

  const visiblePosters = useMemo(() => {
    const items = [
      ...postersData.filter((p) => !pendingPosterRemoveIds.has(p.id)),
      ...pendingPosterAdds.map((p, i) => ({
        ...p,
        id: `pending-poster-${i}`,
        movie_id: id,
        created_at: '',
      })),
    ];
    if (pendingMainPosterId) {
      return items.map((p) => ({ ...p, is_main: p.id === pendingMainPosterId }));
    }
    return items;
  }, [postersData, pendingPosterAdds, pendingPosterRemoveIds, pendingMainPosterId, id]);

  const visiblePlatforms = useMemo(
    () => [
      ...moviePlatforms.filter((mp) => !pendingPlatformRemoveIds.has(mp.platform_id)),
      ...pendingPlatformAdds.map((p) => ({
        movie_id: id,
        platform_id: p.platform_id,
        available_from: p.available_from,
        platform: p._platform,
      })),
    ],
    [moviePlatforms, pendingPlatformAdds, pendingPlatformRemoveIds, id],
  );

  const visibleProductionHouses = useMemo(
    () => [
      ...movieProductionHouses.filter((mph) => !pendingPHRemoveIds.has(mph.production_house_id)),
      ...pendingPHAdds.map((p) => ({
        movie_id: id,
        production_house_id: p.production_house_id,
        production_house: p._ph,
      })),
    ],
    [movieProductionHouses, pendingPHAdds, pendingPHRemoveIds, id],
  );

  const visibleRuns = useMemo(
    () => [
      ...theatricalRuns.filter((r) => !pendingRunRemoveIds.has(r.id)),
      ...pendingRunAdds.map((r, i) => ({
        id: `pending-run-${i}`,
        movie_id: id,
        release_date: r.release_date,
        label: r.label,
        created_at: '',
      })),
    ],
    [theatricalRuns, pendingRunAdds, pendingRunRemoveIds, id],
  );

  // ─── Track initial form state for dirty detection ───
  const [initialForm, setInitialForm] = useState<typeof form | null>(null);

  function resetPendingState() {
    setPendingCastAdds([]);
    setPendingCastRemoveIds(new Set());
    setLocalCastOrder(null);
    setPendingVideoAdds([]);
    setPendingVideoRemoveIds(new Set());
    setPendingPosterAdds([]);
    setPendingPosterRemoveIds(new Set());
    setPendingMainPosterId(null);
    setPendingPlatformAdds([]);
    setPendingPlatformRemoveIds(new Set());
    setPendingPHAdds([]);
    setPendingPHRemoveIds(new Set());
    setPendingRunAdds([]);
    setPendingRunRemoveIds(new Set());
  }

  useEffect(() => {
    if (movie) {
      const loaded = {
        title: movie.title,
        poster_url: movie.poster_url ?? '',
        backdrop_url: movie.backdrop_url ?? '',
        release_date: movie.release_date,
        runtime: movie.runtime?.toString() ?? '',
        genres: movie.genres ?? [],
        certification: movie.certification ?? '',
        synopsis: movie.synopsis ?? '',
        director: movie.director ?? '',
        trailer_url: movie.trailer_url ?? '',
        in_theaters: movie.in_theaters,
        backdrop_focus_x: movie.backdrop_focus_x ?? null,
        backdrop_focus_y: movie.backdrop_focus_y ?? null,
        spotlight_focus_x: movie.spotlight_focus_x ?? null,
        spotlight_focus_y: movie.spotlight_focus_y ?? null,
        detail_focus_x: movie.detail_focus_x ?? null,
        detail_focus_y: movie.detail_focus_y ?? null,
      };
      setForm(loaded);
      setInitialForm(loaded);
      resetPendingState();
    }
  }, [movie]);

  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    if (localCastOrder !== null) return true;
    if (pendingCastAdds.length > 0 || pendingCastRemoveIds.size > 0) return true;
    if (pendingVideoAdds.length > 0 || pendingVideoRemoveIds.size > 0) return true;
    if (pendingPosterAdds.length > 0 || pendingPosterRemoveIds.size > 0) return true;
    if (pendingMainPosterId !== null) return true;
    if (pendingPlatformAdds.length > 0 || pendingPlatformRemoveIds.size > 0) return true;
    if (pendingPHAdds.length > 0 || pendingPHRemoveIds.size > 0) return true;
    if (pendingRunAdds.length > 0 || pendingRunRemoveIds.size > 0) return true;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [
    form,
    initialForm,
    localCastOrder,
    pendingCastAdds,
    pendingCastRemoveIds,
    pendingVideoAdds,
    pendingVideoRemoveIds,
    pendingPosterAdds,
    pendingPosterRemoveIds,
    pendingMainPosterId,
    pendingPlatformAdds,
    pendingPlatformRemoveIds,
    pendingPHAdds,
    pendingPHRemoveIds,
    pendingRunAdds,
    pendingRunRemoveIds,
  ]);

  // ─── Form helpers ───
  function updateField(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImageUpload(
    file: File,
    endpoint: string,
    field: 'poster_url' | 'backdrop_url',
    setUploading: (v: boolean) => void,
  ) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setForm((prev) => ({ ...prev, [field]: data.url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setForm((prev) => ({ ...prev, backdrop_focus_x: x, backdrop_focus_y: y }));
  }

  function toggleGenre(genre: string) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }

  // ─── Section remove handlers ───
  function handleVideoRemove(videoId: string, isPending: boolean) {
    if (isPending) {
      const idx = Number(videoId.replace('pending-video-', ''));
      setPendingVideoAdds((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPendingVideoRemoveIds((prev) => new Set([...prev, videoId]));
    }
  }

  function handlePosterRemove(posterId: string, isPending: boolean) {
    if (isPending) {
      const idx = Number(posterId.replace('pending-poster-', ''));
      setPendingPosterAdds((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPendingPosterRemoveIds((prev) => new Set([...prev, posterId]));
    }
  }

  function handlePlatformRemove(platformId: string, isPending: boolean) {
    if (isPending) {
      setPendingPlatformAdds((prev) => prev.filter((p) => p.platform_id !== platformId));
    } else {
      setPendingPlatformRemoveIds((prev) => new Set([...prev, platformId]));
    }
  }

  function handlePHRemove(phId: string, isPending: boolean) {
    if (isPending) {
      setPendingPHAdds((prev) => prev.filter((p) => p.production_house_id !== phId));
    } else {
      setPendingPHRemoveIds((prev) => new Set([...prev, phId]));
    }
  }

  function handleCastRemove(castId: string, isPending: boolean) {
    if (isPending) {
      const idx = Number(castId.replace('pending-cast-', ''));
      setPendingCastAdds((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPendingCastRemoveIds((prev) => new Set([...prev, castId]));
    }
  }

  function handleRunRemove(runId: string, isPending: boolean) {
    if (isPending) {
      const idx = Number(runId.replace('pending-run-', ''));
      setPendingRunAdds((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPendingRunRemoveIds((prev) => new Set([...prev, runId]));
    }
  }

  // ─── Warn on unsaved navigation ───
  const beforeUnloadHandler = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    },
    [isDirty],
  );

  useEffect(() => {
    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler);
  }, [beforeUnloadHandler]);

  // ─── Save & Delete ───
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    if (saveStatus === 'success') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setIsSaving(true);
    try {
      const promises: Promise<unknown>[] = [
        updateMovie.mutateAsync({
          id,
          title: form.title,
          poster_url: form.poster_url || null,
          backdrop_url: form.backdrop_url || null,
          release_date: form.release_date,
          runtime: form.runtime ? Number(form.runtime) : null,
          genres: form.genres,
          certification: (form.certification || null) as 'U' | 'UA' | 'A' | null,
          synopsis: form.synopsis || null,
          director: form.director || null,
          trailer_url: form.trailer_url || null,
          in_theaters: form.in_theaters,
          backdrop_focus_x: form.backdrop_focus_x,
          backdrop_focus_y: form.backdrop_focus_y,
          spotlight_focus_x: form.spotlight_focus_x,
          spotlight_focus_y: form.spotlight_focus_y,
          detail_focus_x: form.detail_focus_x,
          detail_focus_y: form.detail_focus_y,
        }),
      ];

      // Cast: reorder — use full localCastOrder index so pending items get correct position
      if (localCastOrder) {
        const updates: { id: string; display_order: number }[] = [];
        for (let idx = 0; idx < localCastOrder.length; idx++) {
          const cid = localCastOrder[idx];
          if (!cid.startsWith('pending-')) {
            updates.push({ id: cid, display_order: idx });
          }
        }
        if (updates.length > 0) {
          promises.push(updateCastOrder.mutateAsync({ movieId: id, items: updates }));
        }
      }
      // Cast: adds — derive display_order from localCastOrder position if reordered
      for (let i = 0; i < pendingCastAdds.length; i++) {
        const { _actor, ...c } = pendingCastAdds[i];
        let displayOrder = c.display_order;
        if (localCastOrder) {
          const pos = localCastOrder.indexOf(`pending-cast-${i}`);
          if (pos !== -1) displayOrder = pos;
        }
        promises.push(addCast.mutateAsync({ movie_id: id, ...c, display_order: displayOrder }));
      }
      // Cast: removes
      for (const castId of pendingCastRemoveIds) {
        promises.push(removeCast.mutateAsync({ id: castId, movieId: id }));
      }
      // Videos: adds
      for (const v of pendingVideoAdds) {
        promises.push(addVideo.mutateAsync({ movie_id: id, ...v }));
      }
      // Videos: removes
      for (const videoId of pendingVideoRemoveIds) {
        promises.push(removeVideo.mutateAsync({ id: videoId, movieId: id }));
      }
      // Posters: adds
      for (const p of pendingPosterAdds) {
        promises.push(addPoster.mutateAsync({ movie_id: id, ...p }));
      }
      // Posters: removes
      for (const posterId of pendingPosterRemoveIds) {
        promises.push(removePoster.mutateAsync({ id: posterId, movieId: id }));
      }
      // Posters: set main
      if (pendingMainPosterId && !pendingMainPosterId.startsWith('pending-')) {
        promises.push(setMainPoster.mutateAsync({ id: pendingMainPosterId, movieId: id }));
      }
      // Platforms: adds
      for (const p of pendingPlatformAdds) {
        promises.push(
          addMoviePlatform.mutateAsync({
            movie_id: id,
            platform_id: p.platform_id,
            available_from: p.available_from,
          }),
        );
      }
      // Platforms: removes
      for (const platformId of pendingPlatformRemoveIds) {
        promises.push(removeMoviePlatform.mutateAsync({ movieId: id, platformId }));
      }
      // Production Houses: adds
      for (const ph of pendingPHAdds) {
        promises.push(
          addMovieProductionHouse.mutateAsync({
            movieId: id,
            productionHouseId: ph.production_house_id,
          }),
        );
      }
      // Production Houses: removes
      for (const phId of pendingPHRemoveIds) {
        promises.push(
          removeMovieProductionHouse.mutateAsync({ movieId: id, productionHouseId: phId }),
        );
      }
      // Theatrical Runs: adds
      for (const r of pendingRunAdds) {
        promises.push(
          addTheatricalRun.mutateAsync({
            movie_id: id,
            release_date: r.release_date,
            label: r.label,
          }),
        );
      }
      // Theatrical Runs: removes
      for (const runId of pendingRunRemoveIds) {
        promises.push(removeTheatricalRun.mutateAsync({ id: runId, movieId: id }));
      }

      await Promise.all(promises);
      resetPendingState();
      setInitialForm({ ...form });
      setSaveStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        await deleteMovie.mutateAsync(id);
        router.push('/movies');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        alert(`Delete failed: ${msg}`);
      }
    }
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );

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
    <div className="max-w-6xl">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 backdrop-blur bg-zinc-950/95 border-b border-white/10 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/movies" className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Edit Movie</h1>
            {saveStatus === 'success' && (
              <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full font-medium">
                <Check className="w-3 h-3" /> Saved successfully
              </span>
            )}
            {isDirty && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit()}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                isDirty && !isSaving
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left column — Edit form */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ─── Basic Info ─── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">Release Date *</label>
                <input
                  type="date"
                  required
                  value={form.release_date}
                  onChange={(e) => updateField('release_date', e.target.value)}
                  className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Currently In Theaters</label>
                <label className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.in_theaters}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, in_theaters: e.target.checked }))
                    }
                    className="w-5 h-5 rounded accent-red-600"
                  />
                  <span className="text-white text-sm">
                    {form.in_theaters ? 'Yes — In Theaters' : 'No'}
                  </span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">Runtime (min)</label>
                <input
                  type="number"
                  value={form.runtime}
                  onChange={(e) => updateField('runtime', e.target.value)}
                  className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Certification</label>
                <select
                  value={form.certification}
                  onChange={(e) => updateField('certification', e.target.value)}
                  className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">None</option>
                  <option value="U">U</option>
                  <option value="UA">UA</option>
                  <option value="A">A</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Director</label>
              <input
                type="text"
                value={form.director}
                onChange={(e) => updateField('director', e.target.value)}
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Poster</label>
              <input
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    handleImageUpload(
                      file,
                      '/api/upload/movie-poster',
                      'poster_url',
                      setUploadingPoster,
                    );
                  e.target.value = '';
                }}
              />
              {form.poster_url ? (
                <div className="flex items-center gap-4">
                  <img
                    src={form.poster_url}
                    alt="Poster preview"
                    className="w-20 h-28 rounded-lg object-cover border border-white/10"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={uploadingPoster}
                      onClick={() => posterInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-1.5 bg-white/10 rounded-lg disabled:opacity-50"
                    >
                      {uploadingPoster ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('poster_url', '')}
                      className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingPoster}
                  onClick={() => posterInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 rounded-xl px-4 py-3 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50"
                >
                  {uploadingPoster ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingPoster ? 'Uploading...' : 'Upload Poster'}
                </button>
              )}
              {form.poster_url && (
                <p className="mt-2 text-xs text-white/20 truncate">{form.poster_url}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Backdrop</label>
              <input
                ref={backdropInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    handleImageUpload(
                      file,
                      '/api/upload/movie-backdrop',
                      'backdrop_url',
                      setUploadingBackdrop,
                    );
                  e.target.value = '';
                }}
              />
              {form.backdrop_url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <img
                      src={form.backdrop_url}
                      alt="Backdrop preview"
                      className="w-40 h-[90px] rounded-lg object-cover border border-white/10"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={uploadingBackdrop}
                        onClick={() => backdropInputRef.current?.click()}
                        className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-1.5 bg-white/10 rounded-lg disabled:opacity-50"
                      >
                        {uploadingBackdrop ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('backdrop_url', '')}
                        className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white/20 truncate">{form.backdrop_url}</p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingBackdrop}
                  onClick={() => backdropInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 rounded-xl px-4 py-3 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50"
                >
                  {uploadingBackdrop ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingBackdrop ? 'Uploading...' : 'Upload Backdrop'}
                </button>
              )}
            </div>
            {form.backdrop_url && (
              <div>
                <label className="block text-sm text-white/60 mb-1">
                  Backdrop Focal Point{' '}
                  <span className="text-white/30 font-normal">— click image to set</span>
                </label>
                <div
                  className="relative w-full overflow-hidden rounded-xl cursor-crosshair"
                  style={{ aspectRatio: '16/9' }}
                  onClick={handleBackdropClick}
                >
                  <img
                    src={form.backdrop_url}
                    alt="Backdrop preview"
                    className="w-full h-full object-cover pointer-events-none select-none"
                  />
                  {form.backdrop_focus_x != null && form.backdrop_focus_y != null && (
                    <div
                      className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white bg-red-500/60 pointer-events-none"
                      style={{
                        left: `${form.backdrop_focus_x * 100}%`,
                        top: `${form.backdrop_focus_y * 100}%`,
                      }}
                    />
                  )}
                </div>
                {form.backdrop_focus_x != null && form.backdrop_focus_y != null && (
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-white/40">
                      Focus: ({Math.round(form.backdrop_focus_x * 100)}%,{' '}
                      {Math.round(form.backdrop_focus_y * 100)}%)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, backdrop_focus_x: null, backdrop_focus_y: null }))
                      }
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm text-white/60 mb-1">Trailer URL</label>
              <input
                type="url"
                value={form.trailer_url}
                onChange={(e) => updateField('trailer_url', e.target.value)}
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Synopsis</label>
              <textarea
                rows={4}
                value={form.synopsis}
                onChange={(e) => updateField('synopsis', e.target.value)}
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Genres</label>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.genres.includes(genre) ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* ─── Section Components ─── */}
          <VideosSection
            visibleVideos={visibleVideos}
            trailerUrl={form.trailer_url}
            movieTitle={form.title}
            onAdd={(video) => setPendingVideoAdds((prev) => [...prev, video])}
            onRemove={handleVideoRemove}
          />

          <PostersSection
            visiblePosters={visiblePosters}
            posterUrl={form.poster_url}
            onAdd={(poster) => setPendingPosterAdds((prev) => [...prev, poster])}
            onRemove={handlePosterRemove}
            onSetMain={(posterId) => setPendingMainPosterId(posterId)}
          />

          <PlatformsSection
            visiblePlatforms={visiblePlatforms}
            allPlatforms={allPlatforms}
            onAdd={(platform) => setPendingPlatformAdds((prev) => [...prev, platform])}
            onRemove={handlePlatformRemove}
            pendingPlatformAdds={pendingPlatformAdds}
          />

          <ProductionHousesSection
            visibleProductionHouses={visibleProductionHouses}
            allProductionHouses={allProductionHouses}
            onAdd={(ph) => setPendingPHAdds((prev) => [...prev, ph])}
            onRemove={handlePHRemove}
            pendingPHAdds={pendingPHAdds}
          />

          <CastSection
            visibleCast={visibleCast}
            actors={actors}
            castSearchQuery={castSearchQuery}
            setCastSearchQuery={setCastSearchQuery}
            onAdd={(cast) => setPendingCastAdds((prev) => [...prev, cast])}
            onRemove={handleCastRemove}
            onReorder={(newOrder) => setLocalCastOrder(newOrder)}
          />

          <TheatricalRunsSection
            visibleRuns={visibleRuns}
            onAdd={(run) => setPendingRunAdds((prev) => [...prev, run])}
            onRemove={handleRunRemove}
          />
        </div>

        {/* Right column — Preview */}
        <div className="w-[340px] shrink-0 sticky top-16 self-start space-y-3">
          <DeviceSelector selected={device} onChange={setDevice} />

          {/* Spotlight / Detail toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewMode('spotlight')}
              className={
                previewMode === 'spotlight'
                  ? 'bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium'
                  : 'bg-white/10 text-white/60 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/20'
              }
            >
              Spotlight
            </button>
            <button
              onClick={() => setPreviewMode('detail')}
              className={
                previewMode === 'detail'
                  ? 'bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium'
                  : 'bg-white/10 text-white/60 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/20'
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
                    release_date: form.release_date || new Date().toISOString(),
                    in_theaters: form.in_theaters,
                  },
                  0,
                )}
                rating={0}
                runtime={form.runtime ? Number(form.runtime) : null}
                certification={form.certification || null}
                releaseDate={form.release_date || new Date().toISOString()}
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
                    release_date: form.release_date || new Date().toISOString(),
                    in_theaters: form.in_theaters,
                  },
                  0,
                )}
                rating={0}
                reviewCount={0}
                runtime={form.runtime ? Number(form.runtime) : null}
                certification={form.certification || null}
                releaseDate={form.release_date || new Date().toISOString()}
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
              <span className="text-xs text-white/40">
                Focus: ({Math.round(contextFocusX * 100)}%,{' '}
                {Math.round(
                  ((previewMode === 'spotlight' ? form.spotlight_focus_y : form.detail_focus_y) ??
                    0) * 100,
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
      </div>
    </div>
  );
}
