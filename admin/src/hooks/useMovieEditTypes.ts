'use client';
import type React from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { QueryClient } from '@tanstack/react-query';
import type { VideoType } from '@/lib/types';
import type { MovieCast } from '@/lib/types';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';
import type { OTTPlatform, ProductionHouse } from '@shared/types';

// @contract MovieForm mirrors the editable subset of the movies table
// spotlight_focus_* and detail_focus_* are preserved separately in movieData
export interface MovieForm {
  title: string;
  poster_url: string;
  backdrop_url: string;
  release_date: string;
  runtime: string;
  genres: string[];
  certification: string;
  synopsis: string;
  in_theaters: boolean;
  premiere_date: string;
  original_language: string;
  is_featured: boolean;
  /** @nullable TMDB ID — links manually-created movies to TMDB for dedup and sync */
  tmdb_id: string;
  /** @nullable tagline — editable summary line from TMDB, admin can tweak */
  tagline: string;
  backdrop_focus_x: number | null;
  backdrop_focus_y: number | null;
  poster_focus_x: number | null;
  poster_focus_y: number | null;
}

export type PendingVideoAdd = {
  // @contract: stable ID for removal — prevents index-shift bugs when removing pending items
  _id: string;
  youtube_id: string;
  title: string;
  video_type: VideoType;
  description: string | null;
  video_date: string | null;
  display_order: number;
};

export type PendingPosterAdd = {
  // @contract stable client-side ID — survives array reordering/removal unlike index-based IDs
  _id: string;
  image_url: string;
  title: string;
  description: string | null;
  poster_date: string | null;
  is_main_poster: boolean;
  is_main_backdrop: boolean;
  image_type: 'poster' | 'backdrop';
  display_order: number;
};

export type PendingPlatformAdd = {
  platform_id: string;
  available_from: string | null;
  // @nullable streaming_url — direct link to the movie on this OTT platform
  streaming_url: string | null;
  _platform?: OTTPlatform;
};

export type PendingPHAdd = { production_house_id: string; _ph?: ProductionHouse };

// @contract Minimal mutation interface — only mutateAsync is required by handlers
interface MutateAsync<TArgs, TResult = unknown> {
  mutateAsync: (args: TArgs) => Promise<TResult>;
}

// @coupling Consumed by createMovieEditHandlers — all fields must be provided by useMovieEditState
// @assumes All mutation objects are already initialized via their respective hooks
export interface MovieEditHandlerDeps {
  id: string;
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  router: AppRouterInstance;
  queryClient: QueryClient;
  // @nullable Original movie data — null when movie hasn't loaded yet
  movieData?: {
    spotlight_focus_x: number | null;
    spotlight_focus_y: number | null;
    detail_focus_x: number | null;
    detail_focus_y: number | null;
  } | null;

  // Pending state setters
  setPendingCastAdds: React.Dispatch<React.SetStateAction<PendingCastAdd[]>>;
  setPendingCastRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingVideoAdds: React.Dispatch<React.SetStateAction<PendingVideoAdd[]>>;
  setPendingVideoRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingPosterAdds: React.Dispatch<React.SetStateAction<PendingPosterAdd[]>>;
  setPendingPosterRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingPlatformAdds: React.Dispatch<React.SetStateAction<PendingPlatformAdd[]>>;
  setPendingPlatformRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingPHAdds: React.Dispatch<React.SetStateAction<PendingPHAdd[]>>;
  setPendingPHRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingRunAdds: React.Dispatch<React.SetStateAction<PendingRun[]>>;
  setPendingRunRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingRunEndIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;

  // @nullable localCastOrder — null means no reorder has occurred (keep server order)
  localCastOrder: string[] | null;
  pendingCastAdds: PendingCastAdd[];
  pendingCastRemoveIds: Set<string>;
  pendingVideoAdds: PendingVideoAdd[];
  pendingVideoRemoveIds: Set<string>;
  pendingPosterAdds: PendingPosterAdd[];
  pendingPosterRemoveIds: Set<string>;
  pendingMainPosterId: string | null;
  // @assumes contains only DB-persisted posters (not pending adds) — used for effectivePosterUrl lookup
  postersData: { id: string; image_url: string }[];
  pendingPlatformAdds: PendingPlatformAdd[];
  pendingPlatformRemoveIds: Set<string>;
  pendingPHAdds: PendingPHAdd[];
  pendingPHRemoveIds: Set<string>;
  pendingRunAdds: PendingRun[];
  pendingRunRemoveIds: Set<string>;
  pendingRunEndIds: Map<string, string>;

