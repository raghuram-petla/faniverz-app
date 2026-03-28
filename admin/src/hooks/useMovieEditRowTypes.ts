import type { AvailabilityType } from '@shared/types';

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
export interface AvailabilityRow {
  id: string;
  platform_id: string;
  country_code: string;
  availability_type: AvailabilityType;
  platform?: { name: string } | null;
}
