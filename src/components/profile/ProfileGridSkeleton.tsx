import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
const CARD_W = (W - 48) / 2;
const ITEMS = [1, 2, 3, 4];

export interface ProfileGridSkeletonProps {
  cardHeight?: number;
  testID?: string;
}

export function ProfileGridSkeleton({
  cardHeight = CARD_W * 1.5,
  testID = 'profile-grid-skeleton',
}: ProfileGridSkeletonProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.grid}>
        {ITEMS.map((i) => (
          <View key={i} style={styles.item}>
            <SkeletonBox width={CARD_W} height={cardHeight} borderRadius={12} />
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
