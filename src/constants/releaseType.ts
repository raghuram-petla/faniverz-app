import { RELEASE_TYPE_CONFIG } from '@shared/constants';
import { colors } from '@shared/colors';
import type { ReleaseType } from '@shared/types';

// Re-export the shared config
export { RELEASE_TYPE_CONFIG };

export function getReleaseTypeLabel(type: ReleaseType): string {
  return RELEASE_TYPE_CONFIG[type]?.label ?? type;
}

export function getReleaseTypeColor(type: ReleaseType): string {
  return RELEASE_TYPE_CONFIG[type]?.color ?? colors.white40;
}
