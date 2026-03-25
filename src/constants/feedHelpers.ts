import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import type { FeedPillConfig } from '@/types';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

// @sync pill values must match FeedFilterOption type and backend content_type groupings
// @coupling activeColor values should stay consistent with getFeedTypeColor mappings below
export const FEED_PILLS: FeedPillConfig[] = [
  { label: 'All', value: 'all', activeColor: colors.red600 },
  { label: 'Trailers', value: 'trailers', activeColor: colors.blue600 },
  { label: 'Songs', value: 'songs', activeColor: colors.purple600 },
  { label: 'Posters', value: 'posters', activeColor: colors.green500 },
  { label: 'BTS', value: 'bts', activeColor: colors.orange500 },
  { label: 'Surprise', value: 'surprise', activeColor: colors.pink600 },
  { label: 'Updates', value: 'updates', activeColor: colors.yellow400 },
];

// @sync must cover all content_type values from news_feed_items table
// @edge default returns red600 — safe for any new content types added to the backend
export function getFeedTypeColor(contentType: string): string {
  switch (contentType) {
    case 'trailer':
    case 'teaser':
    case 'glimpse':
    case 'promo':
      return colors.blue600;
    case 'song':
      return colors.purple600;
    case 'poster':
      return colors.green500;
    case 'bts':
    case 'interview':
    case 'event':
    case 'making':
      return colors.orange500;
    case 'short-film':
      return colors.pink600;
    case 'update':
      return colors.gray500;
    case 'new_movie':
      return colors.red600;
    case 'theatrical_release':
      return colors.red600;
    case 'ott_release':
      return colors.purple600;
    case 'rating_milestone':
      return colors.yellow400;
    default:
      return colors.red600;
  }
}

// @contract maps backend content_type to human-readable label for UI display
// @edge default case returns raw contentType string — new backend types render as-is until code is updated
export function getFeedTypeLabel(contentType: string): string {
  switch (contentType) {
    case 'trailer':
      return 'Trailer';
    case 'teaser':
      return 'Teaser';
    case 'glimpse':
      return 'Glimpse';
    case 'promo':
      return 'Promo';
    case 'song':
      return 'Song';
    case 'poster':
      return 'Poster';
    case 'bts':
      return 'BTS';
    case 'interview':
      return 'Interview';
    case 'event':
      return 'Event';
    case 'making':
      return 'Making';
    case 'short-film':
      return 'Short Film';
    case 'update':
      return 'Update';
    case 'new_movie':
      return 'New Movie';
    case 'theatrical_release':
      return 'In Theaters';
    case 'ott_release':
      return 'Now Streaming';
    case 'rating_milestone':
      return 'Milestone';
    default:
      return contentType;
  }
}

export function getFeedTypeIconName(
  contentType: string,
): React.ComponentProps<typeof Ionicons>['name'] {
  switch (contentType) {
    case 'trailer':
    case 'teaser':
    case 'glimpse':
    case 'promo':
      return 'play-circle';
    case 'song':
      return 'musical-notes';
    case 'poster':
      return 'image';
    case 'bts':
    case 'making':
      return 'videocam';
    case 'interview':
    case 'event':
      return 'mic';
    case 'short-film':
      return 'film';
    case 'update':
      return 'megaphone';
    case 'new_movie':
      return 'star';
    case 'theatrical_release':
      return 'ticket';
    case 'ott_release':
      return 'tv';
    case 'rating_milestone':
      return 'trophy';
    default:
      return 'newspaper';
  }
}

// @boundary external dependency on YouTube's thumbnail CDN — no auth required
export function getYouTubeThumbnail(
  youtubeId: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'maxresdefault' = 'hqdefault',
): string {
  // @contract: strip non-alphanumeric/dash/underscore to prevent URL traversal
  const safeId = youtubeId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://img.youtube.com/vi/${safeId}/${quality}.jpg`;
}

// ── Entity helpers (for X-style feed layout) ────────────────────────────────────

// @contract derives entity type from NewsFeedItem fields using priority: movie_id > source_table > default
// @invariant always returns a valid FeedEntityType — defaults to 'movie' when ambiguous
export function deriveEntityType(item: NewsFeedItem): FeedEntityType {
  if (item.movie_id) return 'movie';
  if (item.source_table === 'actors') return 'actor';
  if (item.source_table === 'production_houses') return 'production_house';
  return 'movie';
}

// @nullable returns null when no avatar available — callers should use PLACEHOLDER_AVATAR
// @coupling accesses item.movie?.poster_url which relies on joined movie data being present
export function getEntityAvatarUrl(item: NewsFeedItem): string | null {
  if (item.movie_id) return item.movie?.poster_url ?? null;
  return item.thumbnail_url ?? null;
}

// @edge returns 'Unknown' when movie join or title is missing — prevents blank names in UI
export function getEntityName(item: NewsFeedItem): string {
  if (item.movie_id) return item.movie?.title ?? 'Unknown';
  return item.title ?? 'Unknown';
}

export function getEntityId(item: NewsFeedItem): string | null {
  if (item.movie_id) return item.movie_id;
  if (item.source_id && item.source_table) return item.source_id;
  return null;
}

// @nullable returns null when entity ID cannot be determined — prevents broken navigation
// @coupling route patterns must match Expo Router file-based routes in app/ directory
export function getEntityRoute(item: NewsFeedItem): string | null {
  const entityType = deriveEntityType(item);
  const entityId = getEntityId(item);
  if (!entityId) return null;
  switch (entityType) {
    case 'movie':
      return `/movie/${entityId}`;
    case 'actor':
      return `/actor/${entityId}`;
    case 'production_house':
      return `/production-house/${entityId}`;
    /* istanbul ignore next -- default unreachable; deriveEntityType only returns movie|actor|production_house */
    default:
      return null;
  }
}
