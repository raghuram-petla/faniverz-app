'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
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
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  X,
  Upload,
  Star,
  Play,
  Film,
  Building2,
  GripVertical,
  User,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { DEVICES, VIDEO_TYPES } from '@shared/constants';
import type { VideoType } from '@/lib/types';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import { SpotlightPreview } from '@/components/preview/SpotlightPreview';
import { MovieDetailPreview } from '@/components/preview/MovieDetailPreview';
import { deriveMovieStatus } from '@shared/movieStatus';

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

const ROLE_ORDER_OPTIONS = [
  { value: 1, label: '1 — Director' },
  { value: 2, label: '2 — Producer' },
  { value: 3, label: '3 — Music Director' },
  { value: 4, label: '4 — Director of Photography' },
  { value: 5, label: '5 — Editor' },
  { value: 6, label: '6 — Art Director' },
  { value: 7, label: '7 — Stunt Choreographer' },
  { value: 8, label: '8 — Choreographer' },
  { value: 9, label: '9 — Lyricist' },
];

const EMPTY_CAST_FORM = {
  actor_id: '',
  credit_type: 'cast' as 'cast' | 'crew',
  role_name: '',
  role_order: '',
};

const EMPTY_VIDEO_FORM = {
  youtube_input: '',
  title: '',
  video_type: 'trailer' as VideoType,
  description: '',
  video_date: '',
  duration: '',
};

const EMPTY_POSTER_FORM = {
  title: '',
  description: '',
  poster_date: '',
  is_main: false,
};

