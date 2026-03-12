import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
const CARD_W = W - 32;
const CARDS = [1, 2, 3];

function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <View style={styles.headerText}>
          <SkeletonBox width={120} height={14} borderRadius={4} />
          <SkeletonBox width={80} height={12} borderRadius={4} />
        </View>
      </View>
      <SkeletonBox width={CARD_W} height={200} borderRadius={12} />
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
  container: { paddingHorizontal: 16, gap: 20, paddingTop: 8 },
  card: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { gap: 4 },
  actions: { flexDirection: 'row', gap: 12 },
});
