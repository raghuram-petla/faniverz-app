import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const W = Dimensions.get('window').width;
const FILMOGRAPHY_ITEMS = [1, 2, 3];

export function ActorDetailSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      testID="actor-detail-skeleton"
    >
      {/* Back button */}
      <View style={styles.navRow}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
      </View>
      {/* Avatar + name */}
      <View style={styles.profileSection}>
        <SkeletonBox width={100} height={100} borderRadius={50} />
        <SkeletonBox width={160} height={20} borderRadius={4} />
        <View style={styles.badgeRow}>
          <SkeletonBox width={60} height={24} borderRadius={12} />
          <SkeletonBox width={50} height={24} borderRadius={12} />
        </View>
      </View>
      {/* Bio card */}
      <View style={styles.bioCard}>
        <SkeletonBox width={W - 64} height={14} borderRadius={4} />
        <SkeletonBox width={W - 100} height={14} borderRadius={4} />
        <SkeletonBox width={W - 80} height={14} borderRadius={4} />
      </View>
      {/* Filmography */}
      <View style={styles.filmographySection}>
        <SkeletonBox width={140} height={18} borderRadius={4} />
        {FILMOGRAPHY_ITEMS.map((i) => (
          <View key={i} style={styles.filmRow}>
            <SkeletonBox width={48} height={72} borderRadius={6} />
            <View style={styles.filmInfo}>
              <SkeletonBox width={W - 120} height={16} borderRadius={4} />
              <SkeletonBox width={80} height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  navRow: { marginBottom: 16 },
  profileSection: { alignItems: 'center', gap: 10, marginBottom: 20 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  bioCard: { gap: 8, marginBottom: 20 },
  filmographySection: { gap: 12 },
  filmRow: { flexDirection: 'row', gap: 12 },
  filmInfo: { flex: 1, gap: 6, justifyContent: 'center' },
});
