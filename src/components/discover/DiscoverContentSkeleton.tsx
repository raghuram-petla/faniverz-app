import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
const CARD_W = (W - 48) / 2;
/** @invariant 1.5:1 aspect ratio matches actual movie poster cards */
const CARD_H = CARD_W * 1.5;
const ITEMS = [1, 2, 3, 4, 5, 6];

export function DiscoverContentSkeleton() {
  return (
    <View style={styles.container} testID="discover-content-skeleton">
      <View style={styles.grid}>
        {ITEMS.map((i) => (
          <View key={i} style={styles.item}>
            <SkeletonBox width={CARD_W} height={CARD_H} borderRadius={12} />
            <SkeletonBox width={CARD_W - 20} height={14} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  item: { gap: 6 },
});
