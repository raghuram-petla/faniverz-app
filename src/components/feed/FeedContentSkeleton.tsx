import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { FilmStripFrame } from './FilmStripFrame';
import { FilmStripFrameDivider } from './FilmStripFrameDivider';
import { RAIL_WIDTH } from '@/constants/filmStrip';

/** @assumes window width is stable for the skeleton lifetime (no orientation change handling) */
const W = Dimensions.get('window').width;
/** @contract content width accounts for left/right film strip rails */
const CW = W - 2 * RAIL_WIDTH;
/** @invariant 3 cards gives a full-screen illusion on most device sizes */
const CARDS = [1, 2, 3];

/** @coupling Skeleton dimensions mirror the actual FeedCard layout — changes to FeedCard sizing should update this */
function CardSkeleton({ isFirst }: { isFirst?: boolean }) {
  return (
    <View>
      {isFirst ? <FilmStripFrameDivider isEdge /> : null}
      <FilmStripFrame>
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
            <SkeletonBox width={CW - 24} height={16} borderRadius={4} />
          </View>
          <SkeletonBox width={CW} height={Math.round(CW * (9 / 16))} borderRadius={0} />
          <View style={styles.actions}>
            <SkeletonBox width={60} height={28} borderRadius={14} />
            <SkeletonBox width={60} height={28} borderRadius={14} />
            <SkeletonBox width={60} height={28} borderRadius={14} />
          </View>
        </View>
      </FilmStripFrame>
      <FilmStripFrameDivider />
    </View>
  );
}

export function FeedContentSkeleton() {
  return (
    <View style={styles.container} testID="feed-content-skeleton">
      {CARDS.map((i, idx) => (
        <CardSkeleton key={i} isFirst={idx === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  card: { gap: 8, paddingVertical: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  headerText: { gap: 4 },
  badgeRow: { paddingHorizontal: 12 },
  titleRow: { paddingHorizontal: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 12 },
});
