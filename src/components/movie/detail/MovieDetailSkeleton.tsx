import { View } from 'react-native';
import { useTheme } from '@/theme';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import {
  createStyles,
  SCREEN_WIDTH,
  HERO_HEIGHT,
  POSTER_WIDTH,
  POSTER_HEIGHT,
} from './MovieDetailSkeleton.styles';

/** @contract Placeholder skeleton matching MovieDetail layout — shown while data fetches */
export function MovieDetailSkeleton() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container} testID="movie-detail-skeleton">
      {/* Hero backdrop skeleton */}
      <View style={styles.hero}>
        <SkeletonBox width={SCREEN_WIDTH} height={HERO_HEIGHT} borderRadius={0} />
        {/* Poster + title overlay at bottom */}
        <View style={styles.heroInfo}>
          <SkeletonBox width={POSTER_WIDTH} height={POSTER_HEIGHT} borderRadius={12} />
          <View style={styles.heroTextArea}>
            <SkeletonBox width={80} height={16} borderRadius={4} />
            <SkeletonBox width={200} height={28} borderRadius={4} />
            <SkeletonBox width={120} height={16} borderRadius={4} />
            <SkeletonBox width={160} height={14} borderRadius={4} />
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Tab bar skeleton */}
        <View style={styles.tabBar}>
          <SkeletonBox width={80} height={36} borderRadius={8} />
          <SkeletonBox width={60} height={36} borderRadius={8} />
          <SkeletonBox width={50} height={36} borderRadius={8} />
          <SkeletonBox width={70} height={36} borderRadius={8} />
        </View>

        {/** @coupling Skeleton widths use SCREEN_WIDTH from styles — must stay in sync with actual detail layout */}
        <View style={styles.contentLines}>
          <SkeletonBox width={SCREEN_WIDTH - 32} height={16} borderRadius={4} />
          <SkeletonBox width={SCREEN_WIDTH - 80} height={16} borderRadius={4} />
          <SkeletonBox width={SCREEN_WIDTH - 48} height={16} borderRadius={4} />
          <SkeletonBox width={SCREEN_WIDTH - 100} height={16} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}
