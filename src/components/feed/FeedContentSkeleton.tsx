import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

/** @assumes window width is stable for the skeleton lifetime (no orientation change handling) */
const W = Dimensions.get('window').width;
/** @invariant 3 cards gives a full-screen illusion on most device sizes */
const CARDS = [1, 2, 3];

/** @coupling Skeleton dimensions mirror the actual FeedCard layout — changes to FeedCard sizing should update this */
function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonBox width={48} height={48} borderRadius={24} />
        <View style={styles.headerText}>
          <SkeletonBox width={120} height={14} borderRadius={4} />
          <SkeletonBox width={80} height={12} borderRadius={4} />
        </View>
      </View>
      <View style={styles.badgeRow}>
        <SkeletonBox width={60} height={18} borderRadius={4} />
      </View>
      <View style={styles.titleRow}>
        <SkeletonBox width={W - 24} height={16} borderRadius={4} />
      </View>
      <SkeletonBox width={W} height={Math.round(W * (9 / 16))} borderRadius={0} />
      <View style={styles.actions}>
        <SkeletonBox width={60} height={28} borderRadius={14} />
        <SkeletonBox width={60} height={28} borderRadius={14} />
        <SkeletonBox width={60} height={28} borderRadius={14} />
      </View>
    </View>
  );
}

export function FeedContentSkeleton() {
  return (
    <View style={styles.container} testID="feed-content-skeleton">
      {CARDS.map((i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20, paddingTop: 8 },
  card: { gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  headerText: { gap: 4 },
  badgeRow: { paddingHorizontal: 12 },
  titleRow: { paddingHorizontal: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 12 },
});
