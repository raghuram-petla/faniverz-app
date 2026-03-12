import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const W = Dimensions.get('window').width;
const SECTIONS = [1, 2, 3];
const ITEMS_PER_SECTION = [1, 2];

export function WatchlistSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container} testID="watchlist-skeleton">
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <SkeletonBox width={140} height={22} borderRadius={4} />
          <SkeletonBox width={100} height={14} borderRadius={4} />
        </View>
        <SkeletonBox width={40} height={40} borderRadius={20} />
      </View>
      {/* Sections */}
      {SECTIONS.map((s) => (
        <View key={s} style={styles.section}>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <SkeletonBox width={20} height={20} borderRadius={4} />
            <SkeletonBox width={160} height={16} borderRadius={4} />
          </View>
          {/* Movie rows */}
          {ITEMS_PER_SECTION.map((i) => (
            <View key={i} style={styles.movieRow}>
              <SkeletonBox width={56} height={84} borderRadius={8} />
              <View style={styles.movieInfo}>
                <SkeletonBox width={W - 140} height={16} borderRadius={4} />
                <SkeletonBox width={100} height={12} borderRadius={4} />
                <SkeletonBox width={80} height={12} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerLeft: { gap: 6 },
  section: { paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  movieRow: { flexDirection: 'row', gap: 12 },
  movieInfo: { flex: 1, gap: 6, justifyContent: 'center' },
});
