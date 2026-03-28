import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SORT_OPTIONS } from '@/components/discover/DiscoverFilterModal';

// @contract: props interface for DiscoverFilterBar
export interface DiscoverFilterBarProps {
  /** Current theme object with textPrimary/textSecondary colors */
  theme: { textPrimary: string; textSecondary: string };
  /** Style objects from createStyles */
  styles: Record<string, any>;
  /** Number of active genre/platform/PH filters */
  activeFilterCount: number;
  /** Current sort value key */
  sortBy: string;
  /** Animated style for chevron rotation */
  chevronStyle: AnimatedStyle<ViewStyle> | Record<string, unknown>;
  /** Open the filter modal */
  onOpenFilterModal: () => void;
  /** Toggle the sort dropdown */
  onToggleSortDropdown: () => void;
}

// @boundary: filter bar with filter button (badge) + sort dropdown trigger
export function DiscoverFilterBar({
  theme,
  styles,
  activeFilterCount,
  sortBy,
  chevronStyle,
  onOpenFilterModal,
  onToggleSortDropdown,
}: DiscoverFilterBarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.filterBar}>
      <TouchableOpacity style={styles.filterButton} onPress={onOpenFilterModal}>
        <Ionicons name="options" size={16} color={theme.textPrimary} />
        <Text style={styles.filterBarText}>{t('discover.filters')}</Text>
        {activeFilterCount > 0 && (
          <View style={styles.filterCountBadge}>
            <Text style={styles.filterCountText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.sortButton} onPress={onToggleSortDropdown}>
        <Text style={styles.filterBarText}>
          {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
        </Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}
