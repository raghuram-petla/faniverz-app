import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
const COMMENTS = [1, 2, 3];

export function PostContentSkeleton() {
  return (
    <View style={styles.container} testID="post-content-skeleton">
      {/* Feed card skeleton */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <View style={styles.headerText}>
            <SkeletonBox width={120} height={14} borderRadius={4} />
            <SkeletonBox width={80} height={12} borderRadius={4} />
          </View>
        </View>
        <SkeletonBox width={W - 32} height={200} borderRadius={12} />
        <View style={styles.actions}>
          <SkeletonBox width={60} height={28} borderRadius={14} />
          <SkeletonBox width={60} height={28} borderRadius={14} />
        </View>
      </View>
      {/* Comments section */}
      <SkeletonBox width={100} height={18} borderRadius={4} />
      {COMMENTS.map((i) => (
        <View key={i} style={styles.comment}>
          <SkeletonBox width={32} height={32} borderRadius={16} />
          <View style={styles.commentText}>
            <SkeletonBox width={100} height={14} borderRadius={4} />
            <SkeletonBox width={W - 96} height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 16, paddingTop: 8 },
  card: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { gap: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentText: { flex: 1, gap: 4 },
});
