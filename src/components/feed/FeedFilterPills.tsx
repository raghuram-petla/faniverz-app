import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { FEED_PILLS } from '@/constants/feedHelpers';
import type { FeedFilterOption, FeedPillConfig } from '@/types';
import type { createFeedStyles } from '@/styles/tabs/feed.styles';

export interface FeedFilterPillsProps {
  filter: FeedFilterOption;
  setFilter: (f: FeedFilterOption) => void;
  styles: ReturnType<typeof createFeedStyles>;
}

/** @coupling FEED_PILLS — pill config drives available filter options and their colors */
/** @contract styles must come from createFeedStyles(theme) to match pill styling */
export function FeedFilterPills({ filter, setFilter, styles }: FeedFilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.pillScroll}
      contentContainerStyle={styles.pillScrollContent}
    >
      {FEED_PILLS.map((pill: FeedPillConfig) => {
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
  );
}
