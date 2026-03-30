import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useSurpriseContent } from '@/features/surprise/hooks';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SurpriseCategory, SurpriseContent } from '@/types';
import {
  PILLS,
  CARD_GRADIENTS,
  getCategoryColor,
  getCategoryIconName,
  formatViews,
} from '@/constants/surpriseHelpers';
import { FeaturedVideoCard } from '@/components/surprise/FeaturedVideoCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SurpriseContentSkeleton } from '@/components/surprise/SurpriseContentSkeleton';
import { FilterPillBar } from '@/components/common/FilterPillBar';
import { createStyles } from '@/styles/tabs/surprise.styles';

type FilterOption = 'all' | SurpriseCategory;

interface ContentCardProps {
  item: SurpriseContent;
  index: number;
}

// @coupling surpriseHelpers — getCategoryColor, getCategoryIconName, CARD_GRADIENTS for visual mapping
function ContentCard({ item, index }: ContentCardProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const catColor = getCategoryColor(item.category);
  const iconName = getCategoryIconName(item.category);
  // @invariant CARD_GRADIENTS cycles via modulo — ensures no index-out-of-bounds
  const bgColor = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  // @sideeffect Opens YouTube in external browser/app via Linking
  // @assumes item.youtube_id is always a valid YouTube video ID
  const handlePlay = useCallback(() => {
    Linking.openURL(`https://www.youtube.com/watch?v=${item.youtube_id}`);
  }, [item.youtube_id]);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={handlePlay}
      accessibilityRole="button"
      accessibilityLabel={t('common.playTitle', { title: item.title })}
    >
      {/* Thumbnail placeholder */}
      <View style={[styles.cardThumb, { backgroundColor: bgColor }]}>
        {/* Play button overlay */}
        <View style={styles.cardPlayBtn}>
          <Ionicons name="play" size={20} color={colors.white} style={styles.playIcon} />
        </View>

        {/* Category badge — top left */}
        <View style={[styles.cardCategoryBadge, { backgroundColor: catColor }]}>
          <Ionicons name={iconName} size={10} color={colors.white} />
        </View>
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardViews}>
          {formatViews(item.views)} {t('common.views')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

interface FunFactBoxProps {
  fact: string;
}

function FunFactBox({ fact }: FunFactBoxProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.funFact}>
      <Ionicons name="sparkles" size={20} color={colors.white} style={styles.funFactIcon} />
      <View style={styles.funFactTextBlock}>
        <Text style={styles.funFactHeading}>{t('surprise.didYouKnow')}</Text>
        <Text style={styles.funFactBody}>{fact}</Text>
      </View>
    </View>
  );
}

// @boundary Surprise tab — curated video content (trailers, interviews, etc.) with category filter
export default function SurpriseScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterOption>('all');

  // @contract When filter is 'all', category is undefined which tells the hook to fetch all categories
  const category = filter === 'all' ? undefined : filter;
  // @coupling: useSurpriseContent queries Supabase surprise_content table — filtered by category column
  const { data: items = [], isLoading, refetch } = useSurpriseContent(category);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
    refreshControl,
  } = usePullToRefresh(onRefresh, refreshing);

  // @nullable featured is null when items array is empty
  // @contract First item gets hero treatment; remaining items go to the grid
  const featured = items[0] ?? null;
  const gridItems = items.slice(1);

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerIconBadge}>
          <Ionicons name="sparkles" size={20} color={colors.white} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{t('surprise.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('surprise.subtitle')}</Text>
        </View>
      </View>

      {/* ── Category pills ── */}
      <FilterPillBar
        pills={PILLS}
        activeValue={filter}
        onSelect={(v) => setFilter(v as FilterOption)}
      />

      {/* ── Main scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handlePullScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
      >
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          refreshing={refreshing}
        />
        {isLoading ? (
          <SurpriseContentSkeleton />
        ) : !isLoading && items.length === 0 ? (
          <EmptyState icon="sparkles-outline" title={t('surprise.noContent')} />
        ) : (
          <>
            {/* Featured video */}
            {featured ? (
              <FeaturedVideoCard item={featured} styles={styles} />
            ) : /* istanbul ignore next */ null}

            {/* Content grid */}
            {gridItems.length > 0 ? (
              <View style={styles.grid}>
                {gridItems.map((item, idx) => (
                  <ContentCard key={item.id} item={item} index={idx} />
                ))}
              </View>
            ) : null}

            {/* Fun Fact */}
            <FunFactBox fact={t('surprise.funFact')} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
