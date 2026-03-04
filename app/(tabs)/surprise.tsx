import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useSurpriseContent } from '@/features/surprise/hooks';
import { SurpriseCategory, SurpriseContent } from '@/types';
import {
  PILLS,
  CARD_GRADIENTS,
  getCategoryColor,
  getCategoryIconName,
  formatViews,
} from '@/constants/surpriseHelpers';
import { FeaturedVideoCard } from '@/components/surprise/FeaturedVideoCard';
import { createStyles } from './surprise.styles';

type FilterOption = 'all' | SurpriseCategory;

interface ContentCardProps {
  item: SurpriseContent;
  index: number;
}

function ContentCard({ item, index }: ContentCardProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const catColor = getCategoryColor(item.category);
  const iconName = getCategoryIconName(item.category);
  const bgColor = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.title}`}
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

        {/* Duration — bottom right */}
        {item.duration ? (
          <View style={styles.cardDurationBadge}>
            <Text style={styles.cardDurationText}>{item.duration}</Text>
          </View>
        ) : null}
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardViews}>{formatViews(item.views)} views</Text>
      </View>
    </TouchableOpacity>
  );
}

interface FunFactBoxProps {
  fact: string;
}

function FunFactBox({ fact }: FunFactBoxProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.funFact}>
      <Ionicons name="sparkles" size={20} color={colors.white} style={styles.funFactIcon} />
      <View style={styles.funFactTextBlock}>
        <Text style={styles.funFactHeading}>Did you know?</Text>
        <Text style={styles.funFactBody}>{fact}</Text>
      </View>
    </View>
  );
}

const FUN_FACT =
  "This section features rare content you won't find on regular streaming platforms — from unreleased songs to exclusive behind-the-scenes footage!";

export default function SurpriseScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterOption>('all');

  const category = filter === 'all' ? undefined : filter;
  const { data: items = [], isLoading } = useSurpriseContent(category);

  const featured = items[0] ?? null;
  const gridItems = items.slice(1);

  return (
    <View style={styles.screen}>
      <View style={[styles.safeAreaCover, { height: insets.top }]} />
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerIconBadge}>
          <Ionicons name="sparkles" size={20} color={colors.white} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Surprise Content</Text>
          <Text style={styles.headerSubtitle}>Exclusive &amp; Hidden Gems</Text>
        </View>
      </View>

      {/* ── Category pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillScrollContent}
      >
        {PILLS.map((pill) => {
          const active = filter === pill.value;
          return (
            <TouchableOpacity
              key={pill.value}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: pill.activeColor, borderColor: pill.activeColor }
                  : styles.pillInactive,
              ]}
              onPress={() => setFilter(pill.value)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter by ${pill.label}`}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{pill.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Main scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Featured video */}
            {featured ? <FeaturedVideoCard item={featured} styles={styles} /> : null}

            {/* Content grid */}
            {gridItems.length > 0 ? (
              <View style={styles.grid}>
                {gridItems.map((item, idx) => (
                  <ContentCard key={item.id} item={item} index={idx} />
                ))}
              </View>
            ) : null}

            {/* Fun Fact */}
            <FunFactBox fact={FUN_FACT} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
