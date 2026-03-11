'use client';
import type React from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { VideoType } from '@/lib/types';
import type { MovieCast } from '@/lib/types';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';
import type { OTTPlatform, ProductionHouse } from '@shared/types';

export interface MovieForm {
  title: string;
  poster_url: string;
  backdrop_url: string;
  release_date: string;
  runtime: string;
  genres: string[];
  certification: string;
  synopsis: string;
  trailer_url: string;
  in_theaters: boolean;
  backdrop_focus_x: number | null;
  backdrop_focus_y: number | null;
}

export type PendingVideoAdd = {
  youtube_id: string;
  title: string;
  video_type: VideoType;
  description: string | null;
  video_date: string | null;
  duration: string | null;
  display_order: number;
};

export type PendingPosterAdd = {
  image_url: string;
  title: string;
  description: string | null;
  poster_date: string | null;
  is_main: boolean;
  display_order: number;
};

export type PendingPlatformAdd = {
  platform_id: string;
  available_from: string | null;
  _platform?: OTTPlatform;
};

export type PendingPHAdd = { production_house_id: string; _ph?: ProductionHouse };

// ─── Mutation types (minimal shape needed) ───
interface MutateAsync<TArgs, TResult = unknown> {
  mutateAsync: (args: TArgs) => Promise<TResult>;
}

export interface MovieEditHandlerDeps {
  id: string;
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  router: AppRouterInstance;
  // Original movie data for preserving fields not in the form
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

  // Pending state values (needed for handleSubmit)
  localCastOrder: string[] | null;
  pendingCastAdds: PendingCastAdd[];
  pendingCastRemoveIds: Set<string>;
  pendingVideoAdds: PendingVideoAdd[];
  pendingVideoRemoveIds: Set<string>;
  pendingPosterAdds: PendingPosterAdd[];
  pendingPosterRemoveIds: Set<string>;
  pendingMainPosterId: string | null;
  pendingPlatformAdds: PendingPlatformAdd[];
  pendingPlatformRemoveIds: Set<string>;
  pendingPHAdds: PendingPHAdd[];
  pendingPHRemoveIds: Set<string>;
  pendingRunAdds: PendingRun[];
  pendingRunRemoveIds: Set<string>;

  // Mutation objects
  updateMovie: MutateAsync<{
    id: string;
    title: string;
    poster_url: string | null;
    backdrop_url: string | null;
    release_date: string;
    runtime: number | null;
    genres: string[];
    certification: 'U' | 'UA' | 'A' | null;
    synopsis: string | null;
    trailer_url: string | null;
    in_theaters: boolean;
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
  addVideo: MutateAsync<{ movie_id: string } & PendingVideoAdd>;
  removeVideo: MutateAsync<{ id: string; movieId: string }>;
  addPoster: MutateAsync<{ movie_id: string } & PendingPosterAdd>;
  removePoster: MutateAsync<{ id: string; movieId: string }>;
  setMainPoster: MutateAsync<{ id: string; movieId: string }>;
  addMoviePlatform: MutateAsync<{
    movie_id: string;
    platform_id: string;
    available_from: string | null;
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

  // Callbacks into main hook
  resetPendingState: () => void;
  setInitialForm: React.Dispatch<React.SetStateAction<MovieForm | null>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'success'>>;
  setUploadingPoster: (v: boolean) => void;
  setUploadingBackdrop: (v: boolean) => void;
}
