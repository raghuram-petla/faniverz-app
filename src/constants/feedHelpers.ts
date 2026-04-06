import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { FEED_CONTENT_TYPE_COLORS, FEED_CONTENT_TYPE_LABELS } from '@shared/constants';
import type { FeedPillConfig } from '@/types';
import type { NewsFeedItem, FeedEntityType } from '@shared/types';

// @sync pill values must match FeedFilterOption type and backend content_type groupings
// @coupling all pills use red600 as unified active color; getFeedTypeColor below is for feed card badges only
export const FEED_PILLS: FeedPillConfig[] = [
  { label: 'All', value: 'all', activeColor: colors.red600 },
  { label: 'Trailers', value: 'trailers', activeColor: colors.red600 },
  { label: 'Songs', value: 'songs', activeColor: colors.red600 },
  { label: 'Posters', value: 'posters', activeColor: colors.red600 },
  { label: 'BTS', value: 'bts', activeColor: colors.red600 },
  { label: 'Surprise', value: 'surprise', activeColor: colors.red600 },
  { label: 'Updates', value: 'updates', activeColor: colors.red600 },
  { label: 'Editorial', value: 'editorial', activeColor: colors.red600 },
];

// @contract delegates to FEED_CONTENT_TYPE_COLORS in shared/constants — single source of truth
// @sync must cover all content_type values from news_feed_items table
// @edge default returns red600 — safe for any new content types added to the backend
export function getFeedTypeColor(contentType: string): string {
  return FEED_CONTENT_TYPE_COLORS[contentType] ?? colors.red600;
}

// @contract delegates to FEED_CONTENT_TYPE_LABELS in shared/constants — single source of truth
// @edge default returns raw contentType string — new backend types render as-is until labels map is updated
export function getFeedTypeLabel(contentType: string): string {
  return FEED_CONTENT_TYPE_LABELS[contentType] ?? contentType;
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
    case 'backdrop':
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
    case 'editorial_review':
      return 'newspaper';
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
