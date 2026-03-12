import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
const GRID_ITEM_W = (W - 48) / 2;
const GRID_ITEMS = [1, 2, 3, 4];

export function SurpriseContentSkeleton() {
  return (
    <View style={styles.container} testID="surprise-content-skeleton">
      {/* Featured video */}
      <SkeletonBox width={W - 32} height={200} borderRadius={16} />
      {/* Grid */}
      <View style={styles.grid}>
        {GRID_ITEMS.map((i) => (
          <View key={i} style={styles.gridItem}>
            <SkeletonBox width={GRID_ITEM_W} height={120} borderRadius={12} />
            <SkeletonBox width={GRID_ITEM_W - 20} height={14} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 20, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { gap: 8 },
});
