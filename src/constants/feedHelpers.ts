import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import type { FeedPillConfig } from '@/types';

export const FEED_PILLS: FeedPillConfig[] = [
  { label: 'All', value: 'all', activeColor: colors.red600 },
  { label: 'Trailers', value: 'trailers', activeColor: colors.blue600 },
  { label: 'Songs', value: 'songs', activeColor: colors.purple600 },
  { label: 'Posters', value: 'posters', activeColor: colors.green500 },
  { label: 'BTS', value: 'bts', activeColor: colors.orange500 },
  { label: 'Surprise', value: 'surprise', activeColor: colors.pink600 },
  { label: 'Updates', value: 'updates', activeColor: colors.yellow400 },
];

export const CARD_GRADIENTS: string[] = [
  '#1e1b4b',
  '#1a0533',
  '#0a1628',
  '#0f2a0f',
  '#2a0a0a',
  '#1a1a0a',
  '#0a1a2a',
  '#1a0a1a',
];

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

export function getYouTubeThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
