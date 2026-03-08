// Shared constants — single source of truth for mobile + admin
// Layout dimensions, movie status config, device configs for previews.

import type { MovieStatus, VideoType } from './types';

// Layout dimensions (used by both mobile components and admin preview replicas)
export const HERO_HEIGHT = 600;
export const ACTOR_AVATAR_SIZE = 120;
// Movie status configuration (derived, not stored)
export const MOVIE_STATUS_CONFIG: Record<MovieStatus, { label: string; color: string }> = {
  announced: { label: 'Announced', color: '#F59E0B' },
  upcoming: { label: 'Coming Soon', color: '#2563EB' },
  in_theaters: { label: 'In Theaters', color: '#DC2626' },
  streaming: { label: 'Streaming', color: '#9333EA' },
  released: { label: 'Released', color: '#6B7280' },
};

// Video type labels
export const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: 'teaser', label: 'Teaser' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'glimpse', label: 'Glimpse' },
  { value: 'song', label: 'Song' },
  { value: 'interview', label: 'Interview' },
  { value: 'bts', label: 'Behind the Scenes' },
  { value: 'event', label: 'Event' },
  { value: 'promo', label: 'Promo' },
  { value: 'making', label: 'Making' },
  { value: 'other', label: 'Other' },
];

// Gender labels (TMDB encoding)
export const GENDER_LABELS: Record<number, string> = {
  1: 'Female',
  2: 'Male',
  3: 'Non-binary',
};

// Preview device configurations
export interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  platform: 'ios' | 'android';
  safeAreaTop: number;
  safeAreaBottom: number;
}

export const DEVICES: readonly DeviceConfig[] = [
  {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    platform: 'ios',
    safeAreaTop: 20,
    safeAreaBottom: 0,
  },
  {
    name: 'iPhone 15',
    width: 393,
    height: 852,
    platform: 'ios',
    safeAreaTop: 59,
    safeAreaBottom: 34,
  },
  {
    name: 'iPhone 15 Pro Max',
    width: 430,
    height: 932,
    platform: 'ios',
    safeAreaTop: 59,
    safeAreaBottom: 34,
  },
  {
    name: 'Pixel 8',
    width: 411,
    height: 915,
    platform: 'android',
    safeAreaTop: 24,
    safeAreaBottom: 0,
  },
] as const;

// Gradient stops used in mobile screens (shared so admin preview can replicate exactly)
export const SPOTLIGHT_GRADIENT = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,1)'];
export const DETAIL_GRADIENT = {
  colors: ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)'],
  locations: [0, 0.2, 0.6, 1],
};
