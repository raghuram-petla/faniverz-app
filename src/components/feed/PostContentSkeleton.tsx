import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

/** @assumes window width is stable for the skeleton lifetime */
const W = Dimensions.get('window').width;
/** @invariant 3 comment skeletons match the expected comments-per-page initial load */
const COMMENTS = [1, 2, 3];

export function PostContentSkeleton() {
  return (
    <View style={styles.container} testID="post-content-skeleton">
      {/* Feed card skeleton */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <SkeletonBox width={48} height={48} borderRadius={24} />
          <View style={styles.headerText}>
            <SkeletonBox width={120} height={14} borderRadius={4} />
            <SkeletonBox width={80} height={12} borderRadius={4} />
          </View>
        </View>
        <View style={styles.titleRow}>
          <SkeletonBox width={W - 24} height={16} borderRadius={4} />
        </View>
        <SkeletonBox width={W} height={Math.round(W * (9 / 16))} borderRadius={0} />
        <View style={styles.actions}>
          <SkeletonBox width={60} height={28} borderRadius={14} />
          <SkeletonBox width={60} height={28} borderRadius={14} />
        </View>
      </View>
      {/* Comments section */}
      <View style={styles.commentsSection}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingTop: 8 },
  card: { gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  headerText: { gap: 4 },
  titleRow: { paddingHorizontal: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 12 },
  commentsSection: { paddingHorizontal: 16, gap: 16 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentText: { flex: 1, gap: 4 },
});
