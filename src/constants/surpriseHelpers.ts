import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import type { SurpriseCategory } from '@/types';

type FilterOption = 'all' | SurpriseCategory;

interface PillConfig {
  label: string;
  value: FilterOption;
  activeColor: string;
}

// @sync pill order and categories must match SurpriseCategory type and backend surprise_videos categories
export const PILLS: PillConfig[] = [
  { label: 'All', value: 'all', activeColor: colors.red600 },
  { label: 'Songs', value: 'song', activeColor: colors.purple600 },
  { label: 'Short Films', value: 'short-film', activeColor: colors.blue600 },
  { label: 'BTS', value: 'bts', activeColor: colors.green500 },
  { label: 'Interviews', value: 'interview', activeColor: colors.orange500 },
];

export const CARD_GRADIENTS: readonly string[] = colors.cardGradients;

// @coupling colors must stay in sync with PILLS activeColor values above
// @edge default case returns red600 for 'trailer' and any future categories
export function getCategoryColor(category: SurpriseCategory): string {
  switch (category) {
    case 'song':
      return colors.purple600;
    case 'short-film':
      return colors.blue600;
    case 'bts':
      return colors.green500;
    case 'interview':
      return colors.orange500;
    default:
      return colors.red600;
  }
}

// @edge default returns raw category string — safe fallback for new categories
export function getCategoryLabel(category: SurpriseCategory): string {
  switch (category) {
    case 'song':
      return 'Song';
    case 'short-film':
      return 'Short Film';
    case 'bts':
      return 'BTS';
    case 'interview':
      return 'Interview';
    case 'trailer':
      return 'Trailer';
    default:
      return category;
  }
}

export function getCategoryIconName(
  category: SurpriseCategory,
): React.ComponentProps<typeof Ionicons>['name'] {
  switch (category) {
    case 'song':
      return 'musical-notes';
    case 'short-film':
      return 'film';
    case 'bts':
      return 'videocam';
    case 'interview':
      return 'mic';
    case 'trailer':
      return 'play-circle';
    default:
      return 'play';
  }
}

// @coupling re-exports formatCompactNumber as formatViews for backward compatibility
export { formatCompactNumber as formatViews } from '@/utils/formatNumber';
