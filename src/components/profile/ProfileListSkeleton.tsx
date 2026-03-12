import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
const ITEMS = [1, 2, 3, 4, 5];

export interface ProfileListSkeletonProps {
  testID?: string;
}

export function ProfileListSkeleton({
  testID = 'profile-list-skeleton',
}: ProfileListSkeletonProps) {
  return (
    <View style={styles.container} testID={testID}>
      {ITEMS.map((i) => (
        <View key={i} style={styles.row}>
          <SkeletonBox width={44} height={44} borderRadius={22} />
          <View style={styles.text}>
            <SkeletonBox width={160} height={16} borderRadius={4} />
            <SkeletonBox width={100} height={12} borderRadius={4} />
          </View>
          <SkeletonBox width={70} height={32} borderRadius={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 16, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 4 },
});
