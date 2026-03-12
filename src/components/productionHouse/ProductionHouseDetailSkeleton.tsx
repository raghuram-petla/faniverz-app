import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const W = Dimensions.get('window').width;
const MOVIES = [1, 2, 3];

export function ProductionHouseDetailSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      testID="production-house-detail-skeleton"
    >
      {/* Back button */}
      <View style={styles.navRow}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
      </View>
      {/* Logo + name */}
      <View style={styles.profileSection}>
        <SkeletonBox width={100} height={100} borderRadius={50} />
        <SkeletonBox width={180} height={20} borderRadius={4} />
      </View>
      {/* Description */}
      <View style={styles.descriptionSection}>
        <SkeletonBox width={W - 64} height={14} borderRadius={4} />
        <SkeletonBox width={W - 100} height={14} borderRadius={4} />
      </View>
      {/* Movies section */}
      <View style={styles.moviesSection}>
        <SkeletonBox width={120} height={18} borderRadius={4} />
        {MOVIES.map((i) => (
          <View key={i} style={styles.movieRow}>
            <SkeletonBox width={56} height={84} borderRadius={8} />
            <View style={styles.movieInfo}>
              <SkeletonBox width={W - 130} height={16} borderRadius={4} />
              <SkeletonBox width={60} height={12} borderRadius={4} />
              <SkeletonBox width={80} height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  navRow: { marginBottom: 16 },
  profileSection: { alignItems: 'center', gap: 10, marginBottom: 20 },
  descriptionSection: { gap: 8, marginBottom: 20 },
  moviesSection: { gap: 12 },
  movieRow: { flexDirection: 'row', gap: 12 },
  movieInfo: { flex: 1, gap: 6, justifyContent: 'center' },
});