function SortableCastItem({
  entry,
  onRemove,
}: {
  entry: import('@/lib/types').MovieCast;
  movieId: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
        {entry.actor?.photo_url ? (
          <img
            src={entry.actor.photo_url}
            alt={entry.actor.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-4 h-4 text-white/40" />
        )}
      </div>
      <span className="text-xs font-bold uppercase text-white/40 w-10">
        {entry.credit_type === 'cast' ? 'Cast' : 'Crew'}
      </span>
      <span className="text-white font-medium flex-1 truncate">
        {entry.actor?.name ?? entry.actor_id}
      </span>
      {entry.role_name && (
        <span className="text-white/60 text-sm truncate max-w-[120px]">{entry.role_name}</span>
      )}
      {entry.role_order != null && (
        <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
          #{entry.role_order}
        </span>
      )}
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
        aria-label={`Remove ${entry.actor?.name}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: movie, isLoading } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();
  const { data: castData = [] } = useMovieCast(id);
  const { data: actorsData } = useAdminActors();
  const actors = actorsData?.pages.flat() ?? [];
  const addCast = useAddCast();
  const removeCast = useRemoveCast();
  const updateCastOrder = useUpdateCastOrder();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
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
  const [previewMode, setPreviewMode] = useState<'spotlight' | 'detail'>('spotlight');
  const [device, setDevice] = useState(DEVICES[1]);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);
  const [castForm, setCastForm] = useState(EMPTY_CAST_FORM);
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const [castDropdownOpen, setCastDropdownOpen] = useState(false);
  const [runForm, setRunForm] = useState({ release_date: '', label: '' });
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO_FORM);
  const [posterForm, setPosterForm] = useState(EMPTY_POSTER_FORM);
  const [uploadingGalleryPoster, setUploadingGalleryPoster] = useState(false);
  const galleryPosterInputRef = useRef<HTMLInputElement>(null);
  const [selectedProductionHouseId, setSelectedProductionHouseId] = useState('');
  const { data: moviePlatforms = [] } = useMoviePlatforms(id);
  const { data: allPlatforms = [] } = useAdminPlatforms();
  const addMoviePlatform = useAddMoviePlatform();
  const removeMoviePlatform = useRemoveMoviePlatform();
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [platformAvailableFrom, setPlatformAvailableFrom] = useState('');
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
  // Cast
  const [pendingCastAdds, setPendingCastAdds] = useState<
    {
      actor_id: string;
      credit_type: 'cast' | 'crew';
      role_name: string | null;
      role_order: number | null;
      display_order: number;
      _actor?: import('@shared/types').Actor;
    }[]
  >([]);
  const [pendingCastRemoveIds, setPendingCastRemoveIds] = useState<Set<string>>(new Set());
  const [localCastOrder, setLocalCastOrder] = useState<string[] | null>(null);

  // Videos
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

  // Posters
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

  // Platforms
  const [pendingPlatformAdds, setPendingPlatformAdds] = useState<
    {
      platform_id: string;
      available_from: string | null;
      _platform?: import('@shared/types').OTTPlatform;
    }[]
  >([]);
  const [pendingPlatformRemoveIds, setPendingPlatformRemoveIds] = useState<Set<string>>(new Set());

  // Production Houses
  const [pendingPHAdds, setPendingPHAdds] = useState<
    { production_house_id: string; _ph?: import('@shared/types').ProductionHouse }[]
  >([]);
  const [pendingPHRemoveIds, setPendingPHRemoveIds] = useState<Set<string>>(new Set());

  // Theatrical Runs
  const [pendingRunAdds, setPendingRunAdds] = useState<
    { release_date: string; label: string | null }[]
  >([]);
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

  function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    const youtubeId = extractYouTubeId(videoForm.youtube_input);
    if (!youtubeId) {
      alert('Invalid YouTube URL or ID. Please enter a valid YouTube video link.');
      return;
    }
    setPendingVideoAdds((prev) => [
      ...prev,
      {
        youtube_id: youtubeId,
        title: videoForm.title,
        video_type: videoForm.video_type,
        description: videoForm.description || null,
        video_date: videoForm.video_date || null,
        duration: videoForm.duration || null,
        display_order: visibleVideos.length,
      },
    ]);
    setVideoForm(EMPTY_VIDEO_FORM);
  }

  async function handleAddPoster(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    setUploadingGalleryPoster(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload/movie-poster', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');

      setPendingPosterAdds((prev) => [
        ...prev,
        {
          image_url: data.url,
          title: posterForm.title || 'Poster',
          description: posterForm.description || null,
          poster_date: posterForm.poster_date || null,
          is_main: posterForm.is_main,
          display_order: visiblePosters.length,
        },
      ]);
      setPosterForm(EMPTY_POSTER_FORM);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingGalleryPoster(false);
    }
  }

  const [isSaving, setIsSaving] = useState(false);

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

      // Cast: reorder
      if (localCastOrder) {
        const updates = localCastOrder
          .filter((cid) => !cid.startsWith('pending-'))
          .map((castId, idx) => ({ id: castId, display_order: idx }));
        if (updates.length > 0) {
          promises.push(updateCastOrder.mutateAsync({ movieId: id, items: updates }));
        }
      }
      // Cast: adds
      for (const c of pendingCastAdds) {
        promises.push(addCast.mutateAsync({ movie_id: id, ...c }));
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
      router.push('/movies');
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

  function handleAddTheatricalRun(e: React.FormEvent) {
    e.preventDefault();
    if (!runForm.release_date) return;
    setPendingRunAdds((prev) => [
      ...prev,
      { release_date: runForm.release_date, label: runForm.label || null },
    ]);
    setRunForm({ release_date: '', label: '' });
  }

  function handleAddCast(e: React.FormEvent) {
    e.preventDefault();
    if (!castForm.actor_id) return;
    const actor = actors.find((a) => a.id === castForm.actor_id);
    setPendingCastAdds((prev) => [
      ...prev,
      {
        actor_id: castForm.actor_id,
        credit_type: castForm.credit_type,
        role_name: castForm.role_name || null,
        role_order:
          castForm.credit_type === 'crew' && castForm.role_order
            ? Number(castForm.role_order)
            : null,
        display_order: visibleCast.length,
        _actor: actor,
      },
    ]);
    setCastForm(EMPTY_CAST_FORM);
    setCastSearchQuery('');
  }

  function handleCastDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentOrder = visibleCast;
    const oldIndex = currentOrder.findIndex((c) => c.id === active.id);
    const newIndex = currentOrder.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentOrder, oldIndex, newIndex);
    setLocalCastOrder(reordered.map((item) => item.id));
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/movies" className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Movie</h1>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      <div className="flex gap-8">
        {/* Left column — Edit form */}
        <div className="flex-1 min-w-0 space-y-6">
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

          {/* Videos Management */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5" /> Videos
            </h2>

            {/* Backward compat: import trailer_url as a video */}
            {form.trailer_url && visibleVideos.length === 0 && (
              <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-blue-400 font-medium">
                    This movie has a trailer URL but no videos.
                  </p>
                  <p className="text-xs text-white/40 mt-1">Import it as the first video entry?</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const youtubeId = extractYouTubeId(form.trailer_url);
                    if (!youtubeId) {
                      alert('Could not extract a YouTube ID from the trailer URL.');
                      return;
                    }
                    setPendingVideoAdds((prev) => [
                      ...prev,
                      {
                        youtube_id: youtubeId,
                        title: `${form.title} - Official Trailer`,
                        video_type: 'trailer' as VideoType,
                        description: null,
                        video_date: null,
                        duration: null,
                        display_order: 0,
                      },
                    ]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Import
                </button>
              </div>
            )}

            {visibleVideos.length > 0 && (
              <div className="space-y-2">
                {visibleVideos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                  >
                    <img
                      src={getYouTubeThumbnail(video.youtube_id)}
                      alt={video.title}
                      className="w-24 h-[54px] rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{video.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">
                          {VIDEO_TYPES.find((t) => t.value === video.video_type)?.label ??
                            video.video_type}
                        </span>
                        {video.duration && (
                          <span className="text-xs text-white/40">{video.duration}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (video.id.startsWith('pending-video-')) {
                          const idx = Number(video.id.replace('pending-video-', ''));
                          setPendingVideoAdds((prev) => prev.filter((_, i) => i !== idx));
                        } else {
                          setPendingVideoRemoveIds((prev) => new Set([...prev, video.id]));
                        }
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                      aria-label={`Remove ${video.title}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddVideo} className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/60">Add Video</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">YouTube URL or ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
                    value={videoForm.youtube_input}
                    onChange={(e) => setVideoForm((p) => ({ ...p, youtube_input: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Type *</label>
                  <select
                    value={videoForm.video_type}
                    onChange={(e) =>
                      setVideoForm((p) => ({ ...p, video_type: e.target.value as VideoType }))
                    }
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  >
                    {VIDEO_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official Trailer"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 2:34"
                    value={videoForm.duration}
                    onChange={(e) => setVideoForm((p) => ({ ...p, duration: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Date</label>
                  <input
                    type="date"
                    value={videoForm.video_date}
                    onChange={(e) => setVideoForm((p) => ({ ...p, video_date: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>
              {/* YouTube embed preview */}
              {extractYouTubeId(videoForm.youtube_input) && (
                <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(videoForm.youtube_input)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="YouTube preview"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={!videoForm.youtube_input || !videoForm.title}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add Video
              </button>
            </form>
          </div>

          {/* Posters Gallery */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5" /> Poster Gallery
            </h2>

            {/* Backward compat: import poster_url to gallery */}
            {form.poster_url && visiblePosters.length === 0 && (
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
                    setPendingPosterAdds((prev) => [
                      ...prev,
                      {
                        image_url: form.poster_url,
                        title: 'Official Poster',
                        description: null,
                        poster_date: null,
                        is_main: true,
                        display_order: 0,
                      },
                    ]);
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
                  <div
                    key={poster.id}
                    className="relative group bg-white/5 rounded-xl overflow-hidden"
                  >
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
                          onClick={() => setPendingMainPosterId(poster.id)}
                          className="text-xs bg-yellow-500 text-black px-3 py-1 rounded font-semibold hover:bg-yellow-400"
                        >
                          Set as Main
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (poster.id.startsWith('pending-poster-')) {
                            const idx = Number(poster.id.replace('pending-poster-', ''));
                            setPendingPosterAdds((prev) => prev.filter((_, i) => i !== idx));
                          } else {
                            setPendingPosterRemoveIds((prev) => new Set([...prev, poster.id]));
                          }
                        }}
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
                ref={galleryPosterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAddPoster(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={uploadingGalleryPoster || !posterForm.title}
                onClick={() => galleryPosterInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {uploadingGalleryPoster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingGalleryPoster ? 'Uploading...' : 'Upload & Add Poster'}
              </button>
            </div>
          </div>

          {/* OTT Platforms */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5" /> OTT Platforms
            </h2>

            {visiblePlatforms.length > 0 && (
              <div className="space-y-2">
                {visiblePlatforms.map((mp) => (
                  <div
                    key={mp.platform_id}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                      style={{ backgroundColor: mp.platform?.color || '#333' }}
                    >
                      {mp.platform?.logo ? (
                        <img src={mp.platform.logo} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <Film className="w-5 h-5 text-white/60" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">
                        {mp.platform?.name ?? mp.platform_id}
                      </span>
                      {mp.available_from && (
                        <span className="text-white/40 text-sm ml-2">from {mp.available_from}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const isPending = pendingPlatformAdds.some(
                          (p) => p.platform_id === mp.platform_id,
                        );
                        if (isPending) {
                          setPendingPlatformAdds((prev) =>
                            prev.filter((p) => p.platform_id !== mp.platform_id),
                          );
                        } else {
                          setPendingPlatformRemoveIds((prev) => new Set([...prev, mp.platform_id]));
                        }
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                      aria-label={`Remove ${mp.platform?.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/60">Add OTT Platform</p>
              <div className="flex gap-3">
                <select
                  value={selectedPlatformId}
                  onChange={(e) => setSelectedPlatformId(e.target.value)}
                  className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
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
                  value={platformAvailableFrom}
                  onChange={(e) => setPlatformAvailableFrom(e.target.value)}
                  placeholder="Available from"
                  className="bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                />
                <button
                  type="button"
                  disabled={!selectedPlatformId}
                  onClick={() => {
                    const platform = allPlatforms.find((p) => p.id === selectedPlatformId);
                    setPendingPlatformAdds((prev) => [
                      ...prev,
                      {
                        platform_id: selectedPlatformId,
                        available_from: platformAvailableFrom || null,
                        _platform: platform,
                      },
                    ]);
                    setSelectedPlatformId('');
                    setPlatformAvailableFrom('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Production Houses */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Production Houses
            </h2>

            {visibleProductionHouses.length > 0 && (
              <div className="space-y-2">
                {visibleProductionHouses.map((mph) => (
                  <div
                    key={mph.production_house_id}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {mph.production_house?.logo_url ? (
                        <img
                          src={mph.production_house.logo_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-white/40" />
                      )}
                    </div>
                    <span className="text-white font-medium flex-1">
                      {mph.production_house?.name ?? mph.production_house_id}
                    </span>
                    <button
                      onClick={() => {
                        const isPending = pendingPHAdds.some(
                          (p) => p.production_house_id === mph.production_house_id,
                        );
                        if (isPending) {
                          setPendingPHAdds((prev) =>
                            prev.filter((p) => p.production_house_id !== mph.production_house_id),
                          );
                        } else {
                          setPendingPHRemoveIds(
                            (prev) => new Set([...prev, mph.production_house_id]),
                          );
                        }
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                      aria-label={`Remove ${mph.production_house?.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/60">Add Production House</p>
              <div className="flex gap-3">
                <select
                  value={selectedProductionHouseId}
                  onChange={(e) => setSelectedProductionHouseId(e.target.value)}
                  className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Select production house…</option>
                  {allProductionHouses
                    .filter(
                      (ph) =>
                        !visibleProductionHouses.some((mph) => mph.production_house_id === ph.id),
                    )
                    .map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedProductionHouseId}
                  onClick={() => {
                    const ph = allProductionHouses.find((p) => p.id === selectedProductionHouseId);
                    setPendingPHAdds((prev) => [
                      ...prev,
                      { production_house_id: selectedProductionHouseId, _ph: ph },
                    ]);
                    setSelectedProductionHouseId('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Cast & Crew Management */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-white">Cast &amp; Crew</h2>

            {visibleCast.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCastDragEnd}
              >
                <SortableContext
                  items={visibleCast.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {visibleCast.map((entry) => (
                      <SortableCastItem
                        key={entry.id}
                        entry={entry}
                        movieId={id}
                        onRemove={() => {
                          if (entry.id.startsWith('pending-cast-')) {
                            const idx = Number(entry.id.replace('pending-cast-', ''));
                            setPendingCastAdds((prev) => prev.filter((_, i) => i !== idx));
                          } else {
                            setPendingCastRemoveIds((prev) => new Set([...prev, entry.id]));
                          }
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <form onSubmit={handleAddCast} className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/60">Add Cast / Crew</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Type</label>
                  <select
                    value={castForm.credit_type}
                    onChange={(e) =>
                      setCastForm((p) => ({
                        ...p,
                        credit_type: e.target.value as 'cast' | 'crew',
                        role_order: '',
                      }))
                    }
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="cast">Cast (Actor)</option>
                    <option value="crew">Crew (Technician)</option>
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs text-white/40 mb-1">Person *</label>
                  <input
                    type="text"
                    placeholder="Type to search…"
                    value={castSearchQuery}
                    onChange={(e) => {
                      setCastSearchQuery(e.target.value);
                      setCastForm((p) => ({ ...p, actor_id: '' }));
                      setCastDropdownOpen(true);
                    }}
                    onFocus={() => setCastDropdownOpen(true)}
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                  {castDropdownOpen && castSearchQuery.length > 0 && (
                    <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-zinc-800 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {actors
                        .filter((a) => a.name.toLowerCase().includes(castSearchQuery.toLowerCase()))
                        .slice(0, 20)
                        .map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setCastForm((p) => ({ ...p, actor_id: a.id }));
                              setCastSearchQuery(a.name);
                              setCastDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                              {a.photo_url ? (
                                <img
                                  src={a.photo_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-3 h-3 text-white/40" />
                              )}
                            </div>
                            {a.name}
                          </button>
                        ))}
                      {actors.filter((a) =>
                        a.name.toLowerCase().includes(castSearchQuery.toLowerCase()),
                      ).length === 0 && (
                        <p className="px-3 py-2 text-sm text-white/40">No results</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    {castForm.credit_type === 'cast' ? 'Character Name' : 'Role Title'}
                  </label>
                  <input
                    type="text"
                    placeholder={castForm.credit_type === 'cast' ? 'e.g. Arjun' : 'e.g. Director'}
                    value={castForm.role_name}
                    onChange={(e) => setCastForm((p) => ({ ...p, role_name: e.target.value }))}
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                {castForm.credit_type === 'crew' && (
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Role Order</label>
                    <select
                      value={castForm.role_order}
                      onChange={(e) => setCastForm((p) => ({ ...p, role_order: e.target.value }))}
                      className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="">Select role…</option>
                      {ROLE_ORDER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!castForm.actor_id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </form>
          </div>

          {/* Theatrical Runs */}
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-white">Theatrical Runs</h2>
            <p className="text-sm text-white/40">
              Track original release and any re-releases. Use this to record when a movie returns to
              theaters.
            </p>

            {visibleRuns.length > 0 && (
              <div className="space-y-2">
                {visibleRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                  >
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
                      onClick={() => {
                        if (run.id.startsWith('pending-run-')) {
                          const idx = Number(run.id.replace('pending-run-', ''));
                          setPendingRunAdds((prev) => prev.filter((_, i) => i !== idx));
                        } else {
                          setPendingRunRemoveIds((prev) => new Set([...prev, run.id]));
                        }
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                      aria-label={`Remove run ${run.release_date}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddTheatricalRun} className="bg-white/5 rounded-xl p-4 space-y-3">
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
        </div>

        {/* Right column — Preview */}
        <div className="w-[340px] shrink-0 sticky top-6 self-start space-y-3">
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

      {/* Sticky Save Bar */}
      <div
        className={`sticky bottom-0 left-0 right-0 backdrop-blur border-t py-4 px-6 -mx-4 mt-8 flex items-center justify-between z-20 transition-colors ${
          isDirty ? 'bg-zinc-900/95 border-red-600/30' : 'bg-zinc-900/80 border-white/5'
        }`}
      >
        <span className="text-sm text-white/40">
          {isDirty ? 'You have unsaved changes' : 'No unsaved changes'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!isDirty || isSaving}
          className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            isDirty && !isSaving
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
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
      </div>
    </div>
  );
}
