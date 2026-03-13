import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { createStyles, DATE_BOX_SIZE } from './CalendarSkeleton.styles';

/** @invariant 3 date groups with 2 movies each approximates a typical calendar view */
const DATE_GROUPS = [1, 2, 3];
const MOVIE_ITEMS = [1, 2];

function DateGroupSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <SkeletonBox width={DATE_BOX_SIZE} height={DATE_BOX_SIZE} borderRadius={12} />
        <View style={styles.dateInfo}>
          <SkeletonBox width={100} height={18} borderRadius={4} />
          <SkeletonBox width={160} height={14} borderRadius={4} />
        </View>
        <SkeletonBox width={60} height={14} borderRadius={4} />
      </View>
      {MOVIE_ITEMS.map((i) => (
        <View key={i} style={styles.movieItem}>
          <SkeletonBox width={70} height={105} borderRadius={8} />
          <View style={styles.movieInfo}>
            <SkeletonBox width={180} height={16} borderRadius={4} />
            <SkeletonBox width={120} height={14} borderRadius={4} />
            <SkeletonBox width={80} height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function CalendarSkeleton() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container} testID="calendar-skeleton">
      <SafeAreaCover />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <SkeletonBox width={180} height={24} borderRadius={4} />
        <SkeletonBox width={40} height={40} borderRadius={20} />
      </View>
      <View style={styles.list}>
        {DATE_GROUPS.map((i) => (
          <DateGroupSkeleton key={i} styles={styles} />
        ))}
      </View>
    </View>
  );
}