  // Mutation objects
  updateMovie: MutateAsync<{
    id: string;
    title: string;
    poster_url: string | null;
    backdrop_url: string | null;
    release_date: string | null;
    runtime: number | null;
    genres: string[];
    certification: 'U' | 'UA' | 'A' | null;
    synopsis: string | null;
    in_theaters: boolean;
    premiere_date: string | null;
    original_language: string | null;
    is_featured: boolean;
    tmdb_id: number | null;
    tagline: string | null;
    backdrop_focus_x: number | null;
    backdrop_focus_y: number | null;
    spotlight_focus_x: number | null;
    spotlight_focus_y: number | null;
    detail_focus_x: number | null;
    detail_focus_y: number | null;
  }>;
  deleteMovie: MutateAsync<string>;
  addCast: MutateAsync<Partial<MovieCast>>;
  removeCast: MutateAsync<{ id: string; movieId: string }>;
  updateCastOrder: MutateAsync<{ movieId: string; items: { id: string; display_order: number }[] }>;
  addVideo: MutateAsync<{ movie_id: string } & Omit<PendingVideoAdd, '_id'>>;
  removeVideo: MutateAsync<{ id: string; movieId: string }>;
  addPoster: MutateAsync<{ movie_id: string } & Omit<PendingPosterAdd, '_id'>>;
  removePoster: MutateAsync<{ id: string; movieId: string }>;
  setMainPoster: MutateAsync<{ id: string; movieId: string }>;
  setMainBackdrop: MutateAsync<{ id: string; movieId: string }>;
  addMoviePlatform: MutateAsync<{
    movie_id: string;
    platform_id: string;
    available_from: string | null;
    streaming_url?: string | null;
  }>;
  removeMoviePlatform: MutateAsync<{ movieId: string; platformId: string }>;
  addMovieProductionHouse: MutateAsync<{ movieId: string; productionHouseId: string }>;
  removeMovieProductionHouse: MutateAsync<{ movieId: string; productionHouseId: string }>;
  addTheatricalRun: MutateAsync<{
    movie_id: string;
    release_date: string;
    label: string | null;
  }>;
  removeTheatricalRun: MutateAsync<{ id: string; movieId: string }>;
  updateTheatricalRun: MutateAsync<{ id: string; movieId: string; end_date: string }>;

  // Callbacks into main hook
  resetPendingState: () => void;
  setInitialForm: React.Dispatch<React.SetStateAction<MovieForm | null>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'success'>>;
  setUploadingPoster: (v: boolean) => void;
  setUploadingBackdrop: (v: boolean) => void;
}

// ── Change-tracking types (used by useMovieEditChanges + revert helper) ──

// Minimal interfaces for server data lookups (only fields needed for display names)
export interface CastRow {
  id: string;
  actor?: { name: string } | null;
  character_name?: string | null;
}
export interface VideoRow {
  id: string;
  title: string;
}
export interface PosterRow {
  id: string;
  title: string | null;
  image_url: string;
  image_type: 'poster' | 'backdrop';
  is_main_poster: boolean;
  is_main_backdrop: boolean;
  description: string | null;
  poster_date: string | null;
  tmdb_file_path: string | null;
  iso_639_1: string | null;
  width: number | null;
  height: number | null;
  vote_average: number;
  display_order: number;
  created_at: string;
  movie_id: string;
}
export interface PlatformRow {
  platform_id: string;
  platform?: { name: string } | null;
}
export interface PHRow {
  production_house_id: string;
  production_house?: { name: string } | null;
}
export interface RunRow {
  id: string;
  release_date: string;
  label?: string | null;
}

// @contract params for useMovieEditChanges — all pending state + server data for change diffing
export interface UseMovieEditChangesParams {
  form: MovieForm;
  initialForm: MovieForm | null;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  setInitialForm: React.Dispatch<React.SetStateAction<MovieForm | null>>;
  // Cast
  pendingCastAdds: PendingCastAdd[];
  pendingCastRemoveIds: Set<string>;
  localCastOrder: string[] | null;
  castData: CastRow[];
  setPendingCastAdds: React.Dispatch<React.SetStateAction<PendingCastAdd[]>>;
  setPendingCastRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLocalCastOrder: (order: string[] | null) => void;
  // Videos
  pendingVideoAdds: PendingVideoAdd[];
  pendingVideoRemoveIds: Set<string>;
  videosData: VideoRow[];
  setPendingVideoAdds: React.Dispatch<React.SetStateAction<PendingVideoAdd[]>>;
  setPendingVideoRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Posters
  pendingPosterAdds: PendingPosterAdd[];
  pendingPosterRemoveIds: Set<string>;
  pendingMainPosterId: string | null;
  savedMainPosterId: string | null;
  postersData: PosterRow[];
  setPendingPosterAdds: React.Dispatch<React.SetStateAction<PendingPosterAdd[]>>;
  setPendingPosterRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingMainPosterId: (id: string | null) => void;
  // Platforms
  pendingPlatformAdds: PendingPlatformAdd[];
  pendingPlatformRemoveIds: Set<string>;
  moviePlatforms: PlatformRow[];
  setPendingPlatformAdds: React.Dispatch<React.SetStateAction<PendingPlatformAdd[]>>;
  setPendingPlatformRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Production Houses
  pendingPHAdds: PendingPHAdd[];
  pendingPHRemoveIds: Set<string>;
  movieProductionHouses: PHRow[];
  setPendingPHAdds: React.Dispatch<React.SetStateAction<PendingPHAdd[]>>;
  setPendingPHRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Theatrical Runs
  pendingRunAdds: PendingRun[];
  pendingRunRemoveIds: Set<string>;
  pendingRunEndIds: Map<string, string>;
  theatricalRuns: RunRow[];
  setPendingRunAdds: React.Dispatch<React.SetStateAction<PendingRun[]>>;
  setPendingRunRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingRunEndIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  // Reset
  resetPendingState: () => void;
}
