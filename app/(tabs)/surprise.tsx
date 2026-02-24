import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useSurpriseContent } from '@/features/surprise/hooks';
import { SurpriseCategory, SurpriseContent } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 16) / 2;

type FilterOption = 'all' | SurpriseCategory;

interface PillConfig {
  label: string;
  value: FilterOption;
  activeColor: string;
}

const PILLS: PillConfig[] = [
  { label: 'All', value: 'all', activeColor: colors.red600 },
  { label: 'Songs', value: 'song', activeColor: colors.purple600 },
  { label: 'Short Films', value: 'short-film', activeColor: colors.blue600 },
  { label: 'BTS', value: 'bts', activeColor: colors.green500 },
  { label: 'Interviews', value: 'interview', activeColor: colors.orange500 },
];

const CARD_GRADIENTS: string[] = [
  '#1e1b4b', // indigo-950
  '#1a0533', // deep purple
  '#0a1628', // dark navy
  '#0f2a0f', // dark green
  '#2a0a0a', // dark red
  '#1a1a0a', // dark amber
  '#0a1a2a', // dark blue
  '#1a0a1a', // dark magenta
];

function getCategoryColor(category: SurpriseCategory): string {
  switch (category) {
    case 'song':
      return colors.purple600;
    case 'short-film':
      return colors.blue600;
    case 'bts':
      return colors.green500;
    case 'interview':
      return colors.orange500;
    default:
      return colors.red600;
  }
}

function getCategoryLabel(category: SurpriseCategory): string {
  switch (category) {
    case 'song':
      return 'Song';
    case 'short-film':
      return 'Short Film';
    case 'bts':
      return 'BTS';
    case 'interview':
      return 'Interview';
    case 'trailer':
      return 'Trailer';
    default:
      return category;
  }
}

function getCategoryIconName(
  category: SurpriseCategory,
): React.ComponentProps<typeof Ionicons>['name'] {
  switch (category) {
    case 'song':
      return 'musical-notes';
    case 'short-film':
      return 'film';
    case 'bts':
      return 'videocam';
    case 'interview':
      return 'mic';
    case 'trailer':
      return 'play-circle';
    default:
      return 'play';
  }
}

function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(0)}K`;
  }
  return String(views);
}

interface FeaturedVideoProps {
  item: SurpriseContent;
}

function FeaturedVideo({ item }: FeaturedVideoProps) {
  const catColor = getCategoryColor(item.category);
  const catLabel = getCategoryLabel(item.category);
  const iconName = getCategoryIconName(item.category);

  return (
    <View style={styles.featuredContainer}>
      {/* 16:9 placeholder */}
      <View style={styles.featuredVideoBox}>
        <View style={styles.featuredPlayWrapper}>
          <View style={styles.featuredPlayBtn}>
            <Ionicons name="play" size={28} color={colors.white} style={styles.playIcon} />
          </View>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.featuredMeta}>
        <View style={styles.featuredBadgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
            <Ionicons name={iconName} size={11} color={colors.white} />
            <Text style={styles.categoryBadgeText}>{catLabel.toUpperCase()}</Text>
          </View>
          {item.duration ? <Text style={styles.featuredDuration}>{item.duration}</Text> : null}
          <Text style={styles.featuredViews}>{formatViews(item.views)} views</Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.featuredDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface ContentCardProps {
  item: SurpriseContent;
  index: number;
}

function ContentCard({ item, index }: ContentCardProps) {
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
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterOption>('all');

  const category = filter === 'all' ? undefined : filter;
  const { data: items = [], isLoading } = useSurpriseContent(category);

  const featured = items[0] ?? null;
  const gridItems = items.slice(1);

  return (
    <View style={styles.screen}>
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
            {featured ? <FeaturedVideo item={featured} /> : null}

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.black95,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.purple600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white60,
    marginTop: 1,
  },

  // ── Pills ────────────────────────────────────────────────────────────────────
  pillScroll: {
    flexGrow: 0,
    backgroundColor: colors.black95,
  },
  pillScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillInactive: {
    backgroundColor: colors.white5,
    borderColor: colors.white20,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white60,
  },
  pillTextActive: {
    color: colors.white,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    gap: 24,
  },
  loadingContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white60,
    fontSize: 15,
  },

  // ── Featured video ────────────────────────────────────────────────────────────
  featuredContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.white5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredVideoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.white5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPlayWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.red600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 3,
  },
  featuredMeta: {
    padding: 14,
    gap: 6,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  featuredDuration: {
    fontSize: 12,
    color: colors.white60,
  },
  featuredViews: {
    fontSize: 12,
    color: colors.white60,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 22,
  },
  featuredDesc: {
    fontSize: 13,
    color: colors.white60,
    lineHeight: 18,
  },

  // ── Grid ─────────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white5,
  },
  cardThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlayBtn: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220, 38, 38, 0.80)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.black80,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDurationText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 18,
  },
  cardViews: {
    fontSize: 11,
    color: colors.white40,
  },

  // ── Fun Fact ──────────────────────────────────────────────────────────────────
  funFact: {
    marginHorizontal: 16,
    backgroundColor: colors.purple600,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  funFactIcon: {
    marginTop: 1,
  },
  funFactTextBlock: {
    flex: 1,
    gap: 4,
  },
  funFactHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  funFactBody: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
});
