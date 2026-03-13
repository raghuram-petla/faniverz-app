import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBox } from '@/components/ui/SkeletonBox';

const W = Dimensions.get('window').width;
/** @invariant 4 standard fields + 1 bio field matches the actual edit profile form layout */
const FIELDS = [1, 2, 3, 4];

export function EditProfileSkeleton() {
  return (
    <View style={styles.container} testID="edit-profile-skeleton">
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <SkeletonBox width={80} height={80} borderRadius={40} />
        <SkeletonBox width={100} height={14} borderRadius={4} />
      </View>
      {/* Form fields */}
      {FIELDS.map((i) => (
        <View key={i} style={styles.fieldGroup}>
          <SkeletonBox width={80} height={14} borderRadius={4} />
          <SkeletonBox width={W - 32} height={44} borderRadius={10} />
        </View>
      ))}
      {/* Bio field (taller) */}
      <View style={styles.fieldGroup}>
        <SkeletonBox width={40} height={14} borderRadius={4} />
        <SkeletonBox width={W - 32} height={100} borderRadius={10} />
      </View>
      {/* Save button */}
      <SkeletonBox width={W - 32} height={48} borderRadius={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 16, paddingTop: 24 },
  avatarSection: { alignItems: 'center', gap: 8 },
  fieldGroup: { gap: 6 },
});
