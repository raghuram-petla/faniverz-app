import { View } from 'react-native';
import { useTheme } from '@/theme';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import {
  createStyles,
  HERO_HEIGHT,
  SCREEN_WIDTH,
  CARD_WIDTH,
  CARD_POSTER_HEIGHT,
} from './SpotlightSkeleton.styles';

const SKELETON_CARDS = [1, 2, 3];

function SectionSkeleton({ testID }: { testID?: string }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.sectionHeader}>
        <SkeletonBox width={160} height={20} borderRadius={4} />
      </View>
      <View style={styles.cardRow}>
        {SKELETON_CARDS.map((i) => (
          <View key={i} style={styles.card}>
            <SkeletonBox width={CARD_WIDTH} height={CARD_POSTER_HEIGHT} borderRadius={12} />
            <SkeletonBox width={100} height={14} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function SpotlightSkeleton() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container} testID="spotlight-skeleton">
      {/* Hero carousel skeleton */}
      <SkeletonBox
        width={SCREEN_WIDTH}
        height={HERO_HEIGHT}
        borderRadius={0}
        testID="hero-skeleton"
      />

      <View style={styles.sections}>
        {/* In Theaters skeleton */}
        <SectionSkeleton testID="section-skeleton-theaters" />

        {/* Streaming Now skeleton */}
        <SectionSkeleton testID="section-skeleton-streaming" />

        {/* Coming Soon skeleton */}
        <View style={styles.section} testID="section-skeleton-coming-soon">
          <View style={styles.sectionHeader}>
            <SkeletonBox width={160} height={20} borderRadius={4} />
          </View>
          <View style={styles.subsectionTitle}>
            <SkeletonBox width={120} height={17} borderRadius={4} />
          </View>
          <View style={styles.cardRow}>
            {SKELETON_CARDS.map((i) => (
              <View key={i} style={styles.card}>
                <SkeletonBox width={CARD_WIDTH} height={CARD_POSTER_HEIGHT} borderRadius={12} />
                <SkeletonBox width={100} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
