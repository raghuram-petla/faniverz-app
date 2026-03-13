import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
/** @assumes 16px horizontal padding on each side + 8px gaps between 3 stat cards */
const STAT_W = (W - 48) / 3;
const REVIEWS = [1, 2, 3];

export function ReviewsContentSkeleton() {
  return (
    <View style={styles.container} testID="reviews-content-skeleton">
      {/* Stats row */}
      <View style={styles.statsRow}>
        <SkeletonBox width={STAT_W} height={72} borderRadius={12} />
        <SkeletonBox width={STAT_W} height={72} borderRadius={12} />
        <SkeletonBox width={STAT_W} height={72} borderRadius={12} />
      </View>
      {/* Review cards */}
      {REVIEWS.map((i) => (
        <View key={i} style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <SkeletonBox width={56} height={84} borderRadius={8} />
            <View style={styles.reviewText}>
              <SkeletonBox width={140} height={16} borderRadius={4} />
              <SkeletonBox width={80} height={14} borderRadius={4} />
              <SkeletonBox width={W - 136} height={12} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 16, paddingTop: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  reviewCard: { gap: 8 },
  reviewTop: { flexDirection: 'row', gap: 12 },
  reviewText: { flex: 1, gap: 6 },
});
