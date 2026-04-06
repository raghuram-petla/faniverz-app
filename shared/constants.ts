// Shared constants — single source of truth for mobile + admin
// Layout dimensions, movie status config, device configs for previews.

import type { MovieStatus, VideoType, CraftName } from './types';

// ── Editorial craft constants ─────────────────────────────────────────────────
export const CRAFT_NAMES: CraftName[] = [
  'story',
  'direction',
  'performances',
  'technical',
  'music',
];

export const CRAFT_LABELS: Record<CraftName, string> = {
  story: 'Story & Screenplay',
  direction: 'Direction',
  technical: 'Technical',
  music: 'Music',
  performances: 'Performances',
};

// Broadcast notification sentinel — used when a notification targets all users
export const BROADCAST_USER_ID = '00000000-0000-0000-0000-000000000000';

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

// Feed content type colors — hex values used in admin preview and can derive Tailwind classes
// @contract single source of truth for content-type badge colors shared across mobile + admin
// @sync must stay aligned with getFeedTypeColor in src/constants/feedHelpers.ts (which uses this map)
export const FEED_CONTENT_TYPE_COLORS: Record<string, string> = {
  trailer: '#2563EB',
  teaser: '#3B82F6',
  glimpse: '#60A5FA',
  promo: '#60A5FA',
  song: '#9333EA',
  poster: '#22C55E',
  backdrop: '#22C55E',
  bts: '#F97316',
  interview: '#F97316',
  event: '#EA580C',
  making: '#EA580C',
  'short-film': '#DB2777',
  update: '#6B7280',
  new_movie: '#DC2626',
  theatrical_release: '#DC2626',
  ott_release: '#9333EA',
  rating_milestone: '#FACC15',
  editorial_review: '#DC2626',
};

// Feed content type labels
// @contract single source of truth for content-type display labels shared across mobile + admin
// @sync must stay aligned with getFeedTypeLabel in src/constants/feedHelpers.ts (which uses this map)
export const FEED_CONTENT_TYPE_LABELS: Record<string, string> = {
  trailer: 'Trailer',
  teaser: 'Teaser',
  glimpse: 'Glimpse',
  promo: 'Promo',
  song: 'Song',
  poster: 'Poster',
  backdrop: 'Backdrop',
  bts: 'BTS',
  interview: 'Interview',
  event: 'Event',
  making: 'Making',
  'short-film': 'Short Film',
  update: 'Update',
  new_movie: 'New Movie',
  theatrical_release: 'In Theaters',
  ott_release: 'Now Streaming',
  rating_milestone: 'Milestone',
  editorial_review: 'Editorial Review',
};

// @contract Feed tab labels for the mobile preview pill row — 'All' is a sentinel for no filter
// @assumes tab order matches the mobile app HomeFeed filter pill order
export const FEED_TAB_LABELS: string[] = [
  'All',
  'Trailers',
  'Songs',
  'Posters',
  'BTS',
  'Updates',
  'Editorial',
];

// Gradient stops used in mobile screens (shared so admin preview can replicate exactly)
export const SPOTLIGHT_GRADIENT = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,1)'];
export const DETAIL_GRADIENT = {
  colors: ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)'],
  locations: [0, 0.2, 0.6, 1],
};
