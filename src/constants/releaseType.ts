import { colors } from '@/theme/colors';
import { ReleaseType } from '@/types';

export const RELEASE_TYPE_CONFIG: Record<ReleaseType, { label: string; color: string }> = {
  theatrical: { label: 'In Theaters', color: colors.red600 },
  ott: { label: 'Streaming', color: colors.purple600 },
  upcoming: { label: 'Coming Soon', color: colors.blue600 },
  ended: { label: 'No Longer in Theaters', color: colors.gray500 },
};

export function getReleaseTypeLabel(type: ReleaseType): string {
  return RELEASE_TYPE_CONFIG[type]?.label ?? type;
}

export function getReleaseTypeColor(type: ReleaseType): string {
  return RELEASE_TYPE_CONFIG[type]?.color ?? colors.white40;
}
